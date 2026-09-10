import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialShow } from '../src/domain/defaults';
import { DesignSchema, ShowSchema } from '../src/domain/schema';
import {
  FIREWORK_ARCHIVE_KIND,
  LIBRARY_ARCHIVE_KIND,
  activateProject,
  archiveProject,
  exportArchive,
  exportShowArchive,
  getProject,
  hashAsset,
  importArchive,
  importFireworkArchive,
  importShowArchive,
  listPresets,
  listProjects,
  openLibrary,
  savePreset,
  saveProject,
  setArtworkAssets,
  type ArtworkAsset,
  type StoredProject,
} from '../src/storage/library';

const now = '2026-09-08T00:00:00.000Z';
const validator = { parseProject: ShowSchema.parse, parsePreset: DesignSchema.parse };

function show(name = 'Safety show') {
  return createInitialShow({ show: name, pattern: id => id, launcher: index => `Launcher ${index}` });
}

function project(id: string, document = show(id), revision = 0): StoredProject {
  return { id, name: document.name, document, createdAt: now, updatedAt: now, revision };
}

async function artwork(seed = 'a'): Promise<ArtworkAsset> {
  const colors: Record<string, string> = { a: '#102030', b: '#203040', c: '#304050', d: '#405060', e: '#506070' };
  const source = { width: 2, height: 2, palette: [colors[seed] ?? '#102030'], rows: ['0.', '..'] };
  return { id: await hashAsset(source), ...source };
}

async function clearLibrary() {
  setArtworkAssets([]);
  const db = await openLibrary();
  const tx = db.transaction(['assets', 'presets', 'projects', 'meta'], 'readwrite');
  for (const name of ['assets', 'presets', 'projects', 'meta'] as const) tx.objectStore(name).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function addAssets(assets: ArtworkAsset[]) {
  await importArchive({ kind: LIBRARY_ARCHIVE_KIND, version: 2, assets, presets: [], projects: [], archivedProjects: [] }, validator);
}

async function activeProjectId() {
  const db = await openLibrary();
  const tx = db.transaction('meta', 'readonly');
  const value = await new Promise<unknown>((resolve, reject) => {
    const request = tx.objectStore('meta').get('activeProjectId');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return (value as { value?: unknown } | undefined)?.value;
}

async function rawLibrarySnapshot() {
  const db = await openLibrary();
  const tx = db.transaction(['assets', 'presets', 'projects', 'meta'], 'readonly');
  const read = (name: 'assets' | 'presets' | 'projects' | 'meta') => new Promise<unknown[]>((resolve, reject) => {
    const request = tx.objectStore(name).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const [assets, presets, projects, meta] = await Promise.all([read('assets'), read('presets'), read('projects'), read('meta')]);
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  return JSON.stringify({ assets, presets, projects, meta });
}

async function putRawAsset(value: ArtworkAsset) {
  const db = await openLibrary();
  const tx = db.transaction('assets', 'readwrite');
  tx.objectStore('assets').put(structuredClone(value));
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}

beforeEach(clearLibrary);

describe('library safety regressions', () => {
  it('keeps existing rows and active selection on repeated, colliding add-only imports', async () => {
    const existing = await saveProject(project('show-existing'));
    await activateProject(existing.id);
    const existingPreset = { id: 'preset-existing', name: 'Original', design: show().fireworks['firework-peony'].design, createdAt: now, updatedAt: now };
    await savePreset(existingPreset);

    const incoming = project('show-existing', show('Imported'));
    const duplicate = project('show-existing', show('Imported duplicate'));
    const incomingPreset = { ...existingPreset, name: 'Imported preset' };
    const archive = { kind: LIBRARY_ARCHIVE_KIND, version: 2, assets: [], presets: [incomingPreset, incomingPreset], projects: [incoming, duplicate], archivedProjects: [] };

    await importArchive(archive, validator);
    await importArchive(archive, validator);

    expect(await activeProjectId()).toBe(existing.id);
    expect(await getProject(existing.id)).toMatchObject({ name: existing.name, revision: 1 });
    expect((await listProjects()).map(value => value.id)).toHaveLength(5);
    expect(await listPresets()).toHaveLength(5);
    expect(new Set((await listProjects()).map(value => value.id)).size).toBe(5);
  });

  it.each([
    ['an invalid final project', (asset: ArtworkAsset) => ({ kind: LIBRARY_ARCHIVE_KIND, version: 2, assets: [asset], presets: [], projects: [project('valid'), { ...project('bad'), updatedAt: 'not-a-date' }], archivedProjects: [] })],
    ['a mismatched final asset hash', async (asset: ArtworkAsset) => ({ kind: LIBRARY_ARCHIVE_KIND, version: 2, assets: [asset, { ...asset, id: 'sha256:wrong' }], presets: [], projects: [project('valid')], archivedProjects: [] })],
    ['a missing artwork reference', (asset: ArtworkAsset) => {
      const document = show('Missing art');
      document.fireworks['firework-peony'].design.layers[0] = { ...document.fireworks['firework-peony'].design.layers[0], pattern: 'artwork', artwork: { assetId: 'sha256:missing', dimension: '2d', part: 'fill' } };
      return { kind: LIBRARY_ARCHIVE_KIND, version: 2, assets: [asset], presets: [], projects: [project('missing-art', document)], archivedProjects: [] };
    }],
  ])('commits zero rows when import has %s', async (_label, makeArchive) => {
    const saved = await saveProject(project('before'));
    await activateProject(saved.id);
    const asset = await artwork('a');
    const archive = await makeArchive(asset);

    await expect(importArchive(archive, validator)).rejects.toThrow();

    expect((await listProjects()).map(value => value.id)).toEqual(['before']);
    expect(await listPresets()).toEqual([]);
    expect(await activeProjectId()).toBe('before');
  });

  it('aborts an import when a later asset collides with corrupted local content', async () => {
    const active = await saveProject(project('active-before-collision'));
    await activateProject(active.id);
    await savePreset({ id: 'preset-before-collision', name: 'Before', design: show().fireworks['firework-peony'].design, createdAt: now, updatedAt: now });
    const incomingConflict = await artwork('a');
    const corruptedLocal = { ...(await artwork('b')), id: incomingConflict.id };
    await putRawAsset(corruptedLocal);
    const earlierNewAsset = await artwork('c');
    const before = await rawLibrarySnapshot();
    const archive = { kind: LIBRARY_ARCHIVE_KIND, version: 2, assets: [earlierNewAsset, incomingConflict], presets: [], projects: [project('would-be-added')], archivedProjects: [] };

    await expect(importArchive(archive, validator)).rejects.toThrow();

    expect(await rawLibrarySnapshot()).toBe(before);
  });

  it('round-trips a show envelope and its artwork through an empty database', async () => {
    const asset = await artwork('b');
    const document = show('Palette retained');
    const layer = document.fireworks['firework-peony'].design.layers[0];
    document.fireworks['firework-peony'].design.layers[0] = { ...layer, pattern: 'artwork', artwork: { assetId: asset.id, dimension: '2d', part: 'fill' } };
    await addAssets([asset]);
    const archive = await exportShowArchive(document, ShowSchema.parse);

    await clearLibrary();
    const imported = await importShowArchive(archive, ShowSchema.parse);
    const restored = await getProject(imported.id);

    expect(restored?.document).toEqual(document);
    const backup = await exportArchive(imported.id, validator);
    expect(backup.assets).toEqual([asset]);
  });

  it('exports a scoped show without presets or unrelated assets', async () => {
    const selectedAsset = await artwork('c');
    const unrelatedAsset = await artwork('d');
    await addAssets([selectedAsset, unrelatedAsset]);
    const document = show('Scoped');
    const layer = document.fireworks['firework-peony'].design.layers[0];
    document.fireworks['firework-peony'].design.layers[0] = { ...layer, pattern: 'artwork', artwork: { assetId: selectedAsset.id, dimension: '2d', part: 'fill' } };
    const selected = await saveProject(project('selected', document));
    await saveProject(project('other'));
    await savePreset({ id: 'preset-outside', name: 'Outside', design: show().fireworks['firework-peony'].design, createdAt: now, updatedAt: now });

    const archive = await exportArchive(selected.id, validator);
    expect(archive.projects.map(value => value.id)).toEqual([selected.id]);
    expect(archive.presets).toEqual([]);
    expect(archive.assets).toEqual([selectedAsset]);
  });

  it('keeps both an archived newer database row and a stale live overlay in a full backup without writing', async () => {
    const orphan = await artwork('e');
    await addAssets([orphan]);
    const base = await saveProject(project('recoverable', show('Base')));
    const newer = await saveProject({ ...base, name: 'Newer', document: show('Newer'), updatedAt: '2026-09-08T00:00:01.000Z' });
    const archived = await archiveProject(newer.id);

    const backup = await exportArchive(undefined, validator, base);

    expect(backup.assets).toEqual([orphan]);
    expect(backup.archivedProjects).toEqual([archived]);
    expect(backup.projects).toHaveLength(1);
    expect(backup.projects[0].document).toEqual(base.document);
    expect(backup.projects[0].id).not.toBe(base.id);
    expect(await getProject(base.id)).toEqual(archived);
  });

  it('includes a validated runtime-only artwork asset in a full backup without mutating IndexedDB', async () => {
    const saved = await artwork('a');
    const orphan = await artwork('b');
    const runtimeOnly = await artwork('c');
    await addAssets([saved, orphan]);
    const persisted = await saveProject(project('runtime-overlay', show('Saved')));
    const overlayDocument = show('Live unsaved');
    const layer = overlayDocument.fireworks['firework-peony'].design.layers[0];
    overlayDocument.fireworks['firework-peony'].design.layers[0] = { ...layer, pattern: 'artwork', artwork: { assetId: runtimeOnly.id, dimension: '2d', part: 'fill' } };
    setArtworkAssets([runtimeOnly]);
    const before = await rawLibrarySnapshot();

    const backup = await exportArchive(undefined, validator, { ...persisted, name: overlayDocument.name, document: overlayDocument });

    expect(new Set(backup.assets.map(value => value.id))).toEqual(new Set([saved.id, orphan.id, runtimeOnly.id]));
    expect(backup.projects).toEqual([{ ...persisted, name: overlayDocument.name, document: overlayDocument }]);
    expect(await rawLibrarySnapshot()).toBe(before);
  });

  it('rejects unknown tagged envelopes while preserving supported legacy bare firework JSON', async () => {
    await expect(importFireworkArchive({ kind: FIREWORK_ARCHIVE_KIND, version: 2, firework: { name: 'x', design: {} }, assets: [] }, DesignSchema.parse)).rejects.toThrow();
    await expect(importFireworkArchive({ kind: 'other/1', version: 1, name: 'x', design: {} }, DesignSchema.parse)).rejects.toThrow();
    const design = show().fireworks['firework-peony'].design;
    await expect(importFireworkArchive({ name: 'Legacy', design }, DesignSchema.parse)).resolves.toMatchObject({ name: 'Legacy' });
  });

  it('rejects stale saves without overwriting the committed document', async () => {
    const first = await saveProject(project('cas', show('Original')));
    const saved = await saveProject({ ...first, name: 'Fresh', document: show('Fresh'), updatedAt: '2026-09-08T00:00:01.000Z' });

    await expect(saveProject({ ...first, name: 'Stale', document: show('Stale'), updatedAt: '2026-09-08T00:00:02.000Z' })).rejects.toThrow();
    expect(await getProject(first.id)).toEqual(saved);
  });
});

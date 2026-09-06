import { createStore } from 'zustand/vanilla';
import { FORMAT_VERSION, LIMITS, PATTERNS, TICK_RATE } from '../domain/catalog';
import type { PatternId } from '../domain/catalog';
import { createInitialShow } from '../domain/defaults';
import { createCharacterDesign, createDesign, createLayer } from '../domain/presets';
import type { CharacterDimension, CharacterId } from '../domain/characterCatalog';
import { parseShow } from '../domain/migration';
import { CueSchema, FlightSchema, LayerSchema, LauncherSchema, getDesign } from '../domain/schema';
import type { Cue, DesignOwner, FireworkDesign, Flight, LayerDefinition, LauncherDefinition, ShowDocument } from '../domain/schema';
import { t } from '../i18n';
import type { MessageKey } from '../i18n';
import { notify } from './noticeStore';

export const STORAGE_KEY = `fireworks-studio:${FORMAT_VERSION}`;
const LEGACY_KEY = 'fireworks-studio:star-studio/1';
export let recoveryMessage: MessageKey | null = null;
function initialDocument(): ShowDocument {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return parseShow(saved); }
      catch { localStorage.setItem(`${STORAGE_KEY}:recovery`, saved); recoveryMessage = 'notice.recovered'; }
    } else {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) { const migrated = parseShow(legacy); recoveryMessage = 'notice.migrated'; return migrated; }
    }
  } catch { recoveryMessage = 'notice.fileError'; }
  return createInitialShow({ show: t('project.default'), pattern: id => t(`preset.${id}`), launcher: index => t('launcher.default', { index }) });
}
interface DocumentState { document: ShowDocument; revision: number; canUndo: boolean; canRedo: boolean }
export const documentStore = createStore<DocumentState>(() => ({ document: initialDocument(), revision: 0, canUndo: false, canRedo: false }));
const past: ShowDocument[] = [];
const future: ShowDocument[] = [];
let transactionBase: ShowDocument | null = null;
function publish(document: ShowDocument) {
  documentStore.setState(state => ({ document, revision: state.revision + 1, canUndo: past.length > 0, canRedo: future.length > 0 }));
}
function remember(document: ShowDocument) { past.push(document); if (past.length > LIMITS.history) past.shift(); future.length = 0; }
function commit(document: ShowDocument) {
  const current = documentStore.getState().document;
  if (current === document) return;
  if (!transactionBase) remember(current);
  publish(document);
}
function replaceEntity<K extends 'fireworks' | 'launchers' | 'cues'>(kind: K, id: string, value: ShowDocument[K][string]) {
  const document = documentStore.getState().document;
  if (JSON.stringify(document[kind][id]) === JSON.stringify(value)) return;
  commit({ ...document, [kind]: { ...document[kind], [id]: value } });
}
function updateDesign(owner: DesignOwner, update: (design: FireworkDesign) => FireworkDesign) {
  const document = documentStore.getState().document;
  const kind = owner.kind === 'firework' ? 'fireworks' : 'cues';
  const entity = document[kind][owner.id];
  if (entity) replaceEntity(kind, owner.id, { ...entity, design: update(entity.design) });
}
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const limit = (count: number) => { notify('notice.limit', 'error', { count }); return null; };
const cleanName = (name: string) => name.trim().slice(0, LIMITS.nameLength);

export const documentActions = {
  begin() { transactionBase ??= documentStore.getState().document; },
  end() {
    if (!transactionBase) return;
    if (transactionBase !== documentStore.getState().document) remember(transactionBase);
    transactionBase = null;
    documentStore.setState({ canUndo: past.length > 0, canRedo: future.length > 0 });
  },
  rename(name: string) { const value = cleanName(name); if (value && value !== documentStore.getState().document.name) commit({ ...documentStore.getState().document, name: value }); },
  renameDesign(owner: DesignOwner, name: string) {
    const value = cleanName(name);
    if (!value) return;
    const kind = owner.kind === 'firework' ? 'fireworks' : 'cues';
    const entity = documentStore.getState().document[kind][owner.id];
    if (entity) replaceEntity(kind, owner.id, { ...entity, name: value });
  },
  updateLayer(owner: DesignOwner, layerId: string, update: (layer: LayerDefinition) => LayerDefinition) {
    updateDesign(owner, design => ({ ...design, layers: design.layers.map(layer => layer.id === layerId ? LayerSchema.parse(update(layer)) : layer) }));
  },
  setPattern(owner: DesignOwner, layerId: string, pattern: PatternId) {
    documentActions.updateLayer(owner, layerId, layer => ({ ...layer, pattern, count: Math.min(layer.count, PATTERNS[pattern].maxCount) }));
  },
  updateFlight(owner: DesignOwner, patch: Partial<Flight>) {
    updateDesign(owner, design => ({ ...design, flight: FlightSchema.parse({ ...design.flight, ...patch }) }));
  },
  addLayer(owner: DesignOwner, pattern: PatternId) {
    const design = getDesign(documentStore.getState().document, owner);
    if (!design) return null;
    if (design.layers.length >= LIMITS.layers) return limit(LIMITS.layers);
    const id = newId('layer');
    updateDesign(owner, current => ({ ...current, layers: [...current.layers, createLayer(pattern, id, t(`preset.${pattern}`))] }));
    return id;
  },
  removeLayer(owner: DesignOwner, id: string) {
    updateDesign(owner, design => design.layers.length <= 1 ? design : { ...design, layers: design.layers.filter(layer => layer.id !== id) });
  },
  addFirework(pattern: PatternId) {
    return documentActions.saveFirework(t(`preset.${pattern}`), createDesign(pattern, t(`preset.${pattern}`)));
  },
  addCharacterFirework(character: CharacterId, dimension: CharacterDimension) {
    const name = t('character.presetName', { name: t(`character.${character}`), dimension: t(`character.${dimension}`) });
    return documentActions.saveFirework(name, createCharacterDesign(character, dimension, part => t(part === 'halo' ? 'character.halo' : `character.part.${part}`)));
  },
  saveFirework(name: string, design: FireworkDesign) {
    if (Object.keys(documentStore.getState().document.fireworks).length >= LIMITS.fireworks) return limit(LIMITS.fireworks);
    const id = newId('firework');
    replaceEntity('fireworks', id, { id, name: cleanName(name), design: structuredClone(design) });
    return id;
  },
  deleteFirework(id: string) {
    const document = documentStore.getState().document;
    if (!document.fireworks[id]) return;
    const fireworks = { ...document.fireworks }; delete fireworks[id]; commit({ ...document, fireworks });
  },
  updateLauncher(id: string, patch: Partial<LauncherDefinition>) {
    const current = documentStore.getState().document.launchers[id];
    if (current) replaceEntity('launchers', id, LauncherSchema.parse({ ...current, ...patch, id }));
  },
  updateCue(id: string, patch: Partial<Pick<Cue, 'name' | 'launcherId' | 'atTick'>>) {
    const document = documentStore.getState().document;
    const current = document.cues[id];
    if (!current || (patch.launcherId && !document.launchers[patch.launcherId])) return;
    const value = { ...current, ...patch };
    // Validate scalars while retaining the design reference for engine caches.
    CueSchema.parse(value);
    replaceEntity('cues', id, value);
  },
  addCue(fireworkId: string, launcherId: string, atTick: number) {
    const firework = documentStore.getState().document.fireworks[fireworkId];
    if (!firework) return null;
    return documentActions.placeDesign(firework.name, firework.design, launcherId, atTick);
  },
  placeDesign(name: string, design: FireworkDesign, launcherId: string, atTick: number) {
    const document = documentStore.getState().document;
    if (Object.keys(document.cues).length >= LIMITS.cues) return limit(LIMITS.cues);
    if (!document.launchers[launcherId]) return null;
    const id = newId('cue');
    const cue = CueSchema.safeParse({ id, name, launcherId, atTick, design: structuredClone(design) });
    if (!cue.success) return null;
    replaceEntity('cues', id, cue.data);
    return id;
  },
  sequence(fireworkIds: string[], launcherIds: string[], start: number, interval: number, count: number) {
    const document = documentStore.getState().document;
    if (Object.keys(document.cues).length + count > LIMITS.cues) return limit(LIMITS.cues);
    if (!fireworkIds.length || !launcherIds.length || !Number.isInteger(count) || count < 1 || interval < 0 || start < 0 || !Number.isFinite(start + interval) || start + interval * (count - 1) > LIMITS.cueSeconds || fireworkIds.some(id => !document.fireworks[id]) || launcherIds.some(id => !document.launchers[id])) { notify('notice.invalidSequence', 'error'); return null; }
    const cues = { ...document.cues };
    const ids: string[] = [];
    for (let index = 0; index < count; index++) {
      const firework = document.fireworks[fireworkIds[index % fireworkIds.length]];
      const id = newId('cue'); ids.push(id);
      cues[id] = { id, name: firework.name, launcherId: launcherIds[index % launcherIds.length], atTick: Math.round((start + interval * index) * TICK_RATE), design: structuredClone(firework.design) };
    }
    commit({ ...document, cues });
    return ids;
  },
  addLauncher() {
    const existing = Object.values(documentStore.getState().document.launchers);
    if (existing.length >= LIMITS.launchers) return limit(LIMITS.launchers);
    const positions = Array.from({ length: LIMITS.launchers }, (_, index) => -1 + 2 * index / (LIMITS.launchers - 1));
    const distance = (x: number) => Math.min(...existing.map(launcher => Math.abs(launcher.x - x)));
    const x = positions.reduce((best, next) => distance(next) > distance(best) ? next : best);
    const id = newId('launcher');
    replaceEntity('launchers', id, { id, name: t('launcher.default', { index: existing.length + 1 }), x, z: 0 });
    return id;
  },
  deleteLauncher(id: string) {
    const document = documentStore.getState().document;
    if (Object.keys(document.launchers).length <= 1 || Object.values(document.cues).some(cue => cue.launcherId === id)) return;
    const launchers = { ...document.launchers }; delete launchers[id]; commit({ ...document, launchers });
  },
  deleteCue(id: string) { const document = documentStore.getState().document; if (!document.cues[id]) return; const cues = { ...document.cues }; delete cues[id]; commit({ ...document, cues }); },
  replace(document: ShowDocument) { documentActions.end(); commit(document); },
  undo() { documentActions.end(); const previous = past.pop(); if (!previous) return; future.push(documentStore.getState().document); publish(previous); },
  redo() { documentActions.end(); const next = future.pop(); if (!next) return; past.push(documentStore.getState().document); publish(next); },
};

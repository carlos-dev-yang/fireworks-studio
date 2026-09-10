import { describe, expect, it } from 'vitest';
import {
  ArchiveSizeError,
  MAX_LIBRARY_ARCHIVE_BYTES,
  MAX_PORTABLE_ARCHIVE_BYTES,
  downloadJson,
  importFireworkJson,
  importShowJson,
} from '../src/app/archiveService';
import { LIBRARY_ARCHIVE_KIND, SHOW_ARCHIVE_KIND } from '../src/storage/library';

function file(size: number, payload: unknown): File {
  return { size, text: async () => JSON.stringify(payload) } as File;
}

describe('archive size compatibility', () => {
  it('allows a library backup above the portable limit when it remains within the library limit', async () => {
    const backup = { kind: LIBRARY_ARCHIVE_KIND, version: 2, assets: [], presets: [], projects: [], archivedProjects: [] };

    await expect(importShowJson(file(MAX_PORTABLE_ARCHIVE_BYTES + 1, backup))).resolves.toEqual({ projects: [], presets: 0 });
  });

  it('still applies the portable limit to tagged show files and the library limit to backups', async () => {
    const show = { kind: SHOW_ARCHIVE_KIND, version: 1, show: {}, assets: [] };
    const backup = { kind: LIBRARY_ARCHIVE_KIND, version: 2, assets: [], presets: [], projects: [] };

    await expect(importShowJson(file(MAX_PORTABLE_ARCHIVE_BYTES + 1, show))).rejects.toMatchObject<Partial<ArchiveSizeError>>({ scope: 'portable' });
    await expect(importShowJson(file(MAX_LIBRARY_ARCHIVE_BYTES + 1, backup))).rejects.toMatchObject<Partial<ArchiveSizeError>>({ scope: 'library' });
  });

  it('keeps the library budget larger than the portable budget', () => {
    expect(MAX_LIBRARY_ARCHIVE_BYTES).toBe(64 * 1024 * 1024);
    expect(MAX_PORTABLE_ARCHIVE_BYTES).toBe(5 * 1024 * 1024);
    expect(MAX_LIBRARY_ARCHIVE_BYTES).toBeGreaterThan(MAX_PORTABLE_ARCHIVE_BYTES);
  });

  it('rejects an oversized firework before reading it, using the portable limit even above 64 MiB', async () => {
    let read = false;
    const oversized = {
      size: MAX_LIBRARY_ARCHIVE_BYTES + 1,
      text: async () => { read = true; return '{}'; },
    } as File;

    await expect(importFireworkJson(oversized)).rejects.toMatchObject<Partial<ArchiveSizeError>>({ scope: 'portable' });
    expect(read).toBe(false);
  });

  it('rejects an oversized serialized full backup before creating a download', () => {
    const originalBlob = globalThis.Blob;
    class OversizedBlob { size = MAX_LIBRARY_ARCHIVE_BYTES + 1; }
    Object.defineProperty(globalThis, 'Blob', { configurable: true, value: OversizedBlob });
    try {
      let error: unknown;
      try { downloadJson({ kind: LIBRARY_ARCHIVE_KIND }, 'backup.json', MAX_LIBRARY_ARCHIVE_BYTES); }
      catch (caught) { error = caught; }
      expect(error).toMatchObject({ scope: 'library' });
    } finally {
      Object.defineProperty(globalThis, 'Blob', { configurable: true, value: originalBlob });
    }
  });
});

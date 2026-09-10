import { ZodError } from 'zod';
import { DocumentError, parseShow } from '../domain/migration';
import { DesignSchema, ShowSchema } from '../domain/schema';
import type { FireworkDefinition, ShowDocument } from '../domain/schema';
import { LibraryError } from '../storage/errors';
import { FIREWORK_ARCHIVE_KIND, LIBRARY_ARCHIVE_KIND, SHOW_ARCHIVE_KIND, exportArchive, exportFireworkArchive, exportShowArchive, importArchive, importFireworkArchive, importShowArchive } from '../storage/library';
import type { StoredProject as StoredProjectRecord } from '../storage/library';
import type { MessageKey, Params } from '../i18n';

export const MAX_PORTABLE_ARCHIVE_BYTES = 5 * 1024 * 1024;
export const MAX_LIBRARY_ARCHIVE_BYTES = 64 * 1024 * 1024;
export type ArchiveImport = { projects: StoredProjectRecord[]; presets: number };
export class ArchiveSizeError extends Error { constructor(readonly scope: 'portable' | 'library') { super(scope); } }

function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function safeName(value: string) { return value.trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) || 'fireworks'; }

export function archiveFilename(name: string, type: 'firework' | 'show' | 'library') {
  return `${safeName(name)}-${stamp()}.${type === 'library' ? 'library' : type}.json`;
}

export function downloadJson(value: unknown, name: string, maximumBytes: number) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  if (blob.size > maximumBytes) throw new ArchiveSizeError(maximumBytes === MAX_LIBRARY_ARCHIVE_BYTES ? 'library' : 'portable');
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readJson(file: File): Promise<unknown> {
  if (file.size > MAX_LIBRARY_ARCHIVE_BYTES) throw new ArchiveSizeError('library');
  try { return JSON.parse(await file.text()); }
  catch { throw new DocumentError('invalidJson'); }
}

/** Imports only by adding records; this function never selects or replaces the live project. */
export async function importShowJson(file: File): Promise<ArchiveImport> {
  const raw = await readJson(file);
  if (object(raw) && 'kind' in raw) {
    if (raw.kind === LIBRARY_ARCHIVE_KIND) {
      if (file.size > MAX_LIBRARY_ARCHIVE_BYTES) throw new ArchiveSizeError('library');
      const result = await importArchive(raw, { parseProject: ShowSchema.parse, parsePreset: DesignSchema.parse });
      return { projects: result.projects, presets: result.presets.length };
    }
    if (raw.kind === SHOW_ARCHIVE_KIND) {
      if (file.size > MAX_PORTABLE_ARCHIVE_BYTES) throw new ArchiveSizeError('portable');
      const project = await importShowArchive(raw, ShowSchema.parse);
      return { projects: [project], presets: 0 };
    }
    throw new LibraryError('unsupportedFormat');
  }
  if (file.size > MAX_PORTABLE_ARCHIVE_BYTES) throw new ArchiveSizeError('portable');
  // Legacy raw documents are normalized before storage validates the portable envelope.
  const document = parseShow(JSON.stringify(raw));
  const project = await importShowArchive({ kind: SHOW_ARCHIVE_KIND, version: 1, show: document, assets: [] }, ShowSchema.parse);
  return { projects: [project], presets: 0 };
}

export async function importFireworkJson(file: File) {
  if (file.size > MAX_PORTABLE_ARCHIVE_BYTES) throw new ArchiveSizeError('portable');
  const raw = await readJson(file);
  if (object(raw) && 'kind' in raw && raw.kind !== FIREWORK_ARCHIVE_KIND) throw new LibraryError('unsupportedFormat');
  return importFireworkArchive(raw, DesignSchema.parse);
}

export async function exportCurrentFirework(firework: FireworkDefinition) {
  return exportFireworkArchive(firework, DesignSchema.parse);
}

export async function exportCurrentShow(document: ShowDocument) {
  return exportShowArchive(document, ShowSchema.parse);
}

export async function exportLibraryBackup(current: StoredProjectRecord) {
  return exportArchive(undefined, { parseProject: ShowSchema.parse, parsePreset: DesignSchema.parse }, current);
}

export function archiveError(error: unknown): { key: MessageKey; params?: Params } {
  if (error instanceof ArchiveSizeError) return { key: error.scope === 'library' ? 'notice.libraryTooLarge' : 'notice.portableTooLarge' };
  if (error instanceof DocumentError) return { key: `notice.${error.code}` as MessageKey };
  if (error instanceof LibraryError) {
    if (error.message === 'largeFile') return { key: 'notice.largeFile' };
    const key: Record<LibraryError['code'], MessageKey> = {
      missingArtwork: 'notice.missingArtwork', unsupportedFormat: 'notice.unsupportedFormat', conflict: 'notice.saveConflict', invalidArchive: 'notice.invalidArchive', missingProject: 'notice.fileError',
    };
    return { key: key[error.code] };
  }
  if (error instanceof ZodError) return { key: 'notice.invalidField', params: { field: error.issues[0]?.path.join('.') || 'document' } };
  return { key: 'notice.fileError' };
}

import type { ShowDocument } from '../domain/schema';
import type { StoredProject } from '../storage/library';

const JOURNAL_KEY_PREFIX = 'fireworks-studio:recovery/1:';
const TAB_KEY = 'fireworks-studio:recovery-tab/1';
const ACTIVE_KEY = 'fireworks-studio:recovery-active/1';

export interface RecoveryJournal {
  version: 1;
  project: StoredProject;
  /** The IndexedDB revision on which this complete document was based. */
  baseRevision: number;
  revision: number;
  token: string;
  writerId: string;
  capturedAt: string;
}

export interface RecoveryRestoreOperations {
  parseDocument(value: unknown): ShowDocument;
  getProject(id: string): Promise<StoredProject | null>;
  saveProject(project: StoredProject): Promise<StoredProject>;
  createRecoveryCopy(document: ShowDocument): StoredProject;
}

export interface RecoveryRestoreResult { project: StoredProject; conflictCopy: boolean }

function storage(kind: 'localStorage' | 'sessionStorage'): Storage | undefined {
  try { return globalThis[kind]; } catch { return undefined; }
}

function tabId(): string | undefined {
  const session = storage('sessionStorage');
  if (!session) return undefined;
  try {
    const existing = session.getItem(TAB_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    session.setItem(TAB_KEY, id);
    return id;
  } catch { return undefined; }
}

function prefix(): string | undefined {
  const id = tabId();
  return id ? `${JOURNAL_KEY_PREFIX}${id}:` : undefined;
}

function journalKeyFor(token: string): string | undefined {
  const journalPrefix = prefix();
  return journalPrefix ? `${journalPrefix}${token}` : undefined;
}

function activeKey(): string | undefined {
  const session = storage('sessionStorage');
  if (!session) return undefined;
  try { return session.getItem(ACTIVE_KEY) ?? undefined; } catch { return undefined; }
}

function setActiveKey(value: string): boolean {
  const session = storage('sessionStorage');
  try { session?.setItem(ACTIVE_KEY, value); return !!session; } catch { return false; }
}

function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }

/** A best-effort, synchronous journal for this tab only. It is intentionally never shared as the active document. */
export function writeRecoveryJournal(project: StoredProject, document: ShowDocument, revision: number, token: string = crypto.randomUUID(), writerId: string = crypto.randomUUID()): string | null {
  const journalKey = journalKeyFor(token); const local = storage('localStorage');
  if (!journalKey || !local) return null;
  const journal: RecoveryJournal = {
    version: 1,
    project: { ...project, document: structuredClone(document) },
    baseRevision: project.revision ?? 0,
    revision,
    token,
    writerId,
    capturedAt: new Date().toISOString(),
  };
  try {
    // Each capture has its own key, so a duplicated tab cannot replace another tab's journal.
    const existing = local.getItem(journalKey);
    if (existing) {
      const parsed = JSON.parse(existing) as unknown;
      if (isRecord(parsed) && typeof parsed.token === 'string' && parsed.token !== token) return null;
    }
    local.setItem(journalKey, JSON.stringify(journal));
    if (!setActiveKey(journalKey)) return null;
    return token;
  } catch { return null; }
}

/** Rebase a newer local snapshot after this tab has durably saved its predecessor. */
export function rebaseRecoveryJournal(project: StoredProject, revision: number, token: string, writerId: string): boolean {
  try {
    const journal = readRecoveryJournal();
    if (!journal || journal.token !== token || journal.revision !== revision || journal.project.id !== project.id) return false;
    return !!writeRecoveryJournal(project, journal.project.document as ShowDocument, revision, token, writerId);
  } catch { return false; }
}

/** Never remove a newer snapshot when an earlier async write finishes. */
export function clearRecoveryJournal(projectId: string, token: string, writerId?: string): boolean {
  const journalKey = journalKeyFor(token); const local = storage('localStorage');
  if (!journalKey || !local) return false;
  let journal: RecoveryJournal | null = null;
  try {
    const raw = local.getItem(journalKey);
    if (raw) journal = JSON.parse(raw) as RecoveryJournal;
  } catch { return false; }
  if (!journal || journal.project.id !== projectId || journal.token !== token) return false;
  try {
    local.removeItem(journalKey);
    if (activeKey() === journalKey) storage('sessionStorage')?.removeItem(ACTIVE_KEY);
    // Newer documents contain these earlier snapshots. Removing them only after
    // a committed write avoids losing a duplicate tab's last durable fallback.
    if (writerId) {
      const journalPrefix = prefix();
      if (journalPrefix) for (let index = local.length - 1; index >= 0; index--) {
        const candidate = local.key(index);
        if (!candidate?.startsWith(journalPrefix)) continue;
        try {
          const raw = local.getItem(candidate);
          const value = raw ? JSON.parse(raw) as unknown : null;
          if (isRecord(value) && value.writerId === writerId && isRecord(value.project) && value.project.id === projectId && typeof value.revision === 'number' && value.revision <= journal.revision) local.removeItem(candidate);
        } catch { /* Keep an unreadable record for explicit recovery handling. */ }
      }
    }
    return true;
  } catch { return false; }
}

/** Returns only structurally plausible data; the caller must validate its document against the domain schema. */
export function readRecoveryJournal(): RecoveryJournal | null {
  const journalKey = activeKey(); const local = storage('localStorage');
  if (!journalKey || !local) return null;
  let value: unknown;
  try {
    const raw = local.getItem(journalKey);
    if (!raw) return null;
    value = JSON.parse(raw);
  } catch { throw new Error('The local recovery journal could not be read.'); }
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.project) || typeof value.project.id !== 'string' || typeof value.project.name !== 'string' || typeof value.revision !== 'number' || !Number.isInteger(value.revision) || value.revision < 0 || typeof value.baseRevision !== 'number' || !Number.isInteger(value.baseRevision) || value.baseRevision < 0 || typeof value.token !== 'string' || !value.token || typeof value.writerId !== 'string' || !value.writerId || typeof value.capturedAt !== 'string') throw new Error('The local recovery journal is invalid.');
  return value as unknown as RecoveryJournal;
}

/**
 * Performs only compare-and-swap recovery work. It intentionally does not
 * clear the journal or select a project, so callers can keep failed recovery
 * explicit and tests can verify conflict behavior without browser storage.
 */
export async function restorePendingWork(journal: RecoveryJournal, operations: RecoveryRestoreOperations): Promise<RecoveryRestoreResult> {
  const document = operations.parseDocument(journal.project.document);
  const stored = await operations.getProject(journal.project.id);
  if (stored && !stored.archivedAt && (stored.revision ?? 0) === journal.baseRevision) {
    try {
      return { project: await operations.saveProject({ ...stored, name: document.name, document, updatedAt: new Date().toISOString() }), conflictCopy: false };
    } catch {
      // The CAS may lose a race after getProject; retain both versions.
      return { project: await operations.saveProject(operations.createRecoveryCopy(document)), conflictCopy: true };
    }
  }
  return { project: await operations.saveProject(operations.createRecoveryCopy(document)), conflictCopy: true };
}

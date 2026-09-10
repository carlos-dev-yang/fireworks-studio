import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialShow } from '../src/domain/defaults';
import { flushPersistence, getCurrentProjectSnapshot, persistenceStore, startPersistence } from '../src/app/persistence';
import { clearRecoveryJournal, readRecoveryJournal, restorePendingWork, writeRecoveryJournal } from '../src/app/recovery';
import { documentActions, documentStore } from '../src/state/documentStore';
import type { ShowDocument } from '../src/domain/schema';
import type { StoredProject } from '../src/storage/library';

const now = '2026-09-08T00:00:00.000Z';
function show(name = 'Recovery show') {
  return createInitialShow({ show: name, pattern: id => id, launcher: index => `Launcher ${index}` });
}
function project(document = show()): StoredProject {
  return { id: 'recovery-project', name: document.name, document, createdAt: now, updatedAt: now, revision: 1 };
}

function journal(document = show('Journal edit')) {
  return { version: 1 as const, project: project(document), baseRevision: 1, revision: 4, token: 'journal-token', writerId: 'writer-token', capturedAt: now };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  documentActions.load(show());
});

describe('recovery journal safety regressions', () => {
  it('writes a complete journal synchronously and clears only its exact saved revision', () => {
    const value = project();
    const token = writeRecoveryJournal(value, value.document, 8, 'first-write');
    expect(token).toBe('first-write');
    expect(readRecoveryJournal()).toMatchObject({ project: { id: value.id }, baseRevision: 1, revision: 8 });
    expect(clearRecoveryJournal(value.id, 'other-write')).toBe(false);
    expect(readRecoveryJournal()).not.toBeNull();
    expect(clearRecoveryJournal(value.id, token!)).toBe(true);
    expect(readRecoveryJournal()).toBeNull();
  });

  it('retains an edit queued while an older asynchronous save is completing', async () => {
    const initial = project(documentStore.getState().document);
    let resolveFirst: ((value: StoredProject) => void) | undefined;
    const written: StoredProject[] = [];
    const stop = startPersistence(initial, async value => {
      written.push(value);
      if (written.length === 1) return new Promise(resolve => { resolveFirst = resolve; });
      return { ...value, revision: (value.revision ?? 0) + 1 };
    });
    try {
      documentActions.rename('First edit');
      expect(readRecoveryJournal()?.project.document.name).toBe('First edit');
      const flushing = flushPersistence();
      await new Promise(resolve => setTimeout(resolve, 0));
      documentActions.rename('Second edit');
      resolveFirst?.({ ...written[0], revision: 2 });
      await flushing;

      expect(written.map(value => value.document.name)).toEqual(['First edit', 'Second edit']);
      expect(readRecoveryJournal()).toBeNull();
    } finally {
      stop();
    }
  });

  it('preserves a synchronous recovery copy and exportable live snapshot when the writer fails', async () => {
    const initial = project(documentStore.getState().document);
    const stop = startPersistence(initial, async () => { throw new Error('quota exceeded'); });
    try {
      documentActions.rename('Exportable after failure');
      await flushPersistence();

      expect(persistenceStore.getState().state).toBe('error');
      expect(readRecoveryJournal()?.project.document.name).toBe('Exportable after failure');
      expect(getCurrentProjectSnapshot().document.name).toBe('Exportable after failure');
    } finally {
      stop();
    }
  });

  it('replays only a journal whose base revision still matches the stored project', async () => {
    const pending = journal();
    const stored = { ...project(show('Stored')), revision: 1 };
    const saved: StoredProject[] = [];
    const result = await restorePendingWork(pending, {
      parseDocument: value => value as ShowDocument,
      getProject: async () => stored,
      saveProject: async value => { saved.push(value); return { ...value, revision: 2 }; },
      createRecoveryCopy: () => { throw new Error('copy should not be needed'); },
    });

    expect(result).toMatchObject({ conflictCopy: false, project: { id: stored.id, revision: 2, document: pending.project.document } });
    expect(saved).toHaveLength(1);
  });

  it('creates a separate recovery copy when IndexedDB has advanced', async () => {
    const pending = journal();
    const advanced = { ...project(show('Other tab')), revision: 2 };
    const copy = { ...project(pending.project.document), id: 'recovery-copy', revision: 0 };
    const saved: StoredProject[] = [];
    const result = await restorePendingWork(pending, {
      parseDocument: value => value as ShowDocument,
      getProject: async () => advanced,
      saveProject: async value => { saved.push(value); return { ...value, revision: 1 }; },
      createRecoveryCopy: () => copy,
    });

    expect(result).toMatchObject({ conflictCopy: true, project: { id: 'recovery-copy', revision: 1 } });
    expect(saved).toEqual([copy]);
  });

  it('leaves a malformed journal in local storage for explicit recovery handling', () => {
    const value = project();
    writeRecoveryJournal(value, value.document, 5, 'malformed-token', 'malformed-writer');
    const key = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).find(candidate => candidate?.includes('malformed-token'));
    expect(key).toBeTruthy();
    localStorage.setItem(key!, '{not-json');

    expect(() => readRecoveryJournal()).toThrow();
    expect(localStorage.getItem(key!)).toBe('{not-json');
  });
});

import { createStore } from 'zustand/vanilla';
import { documentStore } from '../state/documentStore';
import type { ShowDocument } from '../domain/schema';
import { saveProject } from '../storage/library';
import type { StoredProject } from '../storage/library';
import { notify } from '../state/noticeStore';
import { clearRecoveryJournal, rebaseRecoveryJournal, writeRecoveryJournal } from './recovery';

const SAVE_DELAY_MS = 500;
export type PersistenceState = 'saved' | 'dirty' | 'saving' | 'error';
export const persistenceStore = createStore<{ state: PersistenceState; error: Error | null }>(() => ({ state: 'saved', error: null }));
type Snapshot = { project: StoredProject; revision: number; token: string; journaled: boolean; document: ShowDocument };
let activeFlush: (() => Promise<void>) | undefined;
let activeProjectSetter: ((project: StoredProject) => void) | undefined;
let activeProjectSnapshot: (() => StoredProject) | undefined;
/** Lets export/import UI await the captured live revision before reading IndexedDB. */
export async function flushPersistence() { await activeFlush?.(); }
/** Call after flushing the old project and before replacing the document store. */
export function setPersistenceProject(project: StoredProject) { activeProjectSetter?.(project); }
/** A complete live snapshot for an emergency export when IndexedDB is unavailable. */
export function getCurrentProjectSnapshot(): StoredProject {
  if (!activeProjectSnapshot) throw new Error('Project persistence is not initialized.');
  return activeProjectSnapshot();
}

/** Serializes captured revisions in order and retains a failed snapshot for retry. */
export function startPersistence(initialProject: StoredProject, writer: (project: StoredProject) => Promise<StoredProject> = saveProject, initialError?: Error) {
  let project = initialProject;
  const writerId = crypto.randomUUID();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Bootstrap can fail before the first project record exists. Keep that complete
  // document snapshot so the visible Retry action has meaningful work to perform.
  let pending: Snapshot | undefined = initialError ? (() => {
    const state = documentStore.getState();
    return { project: structuredClone(project), revision: state.revision, token: crypto.randomUUID(), journaled: false, document: structuredClone(state.document) };
  })() : undefined;
  let writing = false;
  let writePromise: Promise<void> | undefined;
  let stopped = false;
  const capture = (): Snapshot => {
    const state = documentStore.getState();
    return { project: structuredClone(project), revision: state.revision, token: crypto.randomUUID(), journaled: false, document: structuredClone(state.document) };
  };
  const journal = (snapshot: Snapshot) => {
    snapshot.journaled = !!writeRecoveryJournal(snapshot.project, snapshot.document, snapshot.revision, snapshot.token, writerId);
    if (snapshot.journaled) return true;
    const error = new Error('Unable to write the local recovery journal.');
    persistenceStore.setState({ state: 'error', error });
    notify('notice.saveError', 'error');
    return false;
  };
  if (pending) journal(pending);
  const write = (): Promise<void> => {
    if (writing) return writePromise ?? Promise.resolve();
    if (!pending) return Promise.resolve();
    const snapshot = pending;
    writing = true;
    writePromise = (async () => {
      persistenceStore.setState({ state: 'saving', error: null });
      try {
        project = await writer({ ...snapshot.project, name: snapshot.document.name, document: snapshot.document, updatedAt: new Date().toISOString() });
        if (pending === snapshot) {
          pending = undefined;
          clearRecoveryJournal(snapshot.project.id, snapshot.token, writerId);
        } else if (pending && pending.project.id === project.id) {
          // The newer complete document includes this saved snapshot, so its next
          // compare-and-swap must use the revision we just committed.
          pending = { ...pending, project: { ...project, name: pending.document.name } };
          rebaseRecoveryJournal(pending.project, pending.revision, pending.token, writerId);
        }
        persistenceStore.setState({ state: pending ? 'dirty' : 'saved', error: null });
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error('Unable to save this project locally.');
        // Preserve the snapshot for manual flush (export) or a later edit; do not claim it is saved.
        persistenceStore.setState({ state: 'error', error });
        notify('notice.saveError', 'error');
      } finally {
        writing = false;
        writePromise = undefined;
        if (pending && pending !== snapshot && !stopped) schedule();
      }
    })();
    return writePromise;
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = undefined; void write(); }, SAVE_DELAY_MS);
  };
  const unsubscribe = documentStore.subscribe((state, previous) => {
    if (state.document === previous.document) return;
    pending = capture();
    const journaled = journal(pending);
    persistenceStore.setState({ state: journaled ? 'dirty' : 'error', error: journaled ? null : persistenceStore.getState().error });
    if (journaled) schedule(); else void write();
  });
  const flush = async () => {
    clearTimeout(timer); timer = undefined;
    // A write may finish while a newer captured revision is pending. Drain that
    // queue before an export reads IndexedDB; a failed write remains visibly error.
    let attempted: Snapshot | undefined;
    do { attempted = pending; await write(); } while (pending && pending !== attempted && persistenceStore.getState().state !== 'error');
  };
  const setCurrentProject = (next: StoredProject) => { project = next; pending = undefined; persistenceStore.setState({ state: 'saved', error: null }); };
  activeFlush = flush;
  activeProjectSetter = setCurrentProject;
  const currentSnapshot = () => {
    const document = structuredClone(documentStore.getState().document);
    return { ...structuredClone(project), name: document.name, document };
  };
  activeProjectSnapshot = currentSnapshot;
  if (initialError) persistenceStore.setState({ state: 'error', error: initialError });
  window.addEventListener('pagehide', flush);
  const preventUnsafeUnload = (event: BeforeUnloadEvent) => {
    if (!pending || pending.journaled) return;
    event.preventDefault();
    event.returnValue = '';
  };
  window.addEventListener('beforeunload', preventUnsafeUnload);
  if (pending && !pending.journaled) void write();
  return () => {
    stopped = true;
    clearTimeout(timer);
    // React StrictMode tears down the first effect immediately. Do not let that
    // retired controller retry a failed bootstrap snapshot over the active one.
    if (persistenceStore.getState().state !== 'error') void flush();
    if (activeFlush === flush) activeFlush = undefined;
    if (activeProjectSetter === setCurrentProject) activeProjectSetter = undefined;
    if (activeProjectSnapshot === currentSnapshot) activeProjectSnapshot = undefined;
    unsubscribe();
    window.removeEventListener('pagehide', flush);
    window.removeEventListener('beforeunload', preventUnsafeUnload);
  };
}

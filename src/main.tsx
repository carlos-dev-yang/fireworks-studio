import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { parseShow } from './domain/migration';
import { documentStore } from './state/documentStore';
import { editorActions } from './state/editorStore';
import { notify } from './state/noticeStore';
import { activateProject, artworkIdsIn, getArtworkAsset, getProject, loadBootstrap, saveProject, setArtworkAssets } from './storage/library';
import type { StoredProject } from './storage/library';
import { clearRecoveryJournal, readRecoveryJournal, restorePendingWork } from './app/recovery';
import './styles/tokens.css';
import './styles/studio.css';
import './styles/preset-preview.css';
import './features/audio/audio.css';

function recoveryCopy(document: ReturnType<typeof parseShow>): StoredProject {
  const now = new Date().toISOString();
  return { id: `project-${crypto.randomUUID()}`, name: document.name, document, createdAt: now, updatedAt: now };
}

/** Replays only the revision that the journal observed; concurrent changes become a separate recovered project. */
async function recoverJournal(): Promise<StoredProject | null> {
  const journal = readRecoveryJournal();
  if (!journal) return null;
  const { project: recovered } = await restorePendingWork(journal, {
    parseDocument: value => parseShow(JSON.stringify(value)), getProject, saveProject, createRecoveryCopy: recoveryCopy,
  });
  clearRecoveryJournal(journal.project.id, journal.token);
  await activateProject(recovered.id);
  return recovered;
}

async function bootstrap() {
  const fallback = documentStore.getState().document;
  const now = new Date().toISOString();
  let project: StoredProject = { id: `project-${crypto.randomUUID()}`, name: fallback.name, document: fallback, createdAt: now, updatedAt: now };
  let initialPersistenceError: Error | undefined;
  try {
    const library = await loadBootstrap();
    setArtworkAssets(library.assets);
    if (library.project) {
      // Storage accepts plain archived data; validate it at this application boundary.
      const document = parseShow(JSON.stringify(library.project.document));
      project = { ...library.project, document };
      documentStore.setState({ document, revision: 0, canUndo: false, canRedo: false });
      const missing = artworkIdsIn(document).filter(id => !getArtworkAsset(id));
      if (missing.length) notify('notice.missingArtwork', 'error');
    } else {
      // Migration is complete only after this write succeeds; existing localStorage is never removed.
      project = await saveProject(project);
    }
    await activateProject(project.id);
    try {
      const recovered = await recoverJournal();
      if (recovered) {
        const document = parseShow(JSON.stringify(recovered.document));
        project = { ...recovered, document };
        documentStore.setState({ document, revision: 0, canUndo: false, canRedo: false });
      }
    } catch (error) {
      // Retain the journal for export/retry; the validated IndexedDB project remains open.
      console.error('Unable to recover the unsaved local Fireworks Studio revision.', error);
      initialPersistenceError = error instanceof Error ? error : new Error('Unable to recover the unsaved local revision.');
    }
  } catch (error) {
    // A local-storage backup still exists; rendering continues in memory and a later edit retries IndexedDB.
    console.error('Unable to bootstrap the local Fireworks Studio library.', error);
    initialPersistenceError = error instanceof Error ? error : new Error('Unable to initialize local project storage.');
  }
  editorActions.repair();
  createRoot(document.getElementById('root')!).render(<StrictMode><App project={project} initialPersistenceError={initialPersistenceError} /></StrictMode>);
}
void bootstrap();

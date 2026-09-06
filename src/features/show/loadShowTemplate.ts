import type { ShowDocument } from '../../domain/schema';
import { playback } from '../../app/services';
import { documentActions } from '../../state/documentStore';
import { editorActions, editorStore } from '../../state/editorStore';

export function loadShowTemplate(document: ShowDocument) {
  playback.pause();
  documentActions.replace(document);
  editorActions.setPage('show');
  editorStore.setState({ selection: null });
  playback.seek(0);
}

import { createStore } from 'zustand/vanilla';
import type { DesignOwner, FireworkDesign } from '../domain/schema';
import { getDesign } from '../domain/schema';
import { documentStore } from './documentStore';
export type Selection = DesignOwner | { kind: 'launcher'; id: string };
export type PreviewMode = 'firework' | 'layer' | 'star';
export interface ClipboardItem { kind: 'firework' | 'cue'; name: string; design: FireworkDesign }
export interface TransientPreview { name: string; design: FireworkDesign }
interface EditorState {
  page: 'designer' | 'show'; selection: Selection | null; editing: DesignOwner | null;
  layerId: string | null; previewMode: PreviewMode; inspectorTab: 'pattern' | 'star' | 'flight';
  mobilePanel: 'library' | 'inspector'; activeFireworkId: string | null; clipboard: ClipboardItem | null;
  theater: boolean; transientPreview: TransientPreview | null;
}
const firstId = Object.keys(documentStore.getState().document.fireworks)[0] ?? null;
const firstOwner: DesignOwner | null = firstId ? { kind: 'firework', id: firstId } : null;
export const editorStore = createStore<EditorState>(() => ({
  page: 'designer', selection: firstOwner, editing: firstOwner,
  layerId: firstOwner ? getDesign(documentStore.getState().document, firstOwner)?.layers[0]?.id ?? null : null,
  previewMode: 'firework', inspectorTab: 'pattern', mobilePanel: 'inspector', activeFireworkId: firstId, clipboard: null, theater: false, transientPreview: null,
}));
export const editorActions = {
  preview(name: string, design: FireworkDesign) {
    const copy = structuredClone(design);
    editorStore.setState({ transientPreview: { name, design: copy }, page: 'designer', mobilePanel: 'inspector', theater: false, previewMode: 'firework', layerId: copy.layers[0]?.id ?? null });
  },
  clearPreview() {
    if (editorStore.getState().transientPreview) editorStore.setState({ transientPreview: null });
  },
  openDesign(owner: DesignOwner) {
    const design = getDesign(documentStore.getState().document, owner);
    if (!design) return;
    const patch: Partial<EditorState> = { editing: owner, selection: owner, layerId: design.layers[0].id, page: 'designer', mobilePanel: 'inspector', theater: false, transientPreview: null };
    if (owner.kind === 'firework') patch.activeFireworkId = owner.id;
    editorStore.setState(patch);
  },
  select(selection: Selection) {
    if (selection.kind === 'firework') {
      if (editorStore.getState().page === 'designer') editorActions.openDesign(selection);
      else editorStore.setState({ activeFireworkId: selection.id, transientPreview: null });
    } else editorStore.setState({ selection, page: 'show', mobilePanel: 'inspector' });
  },
  setPage(page: EditorState['page']) {
    const state = editorStore.getState();
    editorStore.setState({ page, selection: page === 'designer' ? state.editing : state.selection, theater: false, transientPreview: null });
  },
  repair() {
    const state = editorStore.getState();
    const document = documentStore.getState().document;
    const patch: Partial<EditorState> = {};
    const fallback = Object.keys(document.fireworks)[0] ?? null;
    if (state.activeFireworkId && !document.fireworks[state.activeFireworkId]) patch.activeFireworkId = fallback;
    const owner = state.editing && getDesign(document, state.editing) ? state.editing : fallback ? { kind: 'firework' as const, id: fallback } : null;
    if (owner !== state.editing) patch.editing = owner;
    const design = owner ? getDesign(document, owner) : undefined;
    if (!design?.layers.some(layer => layer.id === state.layerId)) patch.layerId = design?.layers[0]?.id ?? null;
    const selection = state.selection;
    if (selection && !(selection.kind === 'launcher' ? document.launchers[selection.id] : getDesign(document, selection))) patch.selection = state.page === 'designer' ? owner : null;
    if (Object.keys(patch).length) editorStore.setState(patch);
  },
};

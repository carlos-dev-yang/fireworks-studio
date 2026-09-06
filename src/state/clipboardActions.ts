import { TICK_RATE, LIMITS } from '../domain/catalog';
import { getDesign, getOwnerName } from '../domain/schema';
import type { DesignOwner } from '../domain/schema';
import { playback } from '../app/services';
import { t } from '../i18n';
import { documentActions, documentStore } from './documentStore';
import { editorActions, editorStore } from './editorStore';
import { notify } from './noticeStore';
export function selectedOwner(): DesignOwner | null {
  const state = editorStore.getState();
  if (state.page === 'designer') return state.editing;
  if (state.selection?.kind === 'cue') return state.selection;
  return state.activeFireworkId ? { kind: 'firework', id: state.activeFireworkId } : null;
}
export function copyItem(owner = selectedOwner()) {
  if (!owner) return;
  const document = documentStore.getState().document, design = getDesign(document, owner), name = getOwnerName(document, owner);
  if (!design || !name) return;
  editorStore.setState({ clipboard: { kind: owner.kind, name, design: structuredClone(design) } });
  notify('notice.copied');
}
export function pasteItem() {
  const state = editorStore.getState(), item = state.clipboard;
  if (!item) return;
  if (item.kind === 'firework') {
    const id = documentActions.saveFirework(t('library.copyName', { name: item.name }), item.design);
    if (id) editorActions.openDesign({ kind: 'firework', id });
  } else {
    const document = documentStore.getState().document;
    const launcherId = state.selection?.kind === 'launcher' ? state.selection.id : state.selection?.kind === 'cue' ? document.cues[state.selection.id]?.launcherId : Object.keys(document.launchers)[0];
    const tick = Math.min(playback.getSnapshot().tick, LIMITS.cueSeconds * TICK_RATE);
    const id = documentActions.placeDesign(item.name, item.design, launcherId, tick);
    if (id) editorActions.select({ kind: 'cue', id });
  }
}
export function duplicateItem(owner: DesignOwner) {
  const document = documentStore.getState().document, design = getDesign(document, owner), name = getOwnerName(document, owner);
  if (!design || !name) return;
  if (owner.kind === 'firework') {
    const id = documentActions.saveFirework(t('library.copyName', { name }), design);
    if (id) editorActions.openDesign({ kind: 'firework', id });
  } else {
    const cue = document.cues[owner.id];
    const id = documentActions.placeDesign(t('library.copyName', { name }), design, cue.launcherId, cue.atTick);
    if (id) editorActions.select({ kind: 'cue', id });
  }
}

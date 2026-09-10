import { useStore } from 'zustand';
import { editorStore } from '../../state/editorStore';
import { useRenderProbe } from '../../app/useRenderProbe';
import { DesignerInspector } from '../designer/DesignerInspector';
import { PresetPreviewInspector } from './PresetPreviewInspector';
import { ShowInspector } from '../show/ShowInspector';
export function Inspector() {
  useRenderProbe('Inspector');
  const page = useStore(editorStore, state => state.page), visible = useStore(editorStore, state => state.mobilePanel === 'inspector'), preview = useStore(editorStore, state => state.transientPreview);
  return <aside className={`inspector ${visible ? 'mobile-visible' : ''}`}>{preview ? <PresetPreviewInspector /> : page === 'designer' ? <DesignerInspector /> : <ShowInspector />}</aside>;
}

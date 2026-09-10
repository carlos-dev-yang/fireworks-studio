import { Plus } from 'lucide-react';
import { useStore } from 'zustand';
import { documentActions } from '../../state/documentStore';
import { editorActions, editorStore } from '../../state/editorStore';
import { useI18n } from '../../i18n';

export function PresetPreviewInspector() {
  const { t } = useI18n();
  const preview = useStore(editorStore, state => state.transientPreview);
  if (!preview) return null;
  const add = () => {
    const id = documentActions.saveFirework(preview.name, preview.design);
    if (id) editorActions.openDesign({ kind: 'firework', id });
  };
  return <div className="preset-preview-inspector"><div className="panel-heading"><div><span className="eyebrow">{t('preview.badge')}</span><h2>{preview.name}</h2></div></div><p className="scope-note preview-scope">{t('preview.source')}</p><button className="button primary wide" onClick={add}><Plus size={15} />{t('preview.add')}</button></div>;
}

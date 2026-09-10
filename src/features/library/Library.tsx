import { memo, useEffect, useState } from 'react';
import { Copy, ClipboardPaste, GripVertical, Plus } from 'lucide-react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { PATTERNS } from '../../domain/catalog';
import type { PatternId } from '../../domain/catalog';
import { createDesign } from '../../domain/presets';
import type { FireworkDesign } from '../../domain/schema';
import { playback, fireworkAudio } from '../../app/services';
import { documentActions, documentStore } from '../../state/documentStore';
import { editorActions, editorStore } from '../../state/editorStore';
import { copyItem, pasteItem } from '../../state/clipboardActions';
import { useI18n } from '../../i18n';
import { useRenderProbe } from '../../app/useRenderProbe';
import { PatternIcon } from '../shared/PatternIcon';
import { Help, Tip } from '../shared/Help';
import { beginDrag } from '../show/drag';
import { FestivalButton } from '../show/FestivalButton';
import { notify } from '../../state/noticeStore';
import { listPresets, savePreset } from '../../storage/library';
import type { PersonalPreset } from '../../storage/library';
import { FireworkJsonControls } from './FireworkJsonControls';
const standardPatterns = (Object.keys(PATTERNS) as PatternId[]).filter(pattern => pattern !== 'artwork');

function PresetCard({ name, design }: { name: string; design: FireworkDesign }) {
  const { t } = useI18n();
  const preview = () => {
    void fireworkAudio.resume();
    editorActions.preview(name, design);
    if (playback.getSnapshot().loop) playback.toggleLoop();
    playback.seek(0);
    playback.play();
  };
  const add = () => {
    const fireworkId = documentActions.saveFirework(name, design);
    if (fireworkId) editorActions.openDesign({ kind: 'firework', id: fireworkId });
  };
  const pattern = design.layers[0]?.pattern ?? 'ring';
  return <div className="preset-card"><button className="preset-card-preview" onClick={preview} aria-label={`${t('preview.badge')} · ${name}`}><PatternIcon pattern={pattern} /><span>{name}</span></button><button className="icon-button preset-card-add" onClick={add} aria-label={`${t('preview.add')} · ${name}`}><Plus size={12} /></button></div>;
}

function PersonalPresets() {
  const { t } = useI18n(); const [presets, setPresets] = useState<PersonalPreset[]>([]); const previewing = useStore(editorStore, state => !!state.transientPreview), activeId = useStore(editorStore, state => state.activeFireworkId);
  const activeFirework = useStore(documentStore, state => activeId ? state.document.fireworks[activeId] : undefined);
  const refresh = () => { void listPresets().then(setPresets).catch(() => { setPresets([]); notify('notice.fileError', 'error'); }); };
  useEffect(() => { refresh(); window.addEventListener('fireworks-library-imported', refresh); return () => window.removeEventListener('fireworks-library-imported', refresh); }, []);
  const saveSnapshot = () => {
    const firework = documentStore.getState().document.fireworks[editorStore.getState().activeFireworkId ?? ''];
    if (!firework) return;
    const now = new Date().toISOString();
    void savePreset({ id: `preset-${crypto.randomUUID()}`, name: firework.name, design: structuredClone(firework.design), createdAt: now, updatedAt: now }).then(refresh).catch(() => notify('notice.saveError', 'error'));
  };
  return <section className="preset-section"><div className="section-heading"><h3>{t('library.personalPresets')}</h3><button className="text-button" disabled={previewing} onClick={saveSnapshot}>{t('library.savePreset')}</button></div><FireworkJsonControls activeFirework={activeFirework} disabled={previewing} onImported={refresh} /><div className="preset-grid">{presets.map(preset => <PresetCard key={preset.id} name={preset.name} design={preset.design as FireworkDesign} />)}</div></section>;
}

const FireworkRow = memo(function FireworkRow({ id }: { id: string }) {
  const firework = useStore(documentStore, state => state.document.fireworks[id]);
  const selected = useStore(editorStore, state => state.page === 'show' ? state.activeFireworkId === id : state.editing?.kind === 'firework' && state.editing.id === id);
  const { t } = useI18n();
  if (!firework) return null;
  return <button className={`library-row ${selected ? 'selected' : ''}`} draggable onDragStart={event => beginDrag(event, { kind: 'firework', id, offset: 0 })} onClick={() => editorActions.select({ kind: 'firework', id })} aria-pressed={selected}>
    <PatternIcon pattern={firework.design.layers[0].pattern} /><span className="library-row-text"><strong>{firework.name}</strong><small>{t('designer.layers')} {firework.design.layers.length} · {firework.design.flight.height} u</small></span><GripVertical size={14} className="drag-handle" />
  </button>;
});
export function Library() {
  useRenderProbe('Library'); const { t } = useI18n();
  const ids = useStore(documentStore, useShallow(state => Object.keys(state.document.fireworks)));
  const page = useStore(editorStore, state => state.page), visible = useStore(editorStore, state => state.mobilePanel === 'library');
  const active = useStore(editorStore, state => state.activeFireworkId), clipboard = useStore(editorStore, state => !!state.clipboard), previewing = useStore(editorStore, state => !!state.transientPreview);
  return <aside className={`library ${visible ? 'mobile-visible' : ''}`}><div className="panel-heading"><div><span className="eyebrow">{t('eyebrow.library')}</span><h2>{t('library.title')}</h2></div><Help label={t('library.title')} content="help.library" /></div><p className="panel-note">{t(page === 'show' ? 'library.dragHint' : 'library.hint')}</p>
    <FestivalButton />
    <div className="section-heading"><h3>{t('library.fireworks')} <span className="count-badge">{ids.length}</span></h3><div className="small-actions"><Tip content="help.copy"><button className="icon-button" aria-label={t('action.copy')} disabled={!active || previewing} onClick={() => active && copyItem({ kind: 'firework', id: active })}><Copy size={14} /></button></Tip><Tip content="help.paste"><button className="icon-button" aria-label={t('action.paste')} disabled={!clipboard || previewing} onClick={pasteItem}><ClipboardPaste size={14} /></button></Tip></div></div>
    <div className="firework-list">{ids.map(id => <FireworkRow key={id} id={id} />)}{!ids.length && <p className="panel-note">{t('library.empty')}</p>}</div>
    <PersonalPresets />
    <section className="preset-section"><div className="section-heading"><h3>{t('library.presets')}</h3><Help label={t('library.presets')} content="help.presetPreview" /></div><div className="preset-grid">{standardPatterns.map(pattern => <Tip key={pattern} content="help.presetPreview"><PresetCard name={t(`preset.${pattern}`)} design={createDesign(pattern, t(`preset.${pattern}`))} /></Tip>)}</div></section>
  </aside>;
}

import { memo, useState } from 'react';
import { Copy, ClipboardPaste, GripVertical, Plus } from 'lucide-react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { PATTERNS } from '../../domain/catalog';
import type { PatternId } from '../../domain/catalog';
import { CHARACTER_DIMENSIONS, CHARACTER_IDS, characterPattern, isCharacterPattern } from '../../domain/characterCatalog';
import type { CharacterDimension } from '../../domain/characterCatalog';
import { documentActions, documentStore } from '../../state/documentStore';
import { editorActions, editorStore } from '../../state/editorStore';
import { copyItem, pasteItem } from '../../state/clipboardActions';
import { useI18n } from '../../i18n';
import { useRenderProbe } from '../../app/useRenderProbe';
import { PatternIcon } from '../shared/PatternIcon';
import { Help, Tip } from '../shared/Help';
import { beginDrag } from '../show/drag';
import { FestivalButton } from '../show/FestivalButton';
import { CharacterShowButton } from '../show/CharacterShowButton';
const standardPatterns = (Object.keys(PATTERNS) as PatternId[]).filter(pattern => !isCharacterPattern(pattern));

function CharacterPresets() {
  const { t } = useI18n();
  const [dimension, setDimension] = useState<CharacterDimension>('2d');
  return <section className="preset-section character-presets">
    <div className="section-heading"><h3>{t('library.characters')} <span className="count-badge">{CHARACTER_IDS.length}</span></h3><Help label={t('library.characters')} content="help.character" /></div>
    <div className="character-dimensions" role="group" aria-label={t('character.dimension')}>{CHARACTER_DIMENSIONS.map(value => <button key={value} aria-pressed={dimension === value} onClick={() => setDimension(value)}>{t(`character.${value}`)}</button>)}</div>
    <p className="character-hint">{t(dimension === '2d' ? 'character.hint2d' : 'character.hint3d')}</p>
    <div className="preset-grid">{CHARACTER_IDS.map(character => <button key={character} className="preset-card character-card" aria-label={`${t('library.new')} · ${t(`character.${character}`)} · ${t(`character.${dimension}`)}`} onClick={() => {
      const id = documentActions.addCharacterFirework(character, dimension);
      if (id) { editorStore.setState({ previewMode: 'firework' }); editorActions.openDesign({ kind: 'firework', id }); }
    }}><PatternIcon pattern={characterPattern(character, dimension)} /><span>{t(`character.${character}`)}</span><small>{dimension.toUpperCase()}</small><Plus size={12} /></button>)}</div>
  </section>;
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
  const active = useStore(editorStore, state => state.activeFireworkId), clipboard = useStore(editorStore, state => !!state.clipboard);
  return <aside className={`library ${visible ? 'mobile-visible' : ''}`}><div className="panel-heading"><div><span className="eyebrow">{t('eyebrow.library')}</span><h2>{t('library.title')}</h2></div><Help label={t('library.title')} content="help.library" /></div><p className="panel-note">{t(page === 'show' ? 'library.dragHint' : 'library.hint')}</p>
    <FestivalButton />
    <CharacterShowButton />
    <div className="section-heading"><h3>{t('library.fireworks')} <span className="count-badge">{ids.length}</span></h3><div className="small-actions"><Tip content="help.copy"><button className="icon-button" aria-label={t('action.copy')} disabled={!active} onClick={() => active && copyItem({ kind: 'firework', id: active })}><Copy size={14} /></button></Tip><Tip content="help.paste"><button className="icon-button" aria-label={t('action.paste')} disabled={!clipboard} onClick={pasteItem}><ClipboardPaste size={14} /></button></Tip></div></div>
    <div className="firework-list">{ids.map(id => <FireworkRow key={id} id={id} />)}{!ids.length && <p className="panel-note">{t('library.empty')}</p>}</div>
    <CharacterPresets />
    <section className="preset-section"><div className="section-heading"><h3>{t('library.presets')}</h3><Help label={t('library.presets')} content="help.preset" /></div><div className="preset-grid">{standardPatterns.map(pattern => <Tip key={pattern} content="help.preset"><button className="preset-card" onClick={() => { const id = documentActions.addFirework(pattern); if (id) editorActions.openDesign({ kind: 'firework', id }); }} aria-label={`${t('library.new')} · ${t(`preset.${pattern}`)}`}><PatternIcon pattern={pattern} /><span>{t(`preset.${pattern}`)}</span><Plus size={12} /></button></Tip>)}</div></section>
  </aside>;
}

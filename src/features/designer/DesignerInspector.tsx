import { memo, useId, useState } from 'react';
import { ArrowLeft, Copy, CopyPlus, Plus, Trash2, Layers } from 'lucide-react';
import { useStore } from 'zustand';
import { getDesign, getOwnerName } from '../../domain/schema';
import type { DesignOwner, LayerDefinition } from '../../domain/schema';
import { LIMITS, PATTERNS } from '../../domain/catalog';
import type { PatternId } from '../../domain/catalog';
import { documentActions, documentStore } from '../../state/documentStore';
import { editorActions, editorStore } from '../../state/editorStore';
import { copyItem, duplicateItem } from '../../state/clipboardActions';
import { useI18n } from '../../i18n';
import { NameField, NumberField, RangeField, SelectField } from '../shared/Fields';
import { Help, Tip } from '../shared/Help';
import { PatternIcon } from '../shared/PatternIcon';
import { PatternOptions } from '../shared/PatternOptions';
import { StarEditor } from '../inspector/StarEditor';
import { FlightEditor } from './FlightEditor';
const PatternEditor = memo(function PatternEditor({ owner, layer }: { owner: DesignOwner; layer: LayerDefinition }) {
  const { t, number } = useI18n();
  const update = (patch: Partial<LayerDefinition>) => documentActions.updateLayer(owner, layer.id, current => ({ ...current, ...patch }));
  return <><NameField visible label={t('designer.layerName')} value={layer.name} onCommit={name => update({ name })} /><SelectField label={t('field.pattern')} help="help.pattern" value={layer.pattern} onChange={value => documentActions.setPattern(owner, layer.id, value as PatternId)}><PatternOptions includeArtwork={layer.pattern === 'artwork'} /></SelectField>
    <NumberField label={t('field.count')} help="help.count" value={layer.count} min={LIMITS.count.min} max={PATTERNS[layer.pattern].maxCount} onCommit={count => update({ count })} />
    <RangeField label={t('field.spread')} help="help.spread" value={layer.spread} {...LIMITS.spread} display={`${number(layer.spread, 2)}×`} onChange={spread => update({ spread })} />
    <RangeField label={t('field.rotation')} help="help.rotation" value={layer.rotation} {...LIMITS.rotation} step={1} display={`${number(layer.rotation, 0)}°`} onChange={rotation => update({ rotation })} />
    <NumberField label={t('field.delay')} help="help.delay" value={layer.delaySeconds} {...LIMITS.delay} step={0.01} suffix={t('unit.seconds')} onCommit={delaySeconds => update({ delaySeconds })} />
    <div className="control-divider" /><RangeField label={t('field.burst')} help="help.burst" value={layer.burstStrength} {...LIMITS.burst} display={`${number(layer.burstStrength, 2)}×`} onChange={burstStrength => update({ burstStrength })} />
    <RangeField label={t('field.burstTime')} help="help.burstTime" value={layer.burstSeconds} {...LIMITS.burstTime} display={`${number(layer.burstSeconds, 2)} ${t('unit.seconds')}`} onChange={burstSeconds => update({ burstSeconds })} />
    <RangeField label={t('field.drag')} help="help.drag" value={layer.dragScale} {...LIMITS.drag} display={`${number(layer.dragScale, 2)}×`} onChange={dragScale => update({ dragScale })} />
  </>;
});
export function DesignerInspector() {
  const { t } = useI18n(); const owner = useStore(editorStore, state => state.editing), layerId = useStore(editorStore, state => state.layerId), tab = useStore(editorStore, state => state.inspectorTab);
  const design = useStore(documentStore, state => owner ? getDesign(state.document, owner) : undefined), name = useStore(documentStore, state => owner ? getOwnerName(state.document, owner) : undefined);
  const panelId = useId();
  const [newPattern, setNewPattern] = useState<PatternId>('ring');
  if (!owner || !design || !name) return <p className="panel-note">{t('designer.empty')}</p>;
  const layer = design.layers.find(layer => layer.id === layerId) ?? design.layers[0];
  return <><div className="panel-heading"><div><span className="eyebrow">{t('eyebrow.design')}</span><h2>{t('designer.title')}</h2></div><Layers size={19} /></div>
    {owner.kind === 'cue' && <button className="button back-button" onClick={() => editorActions.select(owner)}><ArrowLeft size={14} />{t('action.back')}</button>}
    <p className={`scope-note ${owner.kind === 'cue' ? 'cue-scope' : ''}`}>{owner.kind === 'cue' && <strong>{t('designer.cue')} · </strong>}{t(owner.kind === 'cue' ? 'designer.cueIndependent' : 'designer.independent')}</p>
    <NameField label={t('designer.name')} value={name} onCommit={name => documentActions.renameDesign(owner, name)} />
    <div className="section-heading"><h3>{t('designer.layers')} <span className="count-badge">{design.layers.length}/{LIMITS.layers}</span></h3><Help label={t('designer.layers')} content="help.layers" /></div>
    <div className="layer-list">{design.layers.map((item, index) => <div key={item.id} className={`layer-row ${layer.id === item.id ? 'selected' : ''}`}><input type="checkbox" checked={item.enabled} aria-label={`${t('designer.enabled')} · ${item.name}`} onChange={event => documentActions.updateLayer(owner, item.id, current => ({ ...current, enabled: event.currentTarget.checked }))} /><button onClick={() => editorStore.setState({ layerId: item.id })} aria-pressed={layer.id === item.id}><PatternIcon pattern={item.pattern} /><span>{String(index + 1).padStart(2, '0')} · {item.name}</span></button><button className="icon-button destructive" disabled={design.layers.length <= 1} aria-label={`${t('action.delete')} · ${item.name}`} onClick={() => documentActions.removeLayer(owner, item.id)}><Trash2 size={13} /></button></div>)}</div>
    <div className="add-layer"><select aria-label={t('designer.addLayer')} value={newPattern} onChange={event => setNewPattern(event.currentTarget.value as PatternId)}><PatternOptions /></select><Tip content="help.layers"><button className="button" disabled={design.layers.length >= LIMITS.layers} onClick={() => { const id = documentActions.addLayer(owner, newPattern); if (id) editorStore.setState({ layerId: id, inspectorTab: 'pattern' }); }}><Plus size={14} />{t('action.add')}</button></Tip></div>
    <div className="inspector-tabs" role="tablist" aria-label={t('nav.settings')}>{(['pattern', 'star', 'flight'] as const).map(value => <button key={value} role="tab" id={`${panelId}-${value}`} aria-controls={panelId} data-tab={value} tabIndex={value === tab ? 0 : -1} aria-selected={value === tab} className={value === tab ? 'active' : ''} onClick={() => editorStore.setState({ inspectorTab: value })} onKeyDown={event => {
      const tabs = ['pattern', 'star', 'flight'] as const;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : tabs[(tabs.indexOf(value) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      editorStore.setState({ inspectorTab: next });
      event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
    }}>{t(value === 'flight' ? 'designer.flightTab' : value === 'star' ? 'designer.starTab' : 'designer.patternTab')}</button>)}</div>
    <section className="detail-controls" role="tabpanel" id={panelId} aria-labelledby={`${panelId}-${tab}`}>{tab === 'flight' ? <FlightEditor owner={owner} flight={design.flight} /> : tab === 'star' ? <StarEditor owner={owner} layer={layer} /> : <PatternEditor owner={owner} layer={layer} />}</section>
    <div className="inspector-actions"><Tip content="help.copy"><button className="button" onClick={() => copyItem(owner)}><Copy size={14} />{t('action.copy')}</button></Tip><Tip content="help.copy"><button className="button" onClick={() => duplicateItem(owner)}><CopyPlus size={14} />{t('action.duplicate')}</button></Tip><button className="icon-button destructive" aria-label={t('action.delete')} onClick={() => owner.kind === 'firework' ? documentActions.deleteFirework(owner.id) : documentActions.deleteCue(owner.id)}><Trash2 size={15} /></button></div>
  </>;
}

import { Copy, CopyPlus, Pencil, Save, Trash2 } from 'lucide-react';
import { useStore } from 'zustand';
import { LIMITS, TICK_RATE } from '../../domain/catalog';
import { burstTime, cueDuration } from '../../domain/timing';
import { documentActions, documentStore } from '../../state/documentStore';
import { editorActions, editorStore } from '../../state/editorStore';
import { copyItem, duplicateItem } from '../../state/clipboardActions';
import { useI18n } from '../../i18n';
import { FlightEditor } from '../designer/FlightEditor';
import { NameField, NumberField, RangeField, SelectField } from '../shared/Fields';
import { Tip } from '../shared/Help';
function CueInspector({ id }: { id: string }) {
  const { t, number } = useI18n(); const cue = useStore(documentStore, state => state.document.cues[id]); const launchers = useStore(documentStore, state => state.document.launchers);
  if (!cue) return null;
  const owner = { kind: 'cue' as const, id };
  return <><div className="panel-heading"><div><span className="eyebrow">{t('eyebrow.cue')}</span><h2>{t('cue.title')}</h2></div></div><p className="scope-note">{t('cue.independent')}</p><NameField label={t('cue.name')} value={cue.name} onCommit={name => documentActions.updateCue(id, { name })} />
    <SelectField label={t('cue.launcher')} help="help.launcher" value={cue.launcherId} onChange={launcherId => documentActions.updateCue(id, { launcherId })}>{Object.values(launchers).map(launcher => <option key={launcher.id} value={launcher.id}>{launcher.name}</option>)}</SelectField>
    <NumberField label={t('cue.start')} help="help.start" value={cue.atTick / TICK_RATE} min={0} max={LIMITS.cueSeconds} step={0.01} suffix={t('unit.seconds')} onCommit={value => documentActions.updateCue(id, { atTick: Math.round(value * TICK_RATE) })} />
    <FlightEditor owner={owner} flight={cue.design.flight} /><dl className="derived-values burst-values"><div><dt>{t('cue.burstAt')}</dt><dd>{number(burstTime(cue), 2)} <span>{t('unit.seconds')}</span></dd></div><div><dt>{t('cue.endsAt')}</dt><dd>{number(cue.atTick / TICK_RATE + cueDuration(cue), 2)} <span>{t('unit.seconds')}</span></dd></div></dl>
    <button className="button primary wide" onClick={() => editorActions.openDesign(owner)}><Pencil size={14} />{t('cue.edit')}</button>
    <button className="button wide secondary-action" onClick={() => { const newId = documentActions.saveFirework(cue.name, cue.design); if (newId) editorStore.setState({ activeFireworkId: newId }); }}><Save size={14} />{t('cue.saveDesign')}</button>
    <div className="inspector-actions"><Tip content="help.copy"><button className="button" onClick={() => copyItem(owner)}><Copy size={14} />{t('action.copy')}</button></Tip><Tip content="help.copy"><button className="button" onClick={() => duplicateItem(owner)}><CopyPlus size={14} />{t('action.duplicate')}</button></Tip><button className="icon-button destructive" aria-label={t('action.delete')} onClick={() => documentActions.deleteCue(id)}><Trash2 size={15} /></button></div>
  </>;
}
function LauncherInspector({ id }: { id: string }) {
  const { t } = useI18n(); const launcher = useStore(documentStore, state => state.document.launchers[id]);
  const canDelete = useStore(documentStore, state => Object.keys(state.document.launchers).length > 1 && !Object.values(state.document.cues).some(cue => cue.launcherId === id));
  if (!launcher) return null;
  return <><div className="panel-heading"><div><span className="eyebrow">{t('eyebrow.stage')}</span><h2>{t('launcher.title')}</h2></div></div><NameField label={t('launcher.name')} value={launcher.name} onCommit={name => documentActions.updateLauncher(id, { name })} />
    <RangeField label={t('launcher.x')} help="help.position" value={launcher.x} {...LIMITS.stage} onChange={x => documentActions.updateLauncher(id, { x })} /><RangeField label={t('launcher.z')} help="help.position" value={launcher.z} {...LIMITS.stage} onChange={z => documentActions.updateLauncher(id, { z })} />
    <button className="button destructive" disabled={!canDelete} onClick={() => documentActions.deleteLauncher(id)}><Trash2 size={15} />{t('action.delete')}</button>{!canDelete && <p className="panel-note">{t('launcher.deleteHint')}</p>}
  </>;
}
export function ShowInspector() { const selection = useStore(editorStore, state => state.selection); const { t } = useI18n(); return selection?.kind === 'cue' ? <CueInspector id={selection.id} /> : selection?.kind === 'launcher' ? <LauncherInspector id={selection.id} /> : <div className="empty-inspector"><h2>{t('cue.title')}</h2><p className="panel-note">{t('cue.empty')}</p><p className="panel-note">{t('show.hint')}</p></div>; }

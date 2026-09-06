import { useState } from 'react';
import { useStore } from 'zustand';
import { LIMITS, TICK_RATE } from '../../domain/catalog';
import { documentActions, documentStore } from '../../state/documentStore';
import { editorActions, editorStore } from '../../state/editorStore';
import { playback } from '../../app/services';
import { notify } from '../../state/noticeStore';
import { useI18n } from '../../i18n';
import { Modal } from '../shared/Help';
import { NumberField, SelectField } from '../shared/Fields';
const SEQUENCE_DEFAULT = { interval: 1.5, count: 6 };
function initialLauncher() { const document = documentStore.getState().document, selection = editorStore.getState().selection; return selection?.kind === 'launcher' ? selection.id : selection?.kind === 'cue' ? document.cues[selection.id]?.launcherId ?? Object.keys(document.launchers)[0] : Object.keys(document.launchers)[0]; }
const initialTime = () => Math.min(LIMITS.cueSeconds, Math.round(playback.getSnapshot().tick / TICK_RATE * 100) / 100);
export function AddCueDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n(); const fireworks = useStore(documentStore, state => state.document.fireworks), launchers = useStore(documentStore, state => state.document.launchers);
  const [fireworkId, setFirework] = useState(() => editorStore.getState().activeFireworkId ?? Object.keys(fireworks)[0] ?? ''), [launcherId, setLauncher] = useState(initialLauncher), [time, setTime] = useState(initialTime);
  return <Modal title={t('show.addCue')} description={t('help.addCue')} onClose={onClose}><form onSubmit={event => { event.preventDefault(); const id = documentActions.addCue(fireworkId, launcherId, Math.round(time * TICK_RATE)); if (id) { editorActions.select({ kind: 'cue', id }); onClose(); } }}>
    <SelectField label={t('cue.firework')} value={fireworkId} onChange={setFirework}>{Object.values(fireworks).map(firework => <option key={firework.id} value={firework.id}>{firework.name}</option>)}</SelectField><SelectField label={t('cue.launcher')} help="help.launcher" value={launcherId} onChange={setLauncher}>{Object.values(launchers).map(launcher => <option key={launcher.id} value={launcher.id}>{launcher.name}</option>)}</SelectField>
    <NumberField label={t('cue.start')} help="help.start" value={time} min={0} max={LIMITS.cueSeconds} step={0.01} suffix={t('unit.seconds')} onCommit={setTime} />
    <div className="modal-actions"><button type="button" className="button" onClick={onClose}>{t('action.cancel')}</button><button type="submit" className="button primary" disabled={!fireworks[fireworkId]}>{t('show.addCue')}</button></div>
  </form></Modal>;
}
function toggle(ids: string[], id: string) { return ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]; }
export function SequenceDialog({ onClose }: { onClose: () => void }) {
  const { t, number } = useI18n(); const fireworks = useStore(documentStore, state => state.document.fireworks), launchers = useStore(documentStore, state => state.document.launchers);
  const [fireworkIds, setFireworks] = useState(() => { const active = editorStore.getState().activeFireworkId; return active ? [active] : Object.keys(fireworks).slice(0, 1); });
  const [launcherIds, setLaunchers] = useState(() => Object.keys(launchers));
  const [time, setTime] = useState(initialTime), [interval, setInterval] = useState(SEQUENCE_DEFAULT.interval), [count, setCount] = useState(SEQUENCE_DEFAULT.count), [reverse, setReverse] = useState(false);
  return <Modal title={t('sequence.title')} description={t('sequence.hint')} onClose={onClose}><form onSubmit={event => {
    event.preventDefault(); const ordered = launcherIds.filter(id => launchers[id]).sort((a, b) => (launchers[a].x - launchers[b].x || a.localeCompare(b)) * (reverse ? -1 : 1));
    const ids = documentActions.sequence(fireworkIds, ordered, time, interval, count);
    if (ids) { editorActions.select({ kind: 'cue', id: ids[0] }); notify('notice.added', 'info', { count: ids.length }); onClose(); }
  }}>
    <fieldset className="choice-list"><legend>{t('sequence.fireworks')}</legend>{Object.values(fireworks).map(firework => <label key={firework.id}><input type="checkbox" aria-label={firework.name} checked={fireworkIds.includes(firework.id)} onChange={() => setFireworks(toggle(fireworkIds, firework.id))} /><span>{firework.name}</span>{fireworkIds.includes(firework.id) && <small>{fireworkIds.indexOf(firework.id) + 1}</small>}</label>)}</fieldset>
    <fieldset className="choice-list compact"><legend>{t('sequence.launchers')}</legend>{Object.values(launchers).sort((a, b) => a.x - b.x).map(launcher => <label key={launcher.id}><input type="checkbox" checked={launcherIds.includes(launcher.id)} onChange={() => setLaunchers(toggle(launcherIds, launcher.id))} />{launcher.name}</label>)}</fieldset>
    <SelectField label={t('sequence.direction')} help="help.sequence" value={reverse ? 'reverse' : 'forward'} onChange={value => setReverse(value === 'reverse')}><option value="forward">{t('sequence.forward')}</option><option value="reverse">{t('sequence.reverse')}</option></SelectField>
    <NumberField label={t('sequence.start')} help="help.start" value={time} min={0} max={LIMITS.cueSeconds} step={0.01} suffix={t('unit.seconds')} onCommit={setTime} />
    <NumberField label={t('sequence.interval')} help="help.sequence" value={interval} min={0} max={LIMITS.cueSeconds} step={0.01} suffix={t('unit.seconds')} onCommit={setInterval} />
    <NumberField label={t('sequence.count')} value={count} min={1} max={LIMITS.cues} onCommit={setCount} />
    <p className="sequence-summary">{t('sequence.summary', { count, time: number(time + interval * (count - 1), 2) })}</p>
    <div className="modal-actions"><button type="button" className="button" onClick={onClose}>{t('action.cancel')}</button><button type="submit" className="button primary" disabled={!fireworkIds.length || !launcherIds.length || time + interval * (count - 1) > LIMITS.cueSeconds}>{t('sequence.submit', { count })}</button></div>
  </form></Modal>;
}

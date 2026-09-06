import { useSyncExternalStore } from 'react';
import { Pause, Play, RotateCcw, Repeat2 } from 'lucide-react';
import { useStore } from 'zustand';
import { playback, viewportStatus } from '../../app/services';
import { formatTime } from '../../domain/timing';
import { TICK_RATE } from '../../domain/catalog';
import { useRenderProbe } from '../../app/useRenderProbe';
import { useI18n } from '../../i18n';
import { Tip } from '../shared/Help';
const READOUT_HZ = 10, SCRUBBER_HZ = 20;
function displayTick(frequency: number) { const { tick, playing } = playback.getSnapshot(); const interval = TICK_RATE / frequency; return playing ? Math.floor(tick / interval) * interval : tick; }
function TimeReadout() {
  useRenderProbe('TimeReadout'); const { t } = useI18n();
  const tick = useSyncExternalStore(playback.subscribe, () => displayTick(READOUT_HZ));
  return <output className="time-readout" aria-label={t('play.position')}>{formatTime(tick)}</output>;
}
export function Transport() {
  useRenderProbe('Transport'); const { t } = useI18n();
  const playing = useSyncExternalStore(playback.subscribe, () => playback.getSnapshot().playing);
  const loop = useSyncExternalStore(playback.subscribe, () => playback.getSnapshot().loop);
  const ready = useStore(viewportStatus, state => state.ready && !state.error);
  return <div className="transport"><Tip content="help.seek"><button className="icon-button play-button" aria-label={t(playing ? 'play.pause' : 'play.play')} disabled={!ready} onClick={() => playback.toggle()}>{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button></Tip>
    <Tip content="help.seek"><button className="icon-button" aria-label={t('play.restart')} disabled={!ready} onClick={() => playback.seek(0)}><RotateCcw size={16} /></button></Tip>
    <Tip content="help.loop"><button className={`icon-button ${loop ? 'active' : ''}`} aria-label={t('play.loop')} aria-pressed={loop} onClick={() => playback.toggleLoop()}><Repeat2 size={17} /></button></Tip><TimeReadout />
  </div>;
}
export function PreviewScrubber() {
  const { t } = useI18n();
  const tick = useSyncExternalStore(playback.subscribe, () => displayTick(SCRUBBER_HZ));
  const duration = useSyncExternalStore(playback.subscribe, () => playback.getSnapshot().duration);
  return <input className="preview-scrubber" type="range" aria-label={t('play.position')} min={0} max={duration} step={1} value={tick} onChange={event => playback.seek(Number(event.currentTarget.value))} />;
}
export function PreviewTransport() { return <div className="preview-transport"><Transport /><PreviewScrubber /></div>; }

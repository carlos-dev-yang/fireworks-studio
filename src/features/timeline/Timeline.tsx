import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, ListOrdered, Plus, RadioTower } from 'lucide-react';
import { useStore } from 'zustand';
import { documentActions, documentStore } from '../../state/documentStore';
import { editorActions, editorStore } from '../../state/editorStore';
import { pasteItem } from '../../state/clipboardActions';
import { playback } from '../../app/services';
import { TICK_RATE, TIMELINE } from '../../domain/catalog';
import { cueDuration, formatTime, timelineDurationSeconds } from '../../domain/timing';
import type { Cue } from '../../domain/schema';
import { useI18n } from '../../i18n';
import { useRenderProbe } from '../../app/useRenderProbe';
import { Help, Tip } from '../shared/Help';
import { PatternIcon } from '../shared/PatternIcon';
import { AddCueDialog, SequenceDialog } from '../show/CueDialogs';
import { beginDrag, DRAG_MIME, dropTick, readDrag } from '../show/drag';
import { PreviewScrubber, Transport } from './Transport';
const LOOKAHEAD_SECONDS = 10, MIN_VISIBLE_SECONDS = 30;
interface PlacedCue { cue: Cue; row: number; duration: number }
function stackCues(cues: Cue[]): { items: PlacedCue[]; height: number } {
  const ends: number[] = [];
  const items = cues.sort((a, b) => a.atTick - b.atTick || a.id.localeCompare(b.id)).map(cue => {
    const start = cue.atTick / TICK_RATE, duration = cueDuration(cue);
    let row = ends.findIndex(end => end <= start); if (row < 0) row = ends.length;
    ends[row] = start + duration; return { cue, row, duration };
  });
  return { items, height: Math.max(1, ends.length) * TIMELINE.rowHeight + TIMELINE.lanePadding };
}
const CueBlock = memo(function CueBlock({ item, scale }: { item: PlacedCue; scale: number }) {
  const { cue, row, duration } = item; const { t, number } = useI18n();
  const selected = useStore(editorStore, state => state.selection?.kind === 'cue' && state.selection.id === cue.id);
  return <button className={`cue-block ${selected ? 'selected' : ''}`} draggable style={{ left: cue.atTick / TICK_RATE * scale, width: duration * scale, top: row * TIMELINE.rowHeight + TIMELINE.lanePadding / 2 }}
    aria-label={`${cue.name} · ${t('cue.start')} ${number(cue.atTick / TICK_RATE, 2)} ${t('unit.seconds')}`} aria-pressed={selected}
    onClick={() => editorActions.select({ kind: 'cue', id: cue.id })} onDoubleClick={() => editorActions.openDesign({ kind: 'cue', id: cue.id })}
    onDragStart={event => { beginDrag(event, { kind: 'cue', id: cue.id, offset: (event.clientX - event.currentTarget.getBoundingClientRect().left) / scale }); }}>
    <span className="cue-ascent" style={{ width: cue.design.flight.riseSeconds / duration * 100 + '%' }} /><PatternIcon pattern={cue.design.layers[0].pattern} /><span>{cue.name}</span><small>{number(cue.atTick / TICK_RATE, 2)}s</small>
  </button>;
});
const LauncherLane = memo(function LauncherLane({ id, items, height, scale, width }: { id: string; items: PlacedCue[]; height: number; scale: number; width: number }) {
  const { t } = useI18n(); const launcher = useStore(documentStore, state => state.document.launchers[id]);
  const selected = useStore(editorStore, state => state.selection?.kind === 'launcher' && state.selection.id === id);
  if (!launcher) return null;
  return <div className="timeline-lane" style={{ height }}><button className={`lane-label ${selected ? 'selected' : ''}`} onClick={() => editorActions.select({ kind: 'launcher', id })}><RadioTower size={14} /><span>{launcher.name}</span><small>{items.length}</small></button><div className="lane-track" data-launcher-id={id} aria-label={launcher.name} style={{ width, backgroundSize: `${TIMELINE.majorStep * scale}px 100%` }}
    onDragOver={event => { if (!event.dataTransfer.types.includes(DRAG_MIME)) return; event.preventDefault(); event.currentTarget.classList.add('drag-over'); event.currentTarget.style.setProperty('--drop-left', `${event.clientX - event.currentTarget.getBoundingClientRect().left}px`); }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.classList.remove('drag-over'); }}
    onDrop={event => {
      event.preventDefault(); event.currentTarget.classList.remove('drag-over'); const item = readDrag(event); if (!item) return;
      const tick = dropTick(event.clientX, event.currentTarget.getBoundingClientRect().left, scale, item.offset);
      if (item.kind === 'cue') { documentActions.updateCue(item.id, { launcherId: id, atTick: tick }); if (documentStore.getState().document.cues[item.id]) editorActions.select({ kind: 'cue', id: item.id }); }
      else { const cueId = documentActions.addCue(item.id, id, tick); if (cueId) editorActions.select({ kind: 'cue', id: cueId }); }
    }}>
    {items.map(item => <CueBlock key={item.cue.id} item={item} scale={scale} />)}{!items.length && <span className="drop-hint">{t('show.drop')}</span>}
  </div></div>;
});
function Playhead({ scale }: { scale: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const update = () => { if (ref.current) ref.current.style.transform = `translateX(${playback.getSnapshot().tick / TICK_RATE * scale}px)`; }; update(); return playback.subscribe(update); }, [scale]);
  return <div className="playhead-track"><div className="playhead" ref={ref}><span /></div></div>;
}
function useFollowPlayhead(scrollRef: React.RefObject<HTMLDivElement | null>, scale: number) {
  useEffect(() => playback.subscribe(() => {
    const { playing, tick } = playback.getSnapshot();
    const scroll = scrollRef.current;
    if (!playing || !scroll) return;
    const contentX = TIMELINE.laneGutter + tick / TICK_RATE * scale;
    const viewport = scroll.clientWidth;
    const target = Math.max(0, Math.min(scroll.scrollWidth - viewport, contentX - Math.max(TIMELINE.laneGutter, viewport * 0.42)));
    if (Math.abs(scroll.scrollLeft - target) > 2) scroll.scrollLeft = target;
  }), [scale, scrollRef]);
}
export function Timeline() {
  useRenderProbe('Timeline'); const { t } = useI18n();
  const cues = useStore(documentStore, state => state.document.cues), launchers = useStore(documentStore, state => state.document.launchers);
  const canPaste = useStore(editorStore, state => state.clipboard?.kind === 'cue');
  const hasFireworks = useStore(documentStore, state => Object.keys(state.document.fireworks).length > 0);
  const [scale, setScale] = useState<number>(TIMELINE.pixelsPerSecond), [dialog, setDialog] = useState<'cue' | 'sequence' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const layout = useMemo(() => Object.values(launchers).sort((a, b) => a.x - b.x || a.id.localeCompare(b.id)).map(launcher => ({ id: launcher.id, ...stackCues(Object.values(cues).filter(cue => cue.launcherId === launcher.id)) })), [cues, launchers]);
  const duration = useMemo(() => Math.max(MIN_VISIBLE_SECONDS, timelineDurationSeconds({ cues }) + LOOKAHEAD_SECONDS), [cues]);
  const width = duration * scale;
  useFollowPlayhead(scrollRef, scale);
  return <section className="timeline"><div className="timeline-toolbar"><div className="timeline-title"><h2>{t('show.title')}</h2><Help label={t('show.title')} content="help.timeline" /></div><div className="timeline-actions"><Tip content="help.paste"><button className="icon-button" aria-label={t('action.paste')} disabled={!canPaste} onClick={pasteItem}><ClipboardPaste size={15} /></button></Tip><Tip content="help.position"><button className="button" onClick={() => { const id = documentActions.addLauncher(); if (id) editorActions.select({ kind: 'launcher', id }); }}><RadioTower size={14} />{t('show.addLauncher')}</button></Tip><Tip content="help.sequence"><button className="button" disabled={!hasFireworks} onClick={() => setDialog('sequence')}><ListOrdered size={15} />{t('show.sequence')}</button></Tip><Tip content="help.addCue"><button className="button primary" disabled={!hasFireworks} onClick={() => setDialog('cue')}><Plus size={15} />{t('show.addCue')}</button></Tip></div></div>
    <div className="timeline-playback"><Transport /><PreviewScrubber /><label className="timeline-zoom"><span>{t('show.zoom')}</span><input type="range" aria-label={t('show.zoom')} min={TIMELINE.minZoom} max={TIMELINE.maxZoom} value={scale} onChange={event => setScale(Number(event.currentTarget.value))} /><Help label={t('show.zoom')} content="help.zoom" /></label></div>
    <div className="timeline-scroll" ref={scrollRef}><div className="timeline-content" style={{ width: width + TIMELINE.laneGutter, '--timeline-gutter': `${TIMELINE.laneGutter}px` } as React.CSSProperties}><div className="timeline-ruler"><div className="ruler-gutter">{t('cue.launcher')}</div><div className="ruler" style={{ width, backgroundSize: `${scale}px 5px` }} onClick={event => playback.seek(dropTick(event.clientX, event.currentTarget.getBoundingClientRect().left, scale))}>{Array.from({ length: Math.floor(duration / TIMELINE.majorStep) + 1 }, (_, index) => <span key={index} className="ruler-label" style={{ left: index * TIMELINE.majorStep * scale }}>{formatTime(index * TIMELINE.majorStep * TICK_RATE).slice(0, 5)}</span>)}</div></div>
      <div className="timeline-lanes">{layout.map(lane => <LauncherLane key={lane.id} {...lane} scale={scale} width={width} />)}<Playhead scale={scale} /></div>
    </div></div>{dialog === 'cue' && <AddCueDialog onClose={() => setDialog(null)} />}{dialog === 'sequence' && <SequenceDialog onClose={() => setDialog(null)} />}
  </section>;
}

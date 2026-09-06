import { SCENE, TICK_RATE, TIMELINE } from './catalog';
import { compileLayer } from './patterns';
import type { Cue, FireworkDesign, ShowDocument } from './schema';
const durationCache = new WeakMap<FireworkDesign, number>();
export function designDuration(design: FireworkDesign): number {
  const cached = durationCache.get(design);
  if (cached !== undefined) return cached;
  const value = design.flight.riseSeconds + Math.max(0, ...design.layers.filter(layer => layer.enabled).map(layer => layer.delaySeconds + compileLayer(layer).duration));
  durationCache.set(design, value);
  return value;
}
export const cueDuration = (cue: Cue) => designDuration(cue.design);
export const burstTime = (cue: Cue) => cue.atTick / TICK_RATE + cue.design.flight.riseSeconds;
export function showDurationTicks(document: Pick<ShowDocument, 'cues'>): number {
  return Math.ceil(Math.max(SCENE.showMinimumSeconds, ...Object.values(document.cues).map(cue => cue.atTick / TICK_RATE + cueDuration(cue))) * TICK_RATE);
}
export function timelineDurationSeconds(document: Pick<ShowDocument, 'cues'>): number {
  return Math.ceil(showDurationTicks(document) / TICK_RATE / TIMELINE.majorStep) * TIMELINE.majorStep;
}
export function formatTime(tick: number): string {
  const seconds = tick / TICK_RATE;
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
}

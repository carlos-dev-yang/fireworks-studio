import { SCENE, TICK_RATE } from '../domain/catalog';
import { clamp } from '../domain/math';

export interface ClockSnapshot { readonly tick: number; readonly duration: number; readonly playing: boolean; readonly loop: boolean }
export class PlaybackClock {
  private snapshot: ClockSnapshot = { tick: 0, duration: TICK_RATE * SCENE.showMinimumSeconds, playing: false, loop: false };
  private listeners = new Set<() => void>();
  private anchorTime = 0;
  private anchorTick = 0;
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<ClockSnapshot>) {
    const next = { ...this.snapshot, ...patch };
    if (next.tick === this.snapshot.tick && next.duration === this.snapshot.duration && next.playing === this.snapshot.playing && next.loop === this.snapshot.loop) return;
    this.snapshot = next;
    this.listeners.forEach(listener => listener());
  }
  setDuration(duration: number) { this.publish({ duration, tick: Math.min(duration, this.snapshot.tick) }); }
  seek(tick: number) {
    this.publish({ tick: Math.round(clamp(tick, 0, this.snapshot.duration)), playing: false });
  }
  play() {
    this.anchorTick = this.snapshot.tick >= this.snapshot.duration ? 0 : this.snapshot.tick;
    this.anchorTime = performance.now();
    this.publish({ tick: this.anchorTick, playing: true });
  }
  pause() { this.publish({ playing: false }); }
  toggleLoop() { this.publish({ loop: !this.snapshot.loop }); }
  toggle() { if (this.snapshot.playing) this.pause(); else this.play(); }
  advance(now: number) {
    if (!this.snapshot.playing) return;
    const tick = Math.min(this.snapshot.duration, this.anchorTick + Math.round((now - this.anchorTime) * TICK_RATE / 1000));
    if (tick >= this.snapshot.duration && this.snapshot.loop) {
      this.anchorTime = now; this.anchorTick = 0; this.publish({ tick: 0, playing: true });
    } else this.publish({ tick, playing: tick < this.snapshot.duration });
  }
}

import type { PlaybackClock } from './PlaybackClock';

export interface FireworkAudioEvent { readonly id: string; readonly burstTick: number; readonly intensity?: number }
export interface FireworkPreviewOptions { readonly intensity?: number }
export interface AudioState { readonly muted: boolean; readonly volume: number; readonly available: boolean }
type AudioStateStore = { getState(): AudioState; setState(next: Partial<AudioState>): void };

const crossed = (event: FireworkAudioEvent, from: number, to: number) => event.burstTick > from && event.burstTick <= to;
const MAX_ACTIVE_BURSTS = 8;

export function coalesceBurstEvents(events: readonly FireworkAudioEvent[]): FireworkAudioEvent[] {
  const grouped = new Map<number, FireworkAudioEvent>();
  for (const event of events) {
    const current = grouped.get(event.burstTick);
    if (!current) grouped.set(event.burstTick, event);
    else grouped.set(event.burstTick, { id: `${current.id}+${event.id}`, burstTick: event.burstTick, intensity: Math.min(1.5, (current.intensity ?? 1) + (event.intensity ?? 1) * 0.35) });
  }
  return [...grouped.values()].sort((a, b) => a.burstTick - b.burstTick || a.id.localeCompare(b.id));
}

/** Small synthesized burst effects. The clock remains the source of truth; seeking never creates audio. */
export class FireworkAudio {
  private context: AudioContext | null = null;
  private events: readonly FireworkAudioEvent[] = [];
  private previousTick: number;
  private wasPlaying = false;
  private unsubscribeClock: (() => void) | null = null;
  private removeVisibility: (() => void) | null = null;

  private activeBursts = 0;

  constructor(private readonly clock: PlaybackClock, readonly state: AudioStateStore) {
    this.previousTick = clock.getSnapshot().tick;
    this.ensureListening();
  }

  private ensureListening() {
    if (this.unsubscribeClock) return;
    this.previousTick = this.clock.getSnapshot().tick;
    this.wasPlaying = false;
    this.unsubscribeClock = this.clock.subscribe(this.onClock);
    if (typeof document !== 'undefined') {
      const onVisibility = () => { if (document.hidden) this.silence(); };
      document.addEventListener('visibilitychange', onVisibility);
      this.removeVisibility = () => document.removeEventListener('visibilitychange', onVisibility);
    }
  }

  setEvents(events: readonly FireworkAudioEvent[]) { this.ensureListening(); this.events = coalesceBurstEvents(events); }
  setMuted(muted: boolean) { this.state.setState({ muted }); if (muted) this.silence(); }
  toggleMuted() { this.setMuted(!this.state.getState().muted); }
  setVolume(volume: number) { this.state.setState({ volume: Math.min(1, Math.max(0, volume)) }); }

  async resume() {
    this.ensureListening();
    if (!this.state.getState().available) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state !== 'running') await this.context.resume();
    } catch {
      // Browser policy may decline an untrusted interaction. A later gesture can try again.
    }
  }

  previewBurst(options: FireworkPreviewOptions = {}) { this.playBurst(options.intensity ?? 1); }

  private onClock = () => {
    const snapshot = this.clock.getSnapshot();
    if (this.wasPlaying && snapshot.tick >= this.previousTick && (snapshot.playing || snapshot.tick === snapshot.duration)) {
      for (const event of this.events) {
        if (event.burstTick > snapshot.tick) break;
        if (crossed(event, this.previousTick, snapshot.tick)) this.playBurst(event.intensity ?? 1);
      }
      // A pause or scrub did not advance the clock, so release any sounding tails immediately.
      if (!snapshot.playing && snapshot.tick === this.previousTick) this.silence();
    } else if (snapshot.playing && this.wasPlaying) {
      // PlaybackClock publishes tick 0 for a loop. Preserve a final boundary event and a zero-time event.
      for (const event of this.events) {
        if (event.burstTick > this.previousTick && event.burstTick <= snapshot.duration) this.playBurst(event.intensity ?? 1);
        if (event.burstTick === 0) this.playBurst(event.intensity ?? 1);
      }
    } else if (!snapshot.playing && this.wasPlaying) {
      this.silence();
    }
    this.previousTick = snapshot.tick;
    this.wasPlaying = snapshot.playing;
  };

  private playBurst(intensity: number) {
    const context = this.context;
    const { muted, volume } = this.state.getState();
    if (!context || context.state !== 'running' || muted || volume <= 0 || this.activeBursts >= MAX_ACTIVE_BURSTS) return;
    this.activeBursts += 1;
    const now = context.currentTime;
    const strength = Math.min(1.5, Math.max(0.35, intensity)) * volume;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.28 * strength, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
    gain.connect(context.destination);

    const noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.48), context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length);
    const crackle = context.createBufferSource();
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.setValueAtTime(920 + strength * 430, now); filter.Q.value = 0.55;
    crackle.buffer = noise; crackle.connect(filter).connect(gain); crackle.start(now); crackle.stop(now + 0.48);

    if (intensity > 0.45) {
      const boom = context.createOscillator();
      const boomGain = context.createGain();
      boom.type = 'sine'; boom.frequency.setValueAtTime(105 + strength * 28, now); boom.frequency.exponentialRampToValueAtTime(38, now + 0.18);
      boomGain.gain.setValueAtTime(0.2 * strength, now); boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      boom.connect(boomGain).connect(gain); boom.start(now); boom.stop(now + 0.25);
    }
    crackle.addEventListener('ended', () => { this.activeBursts = Math.max(0, this.activeBursts - 1); }, { once: true });
  }

  private silence() {
    // Closing/recreating the graph cuts any in-flight oscillators and is more reliable than tracking every node.
    const context = this.context;
    this.context = null;
    this.activeBursts = 0;
    if (context && context.state !== 'closed') void context.close();
  }

  dispose() {
    this.unsubscribeClock?.(); this.unsubscribeClock = null;
    this.removeVisibility?.(); this.removeVisibility = null;
    this.events = [];
    this.silence();
  }
}

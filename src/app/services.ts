import { createStore } from 'zustand/vanilla';
import type { MessageKey } from '../i18n';
import { PlaybackClock } from '../runtime/PlaybackClock';
import { FireworkAudio } from '../runtime/FireworkAudio';
import type { AudioState } from '../runtime/FireworkAudio';

export const playback = new PlaybackClock();
export const audioStatus = createStore<AudioState>(() => ({ muted: false, volume: 0.58, available: typeof window !== 'undefined' && !!window.AudioContext }));
export const fireworkAudio = new FireworkAudio(playback, audioStatus);
export const viewportStatus = createStore<{ ready: boolean; error: MessageKey | null }>(() => ({ ready: false, error: null }));
let reset: (() => void) | null = null;
export const cameraActions = {
  bind(handler: (() => void) | null) { reset = handler; },
  reset() { reset?.(); },
};

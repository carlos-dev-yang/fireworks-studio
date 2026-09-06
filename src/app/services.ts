import { createStore } from 'zustand/vanilla';
import type { MessageKey } from '../i18n';
import { PlaybackClock } from '../runtime/PlaybackClock';

export const playback = new PlaybackClock();
export const viewportStatus = createStore<{ ready: boolean; error: MessageKey | null }>(() => ({ ready: false, error: null }));
let reset: (() => void) | null = null;
export const cameraActions = {
  bind(handler: (() => void) | null) { reset = handler; },
  reset() { reset?.(); },
};

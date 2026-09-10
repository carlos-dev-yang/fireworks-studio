import { createStore } from 'zustand/vanilla';

export type ViewportBackground = 'stage' | 'yeouido';

const STORAGE_KEY = 'fireworks-studio:viewport-background';

function initialBackground(): ViewportBackground {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'yeouido' ? 'yeouido' : 'stage';
  } catch {
    return 'stage';
  }
}

export const backgroundStore = createStore<{ background: ViewportBackground }>(() => ({ background: initialBackground() }));

export function setViewportBackground(background: ViewportBackground) {
  backgroundStore.setState({ background });
  try { localStorage.setItem(STORAGE_KEY, background); } catch { /* This preference is optional. */ }
}

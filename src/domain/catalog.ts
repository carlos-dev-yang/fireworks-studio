import { CHARACTER_PATTERNS, CHARACTER_STYLE } from './characterCatalog';

export const FORMAT_VERSION = 'star-studio/2' as const;
export const MODEL_VERSION = 'visual-star/2' as const;
export const TICK_RATE = 120;
export const LIMITS = {
  fireworks: 64, layers: 8, launchers: 32, cues: 256, history: 80, nameLength: 60,
  rotation: { min: -180, max: 180 }, stage: { min: -1, max: 1 },
  count: { min: 4, max: CHARACTER_STYLE.parts.fill.maxCount }, spread: { min: 0.5, max: 1.8 },
  size: { min: 0.6, max: 1.6 }, trail: { min: 0, max: 2.5 },
  transition: { min: 0.2, max: 0.95 }, lifetime: { min: 0.5, max: 2 }, brightness: { min: 0.2, max: 2 },
  height: { min: 80, max: 500 }, rise: { min: 0.3, max: 6 }, delay: { min: 0, max: 6 },
  burst: { min: 1, max: 5 }, burstTime: { min: 0.08, max: 0.6 }, drag: { min: 0.5, max: 3 },
  cueSeconds: 120, importBytes: 5_000_000, pointBudget: 131_072,
} as const;
export const MATERIALS = {
  amber: { color: '#ffad42', lifetime: 3.5, tail: 0.9, drag: 0.27, glow: 1.05 },
  ruby: { color: '#ff4663', lifetime: 2.8, tail: 0.55, drag: 0.22, glow: 1 },
  silver: { color: '#e7f2ff', lifetime: 3.1, tail: 1, drag: 0.3, glow: 0.9 },
  azure: { color: '#68baff', lifetime: 2.9, tail: 0.65, drag: 0.24, glow: 1 },
  jade: { color: '#75efb7', lifetime: 3, tail: 0.75, drag: 0.25, glow: 1 },
} as const;
export type MaterialId = keyof typeof MATERIALS;
export const PATTERNS = {
  peony: { count: 240, maxCount: 512, speed: 64, gravity: 10, dragFactor: 1.2, lifeFactor: 0.85, tailFactor: 0.07, previewAge: 1.2 },
  chrysanthemum: { count: 200, maxCount: 512, speed: 65, gravity: 12, dragFactor: 1.3, lifeFactor: 1, tailFactor: 2, previewAge: 1.4 },
  willow: { count: 132, maxCount: 384, speed: 65, gravity: 19, dragFactor: 1.8, lifeFactor: 1.6, tailFactor: 2.45, previewAge: 3.2 },
  ring: { count: 128, maxCount: 384, speed: 65, gravity: 9, dragFactor: 1.2, lifeFactor: 0.9, tailFactor: 0.16, previewAge: 1.3 },
  crossette: { count: 8, maxCount: 48, speed: 64, gravity: 9, dragFactor: 1.1, lifeFactor: 1, tailFactor: 1.25, previewAge: 1.65 },
  heart: { count: 180, maxCount: 384, speed: 65, gravity: 7, dragFactor: 1, lifeFactor: 1.25, tailFactor: 0.12, previewAge: 1.6 },
  cat: { count: 260, maxCount: 512, speed: 65, gravity: 7, dragFactor: 1, lifeFactor: 1.25, tailFactor: 0.1, previewAge: 1.6 },
  apple: { count: 210, maxCount: 384, speed: 65, gravity: 7, dragFactor: 1, lifeFactor: 1.25, tailFactor: 0.1, previewAge: 1.6 },
  cup: { count: 220, maxCount: 384, speed: 65, gravity: 7, dragFactor: 1, lifeFactor: 1.25, tailFactor: 0.1, previewAge: 1.6 },
  ...CHARACTER_PATTERNS,
} as const;
export type PatternId = keyof typeof PATTERNS;
export const SCENE = {
  burstHeight: 200, launchDuration: 1.65, launchTail: 0.48, launcherHeight: 9,
  launchStep: 0.012, trailStep: 0.024, headSize: 7.4, tailSize: 4.7,
  launcherSpacing: 260, floorFade: 14, sparkGravity: 6, sparkFollow: 0.09,
  sparkJitter: 0.65, tailBrightness: 0.42, branches: 4, splitAt: 0.8,
  childSpeed: 29, childLifeFactor: 0.78, inheritedSpeed: 0.15,
  showMinimumSeconds: 20, previewMinimumSeconds: 5, flashSize: 66, flashBrightness: 2.2,
  defaultBurst: 3.2, defaultBurstTime: 0.16, defaultDrag: 1.15, flashAfterglow: 0.22,
  headFadePortion: 0.45, transitionWidth: 0.18,
} as const;
export const TIMELINE = { majorStep: 5, snapSeconds: 0.1, pixelsPerSecond: 24, minZoom: 18, maxZoom: 100, laneGutter: 142, rowHeight: 43, lanePadding: 10 } as const;

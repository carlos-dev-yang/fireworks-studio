import { PATTERNS, SCENE } from './catalog';
import type { PatternId } from './catalog';
import type { FireworkDesign, LayerDefinition, StarDefinition } from './schema';
// Presets are read-only templates. Applying one always creates authored input of its own.
export const STAR_PRESETS = {
  amber: { body: { form: 'sphere', scale: 1 }, material: { base: 'amber', finish: 'silver', transition: 0.78, trail: 1 }, lifetimeScale: 1, brightness: 1 },
  ruby: { body: { form: 'sphere', scale: 1 }, material: { base: 'ruby', finish: null, transition: 0.75, trail: 0.9 }, lifetimeScale: 1, brightness: 1 },
  silver: { body: { form: 'sphere', scale: 0.9 }, material: { base: 'silver', finish: 'azure', transition: 0.7, trail: 1 }, lifetimeScale: 1, brightness: 1 },
} as const satisfies Record<string, StarDefinition>;
export type StarPresetId = keyof typeof STAR_PRESETS;
export const copyStarPreset = (id: StarPresetId): StarDefinition => structuredClone(STAR_PRESETS[id]);
export function createLayer(pattern: PatternId, id: string, name: string): LayerDefinition {
  const layer: LayerDefinition = { id, name, enabled: true, pattern, count: PATTERNS[pattern].count, spread: 1, rotation: 0, delaySeconds: 0,
    burstStrength: SCENE.defaultBurst, burstSeconds: SCENE.defaultBurstTime, dragScale: SCENE.defaultDrag, seed: id,
    star: copyStarPreset(pattern === 'peony' || pattern === 'heart' || pattern === 'apple' ? 'ruby' : pattern === 'ring' || pattern === 'cat' ? 'silver' : 'amber') };
  return layer;
}
export function createDesign(pattern: PatternId, name: string): FireworkDesign {
  return { flight: { height: SCENE.burstHeight, riseSeconds: SCENE.launchDuration }, layers: [createLayer(pattern, 'layer-main', name)] };
}

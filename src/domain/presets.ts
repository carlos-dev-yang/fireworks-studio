import { PATTERNS, SCENE } from './catalog';
import type { PatternId } from './catalog';
import type { FireworkDesign, LayerDefinition, StarDefinition } from './schema';
import { CHARACTER_PATTERNS, CHARACTER_STYLE, characterPattern, isCharacterPattern } from './characterCatalog';
import type { CharacterDimension, CharacterId, CharacterPart } from './characterCatalog';
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
  if (isCharacterPattern(pattern)) {
    const { dimension, part } = CHARACTER_PATTERNS[pattern];
    layer.spread = CHARACTER_STYLE.spread;
    layer.rotation = dimension === '3d' ? CHARACTER_STYLE.rotation3d : 0;
    layer.star = { body: { form: 'sphere', scale: CHARACTER_STYLE.starScale },
      material: { base: 'silver', finish: null, transition: STAR_PRESETS.silver.material.transition, trail: CHARACTER_STYLE.trail },
      lifetimeScale: CHARACTER_STYLE.lifetimeScale, brightness: CHARACTER_STYLE.parts[part].brightness };
  }
  return layer;
}

export function createCharacterDesign(character: CharacterId, dimension: CharacterDimension, label: (part: CharacterPart | 'halo') => string): FireworkDesign {
  const parts: CharacterPart[] = dimension === '3d' ? ['outline', 'fill', 'details', 'shell'] : ['outline', 'fill', 'details'];
  const layers = parts.map(part => createLayer(characterPattern(character, dimension, part), `layer-${part}`, label(part)));
  const halo = createLayer('ring', 'layer-halo', label('halo'));
  halo.count = CHARACTER_STYLE.haloCount;
  halo.spread = CHARACTER_STYLE.haloSpread;
  halo.rotation = layers[0].rotation;
  // Match the portrait's expansion so its border remains outside the silhouette.
  halo.star = structuredClone(layers[0].star);
  halo.star.brightness = CHARACTER_STYLE.haloBrightness;
  layers.push(halo);
  return { flight: { height: SCENE.burstHeight, riseSeconds: SCENE.launchDuration }, layers };
}
export function createDesign(pattern: PatternId, name: string): FireworkDesign {
  return { flight: { height: SCENE.burstHeight, riseSeconds: SCENE.launchDuration }, layers: [createLayer(pattern, 'layer-main', name)] };
}

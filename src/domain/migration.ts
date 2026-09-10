import { FORMAT_VERSION, MODEL_VERSION, SCENE, TICK_RATE } from './catalog';
import { hashSeed } from './math';
import { LegacyShowSchema } from './legacySchema';
import { ShowSchema } from './schema';
import type { FireworkDesign, ShowDocument } from './schema';
export class DocumentError extends Error {
  constructor(public code: 'invalidJson' | 'unsupportedFormat' | 'invalidDocument') { super(code); }
}

export function parseShow(source: string): ShowDocument {
  let input: unknown;
  try { input = JSON.parse(source); } catch { throw new DocumentError('invalidJson'); }
  if (!input || typeof input !== 'object' || !('formatVersion' in input)) throw new DocumentError('unsupportedFormat');
  if (input.formatVersion === 'star-studio/1') {
    const old = LegacyShowSchema.safeParse(input);
    if (!old.success) throw new DocumentError('invalidDocument');
    const legacy = old.data;
    const designFor = (effectId: string, seed?: string): FireworkDesign => {
      const effect = legacy.effects[effectId];
      const star = legacy.stars[effect.starId];
      return { flight: { height: SCENE.burstHeight, riseSeconds: SCENE.launchDuration }, layers: [{
        id: 'layer-main', name: effect.name, enabled: true, pattern: effect.pattern,
        count: effect.count, spread: effect.spread, rotation: effect.rotation, seed: seed ?? effect.seed,
        delaySeconds: 0, burstStrength: SCENE.defaultBurst, burstSeconds: SCENE.defaultBurstTime, dragScale: SCENE.defaultDrag,
        star: { body: { ...star.body }, material: { ...star.material }, lifetimeScale: 1, brightness: 1 },
      }] };
    };
    input = { formatVersion: FORMAT_VERSION, modelVersion: MODEL_VERSION, tickRate: TICK_RATE, name: legacy.name,
      fireworks: Object.fromEntries(Object.values(legacy.effects).map(effect => [effect.id, { id: effect.id, name: effect.name, design: designFor(effect.id) }])),
      launchers: legacy.launchers,
      cues: Object.fromEntries(Object.values(legacy.cues).map(cue => [cue.id, { id: cue.id, name: legacy.effects[cue.effectId].name, launcherId: cue.launcherId, atTick: cue.atTick, design: designFor(cue.effectId, String(hashSeed(`${cue.id}/${cue.seed}/${legacy.effects[cue.effectId].seed}`))) }])),
    };
  } else if (input.formatVersion !== FORMAT_VERSION || !('modelVersion' in input) || input.modelVersion !== MODEL_VERSION) throw new DocumentError('unsupportedFormat');
  const result = ShowSchema.safeParse(input);
  if (!result.success) throw new DocumentError('invalidDocument');
  return result.data;
}

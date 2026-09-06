import { FORMAT_VERSION, LIMITS, MODEL_VERSION, TICK_RATE } from './catalog';
import type { MaterialId, PatternId } from './catalog';
import { createLayer } from './presets';
import { ShowSchema } from './schema';
import type { Cue, FireworkDesign, FireworkDefinition, LayerDefinition, LauncherDefinition, ShowDocument } from './schema';
import { designDuration } from './timing';

export const FESTIVAL = { launcherCount: 20, durationSeconds: 60, seed: 'festival-one-minute', rows: 2, rowDepth: .12 } as const;
interface LayerSpec {
  pattern: PatternId; color: MaterialId; finish?: MaterialId; count?: number;
  spread?: number; trail?: number; life?: number; delay?: number; size?: number;
}
// Every use is copied into an independently editable design. No live references to presets are saved.
const DESIGNS = {
  gold: [
    { pattern: 'chrysanthemum', color: 'amber', finish: 'silver', count: 144, trail: .65, life: .85 },
    { pattern: 'ring', color: 'silver', count: 72, spread: .5, delay: .14, life: .8 },
  ],
  ruby: [{ pattern: 'peony', color: 'ruby', finish: 'silver', count: 220, trail: .8 }],
  jade: [{ pattern: 'peony', color: 'jade', finish: 'azure', count: 200, spread: .85 }],
  halo: [
    { pattern: 'ring', color: 'azure', finish: 'silver', count: 144 },
    { pattern: 'ring', color: 'ruby', count: 96, spread: .6, delay: .16 },
  ],
  willow: [{ pattern: 'willow', color: 'amber', finish: 'silver', count: 96, trail: .5, life: .8, spread: .85 }],
  crossette: [{ pattern: 'crossette', color: 'jade', finish: 'silver', count: 12, trail: .65 }],
  heart: [{ pattern: 'heart', color: 'ruby', count: 180, spread: .9 }],
  cat: [{ pattern: 'cat', color: 'silver', finish: 'azure', count: 260, spread: .9, size: .85 }],
  apple: [{ pattern: 'apple', color: 'jade', finish: 'ruby', count: 210, spread: .9 }],
  cup: [{ pattern: 'cup', color: 'amber', finish: 'silver', count: 220, spread: .9 }],
  finale: [
    { pattern: 'chrysanthemum', color: 'amber', finish: 'silver', count: 96, spread: .65, trail: .4, life: .8 },
    { pattern: 'peony', color: 'ruby', finish: 'silver', count: 88, spread: LIMITS.spread.min, life: .8, delay: .18 },
  ],
} as const satisfies Record<string, readonly LayerSpec[]>;
export type FestivalDesignId = keyof typeof DESIGNS;
interface FestivalLabels { show: string; design: (id: FestivalDesignId) => string; pattern: (id: PatternId) => string; launcher: (index: number) => string }
const FLIGHT = { height: 280, riseSeconds: 1.15 } as const;
const MOTION = { burstStrength: 4.2, burstSeconds: .12, dragScale: 1.2, brightness: 1.2, transition: .72 } as const;
const FINALE_COLORS: readonly MaterialId[] = ['amber', 'azure', 'ruby', 'jade', 'silver'];
const SCORE = {
  opening: { start: .15, interval: .24, height: 220, arch: 95, designs: ['gold', 'ruby', 'halo', 'jade'] },
  fans: { start: 6, interval: .37, height: 230, heightStep: 13 },
  shapes: { start: 12, interval: 4.5, launchers: [2, 17], height: 330, echoDelay: .25, designs: ['heart', 'cat', 'apple', 'cup'] },
  support: { launchers: [6, 8, 10, 12], delay: 1.8, interval: .18, height: 145, rise: .75, spreadScale: .6, lifeScale: .75 },
  chase: { designs: ['ruby', 'halo', 'gold', 'jade', 'crossette'], reverseOffset: 2,
    forward: { start: 30, interval: .27, height: 210, levels: 4, heightStep: 48, rise: .95 },
    reverse: { start: 36, interval: .24, height: 240, levels: 3, heightStep: 52, rise: 1.05 } },
  canopy: { start: 42, interval: .07, launcherStep: 2, height: 350, levels: 3, heightStep: 25, rise: 1.3 },
  volleys: {
    rings: { start: 46.5, interval: .045, height: 200, levels: 4, heightStep: 45, rise: .85 },
    gold: { start: 50, interval: .14, height: 220, levels: 5, heightStep: 45, rise: .85 },
    color: { start: 53, interval: .025, height: 235, levels: 5, heightStep: 40, rise: .8 },
  },
  crown: { height: 465, rise: 1.25, spreadScale: 1.35, lifeScale: 1.15 },
} as const;
function makeLayer(spec: LayerSpec, id: string, name: string): LayerDefinition {
  const layer = createLayer(spec.pattern, id, name);
  return {
    ...layer, count: spec.count ?? layer.count, spread: spec.spread ?? layer.spread,
    delaySeconds: spec.delay ?? 0, burstStrength: MOTION.burstStrength, burstSeconds: MOTION.burstSeconds, dragScale: MOTION.dragScale,
    star: { body: { ...layer.star.body, scale: spec.size ?? 1 }, brightness: MOTION.brightness, lifetimeScale: spec.life ?? 1,
      material: { base: spec.color, finish: spec.finish ?? null, transition: MOTION.transition, trail: spec.trail ?? 1 } },
  };
}
export function createFestivalShow(labels: FestivalLabels): ShowDocument {
  const fireworks: Record<string, FireworkDefinition> = {};
  const launchers: Record<string, LauncherDefinition> = {};
  const cues: Record<string, Cue> = {};
  const launcherIds = Array.from({ length: FESTIVAL.launcherCount }, (_, index) => `festival-launcher-${String(index + 1).padStart(2, '0')}`);
  launcherIds.forEach((id, index) => {
    launchers[id] = { id, name: labels.launcher(index + 1), x: LIMITS.stage.min + (LIMITS.stage.max - LIMITS.stage.min) * index / (launcherIds.length - 1), z: (index % FESTIVAL.rows) * FESTIVAL.rowDepth };
  });
  for (const [key, specs] of Object.entries(DESIGNS)) {
    const id = `festival-${key}`;
    fireworks[id] = { id, name: labels.design(key as FestivalDesignId), design: { flight: { ...FLIGHT }, layers: specs.map((spec, index) => makeLayer(spec, `layer-${index + 1}`, labels.pattern(spec.pattern))) } };
  }
  let cueIndex = 0;
  const add = (key: FestivalDesignId, launcher: number, at: number, height: number, rise = FLIGHT.riseSeconds as number, customize?: (design: FireworkDesign) => void) => {
    const source = fireworks[`festival-${key}`];
    const id = `festival-cue-${String(++cueIndex).padStart(3, '0')}`;
    const design = structuredClone(source.design);
    design.flight = { height, riseSeconds: rise };
    design.layers.forEach(layer => { layer.seed = `${FESTIVAL.seed}/${id}/${layer.id}`; });
    customize?.(design);
    cues[id] = { id, name: source.name, launcherId: launcherIds[launcher], atTick: Math.round(at * TICK_RATE), design };
  };
  const count = launcherIds.length;
  const center = (count - 1) / 2;
  // Opening: a full-width sweep, then mirrored fans. Heights trace an arch.
  const { opening, fans } = SCORE;
  for (let i = 0; i < count; i++) add(opening.designs[i % opening.designs.length], i, opening.start + i * opening.interval, opening.height + opening.arch * Math.sin(i / (count - 1) * Math.PI));
  for (let i = 0; i < count / 2; i++) {
    const at = fans.start + i * fans.interval, height = fans.height + i * fans.heightStep;
    add(i % 2 ? 'crossette' : 'gold', i, at, height);
    add(i % 2 ? 'halo' : 'ruby', count - 1 - i, at, height);
  }
  // Keep each outline's moment clear: two wide-set silhouettes over a low supporting wave.
  const { shapes: showcase, support } = SCORE;
  showcase.designs.forEach((shape, index) => {
    const at = showcase.start + index * showcase.interval;
    showcase.launchers.forEach((launcher, index) => add(shape, launcher, at + index * showcase.echoDelay, showcase.height));
    support.launchers.forEach((launcher, index) => add(index % 2 ? 'crossette' : 'jade', launcher, at + support.delay + index * support.interval, support.height, support.rise, design => {
      design.layers.forEach(layer => { layer.spread *= support.spreadScale; layer.star.lifetimeScale *= support.lifeScale; });
    }));
  });
  // Counter-running chases visit every launcher twice, alternating heights and color.
  const { chase } = SCORE;
  const { forward, reverse } = chase;
  for (let i = 0; i < count; i++) {
    add(chase.designs[i % chase.designs.length], i, forward.start + i * forward.interval, forward.height + (i % forward.levels) * forward.heightStep, forward.rise);
    add(chase.designs[(i + chase.reverseOffset) % chase.designs.length], count - 1 - i, reverse.start + i * reverse.interval, reverse.height + (i % reverse.levels) * reverse.heightStep, reverse.rise);
  }
  // Gold canopy, then three increasingly dense salvos and a high central crown.
  const { canopy, volleys, crown: crownSpec } = SCORE;
  for (let i = 0; i < count; i += canopy.launcherStep) add('willow', i, canopy.start + i * canopy.interval, canopy.height + (i % canopy.levels) * canopy.heightStep, canopy.rise);
  const { rings, gold, color } = volleys;
  for (let i = 0; i < count; i++) {
    add(i % 2 ? 'ruby' : 'halo', i, rings.start + Math.abs(i - center) * rings.interval, rings.height + (i % rings.levels) * rings.heightStep, rings.rise);
    add('finale', i, gold.start + i % FESTIVAL.rows * gold.interval, gold.height + (i % gold.levels) * gold.heightStep, gold.rise);
    add('finale', i, color.start + Math.abs(i - center) * color.interval, color.height + (i % color.levels) * color.heightStep, color.rise, design => {
      design.layers[0].star.material.base = FINALE_COLORS[i % FINALE_COLORS.length];
      design.layers[1].star.material.base = 'silver';
    });
  }
  // Tail completion, rather than the final trigger, lands on the one-minute boundary.
  add('gold', Math.floor(count / 2), 0, crownSpec.height, crownSpec.rise, design => {
    design.layers.forEach(layer => { layer.spread *= crownSpec.spreadScale; layer.star.lifetimeScale *= crownSpec.lifeScale; });
  });
  const crown = cues[`festival-cue-${String(cueIndex).padStart(3, '0')}`];
  crown.atTick = Math.floor((FESTIVAL.durationSeconds - designDuration(crown.design)) * TICK_RATE);
  return ShowSchema.parse({ formatVersion: FORMAT_VERSION, modelVersion: MODEL_VERSION, tickRate: TICK_RATE, name: labels.show, fireworks, launchers, cues });
}

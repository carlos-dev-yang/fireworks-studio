import { FORMAT_VERSION, MODEL_VERSION, TICK_RATE } from './catalog';
import type { PatternId } from './catalog';
import { createDesign } from './presets';
import { ShowSchema } from './schema';
import type { ShowDocument } from './schema';
export function createInitialShow(labels: { show: string; pattern: (id: PatternId) => string; launcher: (index: number) => string }): ShowDocument {
  const patterns: PatternId[] = ['chrysanthemum', 'peony', 'willow', 'ring', 'crossette'];
  const fireworks = Object.fromEntries(patterns.map((pattern, index) => {
    const id = 'firework-' + pattern;
    return [id, { id, name: String(index + 1).padStart(2, '0') + ' · ' + labels.pattern(pattern), design: createDesign(pattern, labels.pattern(pattern)) }];
  }));
  const launchers = Object.fromEntries(['left', 'center', 'right'].map((id, index) => [id, { id, name: labels.launcher(index + 1), x: (index - 1) * 0.65, z: 0 }]));
  const cueSpecs = [['peony', 'left', 1], ['chrysanthemum', 'center', 4], ['willow', 'right', 7], ['ring', 'left', 10], ['crossette', 'center', 13]] as const;
  const cues = Object.fromEntries(cueSpecs.map(([pattern, launcherId, time]) => {
    const id = 'cue-' + pattern;
    const firework = fireworks['firework-' + pattern];
    return [id, { id, name: firework.name, launcherId, atTick: time * TICK_RATE, design: structuredClone(firework.design) }];
  }));
  return ShowSchema.parse({ formatVersion: FORMAT_VERSION, modelVersion: MODEL_VERSION, tickRate: TICK_RATE, name: labels.show, fireworks, launchers, cues });
}

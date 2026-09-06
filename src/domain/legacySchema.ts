import { z } from 'zod';
import { LIMITS as CURRENT_LIMITS, MATERIALS, PATTERNS, TICK_RATE } from './catalog';
const FORMAT_VERSION = 'star-studio/1';
const MODEL_VERSION = 'visual-star/1';
const LIMITS = { ...CURRENT_LIMITS, stars: 32, effects: 16, launchers: 8, cues: 24 };
import type { MaterialId, PatternId } from './catalog';

const id = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const name = z.string().trim().min(1).max(40);
const scalar = (min: number, max: number) => z.number().finite().min(min).max(max);
const material = z.enum(Object.keys(MATERIALS) as MaterialId[]);
const pattern = z.enum(Object.keys(PATTERNS) as PatternId[]);

export const StarSchema = z.strictObject({
  id, name,
  body: z.strictObject({ form: z.literal('sphere'), scale: scalar(LIMITS.size.min, LIMITS.size.max) }),
  material: z.strictObject({
    base: material, finish: material.nullable(),
    transition: scalar(LIMITS.transition.min, LIMITS.transition.max),
    trail: scalar(LIMITS.trail.min, LIMITS.trail.max),
  }),
});
export const EffectSchema = z.strictObject({
  id, name, pattern, starId: id,
  count: scalar(LIMITS.count.min, LIMITS.count.max).int(),
  spread: scalar(LIMITS.spread.min, LIMITS.spread.max),
  rotation: scalar(-180, 180), seed: z.string().min(1).max(80),
});
export const LauncherSchema = z.strictObject({ id, name, x: scalar(-1, 1), z: scalar(-1, 1) });
export const CueSchema = z.strictObject({
  id, effectId: id, launcherId: id,
  atTick: scalar(0, LIMITS.cueSeconds * TICK_RATE).int(), seed: z.string().min(1).max(80),
});
const entityMap = <T extends z.ZodType>(schema: T, max: number) => z.record(id, schema).refine(
  entries => Object.keys(entries).length <= max, `최대 ${max}개까지 사용할 수 있습니다.`,
);

export const LegacyShowSchema = z.strictObject({
  formatVersion: z.literal(FORMAT_VERSION), modelVersion: z.literal(MODEL_VERSION),
  tickRate: z.literal(TICK_RATE), name,
  stars: entityMap(StarSchema, LIMITS.stars),
  effects: entityMap(EffectSchema, LIMITS.effects),
  launchers: entityMap(LauncherSchema, LIMITS.launchers),
  cues: entityMap(CueSchema, LIMITS.cues),
}).superRefine((show, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
  for (const key of ['stars', 'effects', 'launchers'] as const) {
    if (!Object.keys(show[key]).length) issue([key], '한 개 이상 필요합니다.');
  }
  for (const group of ['stars', 'effects', 'launchers', 'cues'] as const) {
    for (const [key, value] of Object.entries(show[group])) {
      if (key !== value.id) issue([group, key, 'id'], '키와 개체 ID가 일치해야 합니다.');
    }
  }
  for (const effect of Object.values(show.effects)) {
    if (!Object.hasOwn(show.stars, effect.starId)) issue(['effects', effect.id, 'starId'], '참조한 발광체가 없습니다.');
    if (effect.count > PATTERNS[effect.pattern].maxCount) issue(['effects', effect.id, 'count'], '이 효과의 개수 범위를 초과했습니다.');
  }
  for (const cue of Object.values(show.cues)) {
    if (!Object.hasOwn(show.effects, cue.effectId)) issue(['cues', cue.id, 'effectId'], '참조한 효과가 없습니다.');
    if (!Object.hasOwn(show.launchers, cue.launcherId)) issue(['cues', cue.id, 'launcherId'], '참조한 발사대가 없습니다.');
  }
});

export type StarDefinition = z.infer<typeof StarSchema>;
export type EffectDefinition = z.infer<typeof EffectSchema>;
export type LauncherDefinition = z.infer<typeof LauncherSchema>;
export type Cue = z.infer<typeof CueSchema>;
export type ShowDocument = z.infer<typeof LegacyShowSchema>;

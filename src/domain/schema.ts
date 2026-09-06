import { z } from 'zod';
import { FORMAT_VERSION, LIMITS, MATERIALS, MODEL_VERSION, PATTERNS, TICK_RATE } from './catalog';
import type { MaterialId, PatternId } from './catalog';
const id = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/).refine(value => !['__proto__', 'constructor', 'prototype'].includes(value));
const name = z.string().trim().min(1).max(LIMITS.nameLength);
const scalar = (min: number, max: number) => z.number().finite().min(min).max(max);
const range = (bounds: { min: number; max: number }) => scalar(bounds.min, bounds.max);
export const StarSchema = z.strictObject({
  body: z.strictObject({ form: z.literal('sphere'), scale: range(LIMITS.size) }),
  material: z.strictObject({ base: z.enum(Object.keys(MATERIALS) as MaterialId[]), finish: z.enum(Object.keys(MATERIALS) as MaterialId[]).nullable(), transition: range(LIMITS.transition), trail: range(LIMITS.trail) }),
  lifetimeScale: range(LIMITS.lifetime), brightness: range(LIMITS.brightness),
});
export const LayerSchema = z.strictObject({
  id, name, enabled: z.boolean(), pattern: z.enum(Object.keys(PATTERNS) as PatternId[]), star: StarSchema,
  count: range(LIMITS.count).int(), spread: range(LIMITS.spread), rotation: range(LIMITS.rotation),
  delaySeconds: range(LIMITS.delay), burstStrength: range(LIMITS.burst), burstSeconds: range(LIMITS.burstTime), dragScale: range(LIMITS.drag),
  seed: z.string().min(1).max(80),
}).refine(layer => layer.count <= PATTERNS[layer.pattern].maxCount, { path: ['count'], message: 'count' });
export const FlightSchema = z.strictObject({ height: range(LIMITS.height), riseSeconds: range(LIMITS.rise) });
export const DesignSchema = z.strictObject({ flight: FlightSchema, layers: z.array(LayerSchema).min(1).max(LIMITS.layers) })
  .refine(design => new Set(design.layers.map(layer => layer.id)).size === design.layers.length, { message: 'duplicate' });
export const FireworkSchema = z.strictObject({ id, name, design: DesignSchema });
export const LauncherSchema = z.strictObject({ id, name, x: range(LIMITS.stage), z: range(LIMITS.stage) });
export const CueSchema = z.strictObject({ id, name, launcherId: id, atTick: scalar(0, LIMITS.cueSeconds * TICK_RATE).int(), design: DesignSchema });
const entityMap = <T extends z.ZodType>(schema: T, max: number) => z.record(id, schema).refine(entries => Object.keys(entries).length <= max, 'limit');
export const ShowSchema = z.strictObject({
  formatVersion: z.literal(FORMAT_VERSION), modelVersion: z.literal(MODEL_VERSION), tickRate: z.literal(TICK_RATE), name,
  fireworks: entityMap(FireworkSchema, LIMITS.fireworks), launchers: entityMap(LauncherSchema, LIMITS.launchers), cues: entityMap(CueSchema, LIMITS.cues),
}).superRefine((show, ctx) => {
  if (!Object.keys(show.launchers).length) ctx.addIssue({ code: 'custom', path: ['launchers'], message: 'empty' });
  for (const group of ['fireworks', 'launchers', 'cues'] as const) for (const [key, entity] of Object.entries(show[group])) {
    if (key !== entity.id) ctx.addIssue({ code: 'custom', path: [group, key], message: 'id' });
  }
  for (const cue of Object.values(show.cues)) if (!Object.hasOwn(show.launchers, cue.launcherId)) ctx.addIssue({ code: 'custom', path: ['cues', cue.id], message: 'reference' });
});
export type StarDefinition = z.infer<typeof StarSchema>;
export type LayerDefinition = z.infer<typeof LayerSchema>;
export type Flight = z.infer<typeof FlightSchema>;
export type FireworkDesign = z.infer<typeof DesignSchema>;
export type FireworkDefinition = z.infer<typeof FireworkSchema>;
export type LauncherDefinition = z.infer<typeof LauncherSchema>;
export type Cue = z.infer<typeof CueSchema>;
export type ShowDocument = z.infer<typeof ShowSchema>;
export type DesignOwner = { kind: 'firework' | 'cue'; id: string };
export const getDesign = (document: ShowDocument, owner: DesignOwner) => owner.kind === 'firework' ? document.fireworks[owner.id]?.design : document.cues[owner.id]?.design;
export const getOwnerName = (document: ShowDocument, owner: DesignOwner) => owner.kind === 'firework' ? document.fireworks[owner.id]?.name : document.cues[owner.id]?.name;

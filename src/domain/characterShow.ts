import { FORMAT_VERSION, MODEL_VERSION, TICK_RATE } from './catalog';
import { CHARACTER_DIMENSIONS, CHARACTER_IDS } from './characterCatalog';
import type { CharacterDimension, CharacterId, CharacterPart } from './characterCatalog';
import { createCharacterDesign } from './presets';
import { ShowSchema } from './schema';
import type { Cue, FireworkDefinition, ShowDocument } from './schema';
import { designDuration } from './timing';

export const CHARACTER_SHOW = {
  cueCount: CHARACTER_IDS.length * CHARACTER_DIMENSIONS.length,
  firstLaunchSeconds: 0.5, quietSeconds: 0.65, chapterPauseSeconds: 1.5,
  launcherId: 'character-stage',
} as const;
interface CharacterShowLabels {
  show: string; launcher: string;
  firework: (character: CharacterId, dimension: CharacterDimension) => string;
  layer: (part: CharacterPart | 'halo') => string;
}

export function createCharacterShow(labels: CharacterShowLabels): ShowDocument {
  const fireworks: Record<string, FireworkDefinition> = {};
  const cues: Record<string, Cue> = {};
  let nextTick = Math.round(CHARACTER_SHOW.firstLaunchSeconds * TICK_RATE);
  for (const [chapter, dimension] of CHARACTER_DIMENSIONS.entries()) {
    if (chapter > 0) nextTick += Math.round(CHARACTER_SHOW.chapterPauseSeconds * TICK_RATE);
    for (const character of CHARACTER_IDS) {
      const id = `character-${character}-${dimension}`;
      const design = createCharacterDesign(character, dimension, labels.layer);
      const name = labels.firework(character, dimension);
      fireworks[id] = { id, name, design };
      const cueId = `cue-${id}`;
      const cueDesign = structuredClone(design);
      cues[cueId] = { id: cueId, name, launcherId: CHARACTER_SHOW.launcherId, atTick: nextTick, design: cueDesign };
      // Finish the complete portrait and its afterglow before launching the next one.
      // Computing this from each copied design keeps future preset edits in sync.
      nextTick += Math.ceil((designDuration(cueDesign) + CHARACTER_SHOW.quietSeconds) * TICK_RATE);
    }
  }
  return ShowSchema.parse({
    formatVersion: FORMAT_VERSION, modelVersion: MODEL_VERSION, tickRate: TICK_RATE,
    name: labels.show, fireworks, cues,
    launchers: { [CHARACTER_SHOW.launcherId]: { id: CHARACTER_SHOW.launcherId, name: labels.launcher, x: 0, z: 0 } },
  });
}

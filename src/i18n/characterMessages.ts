import { CHARACTER_PATTERNS } from '../domain/characterCatalog';
import type { CharacterId, CharacterPart, CharacterPatternId } from '../domain/characterCatalog';

export function characterMessages(names: Record<CharacterId, string>, parts: Record<CharacterPart, string>) {
  const namesByKey = Object.fromEntries(Object.entries(names).map(([id, name]) => [`character.${id}`, name])) as Record<`character.${CharacterId}`, string>;
  const partsByKey = Object.fromEntries(Object.entries(parts).map(([id, name]) => [`character.part.${id}`, name])) as Record<`character.part.${CharacterPart}`, string>;
  const patterns = Object.fromEntries(Object.entries(CHARACTER_PATTERNS).map(([id, { character, dimension, part }]) => [
    `preset.${id}`, `${names[character]} ${dimension.toUpperCase()} · ${parts[part]}`,
  ])) as Record<`preset.${CharacterPatternId}`, string>;
  return { ...namesByKey, ...partsByKey, ...patterns };
}

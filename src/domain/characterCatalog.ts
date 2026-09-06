// Artwork presets use the existing pattern/layer contract, including JSON copies.
export const CHARACTER_IDS = ['heartHat', 'helloKitty', 'kuromi', 'myMelody', 'pompompurin', 'cinnamoroll', 'pochacco'] as const;
export type CharacterId = typeof CHARACTER_IDS[number];
export const CHARACTER_DIMENSIONS = ['2d', '3d'] as const;
export type CharacterDimension = typeof CHARACTER_DIMENSIONS[number];
export const CHARACTER_PARTS = ['outline', 'fill', 'details', 'shell'] as const;
export type CharacterPart = typeof CHARACTER_PARTS[number];
export type CharacterPatternId = `${CharacterId}-${CharacterDimension}-${CharacterPart}`;

export const CHARACTER_STYLE = {
  depth: 0.48, edgeDepth: 0.035, edgeWidth: 1.5,
  rotation3d: -22, starScale: 0.6, lifetimeScale: 1.4,
  spread: 1.18, trail: 0.45, previewAge: 1.85,
  headHeat: 0.015, fillJitter: 0.8, haloCount: 120, haloSpread: 1.52, haloBrightness: 0.55,
  fillColorWeight: 0.9, detailColorWeight: 0.7,
  parts: {
    outline: { count: 512, maxCount: 1024, brightness: 1.1 },
    fill: { count: 1792, maxCount: 4096, brightness: 0.62 },
    details: { count: 768, maxCount: 2048, brightness: 1 },
    shell: { count: 1024, maxCount: 2048, brightness: 0.2 },
  },
} as const;

export function characterPattern(character: CharacterId, dimension: CharacterDimension, part: CharacterPart = 'outline'): CharacterPatternId {
  return `${character}-${dimension}-${part}`;
}
const characterMotion = { speed: 65, gravity: 5, dragFactor: 1, lifeFactor: 1.25, tailFactor: 0.07, previewAge: CHARACTER_STYLE.previewAge };
const entries = CHARACTER_IDS.flatMap(character => CHARACTER_DIMENSIONS.flatMap(dimension => CHARACTER_PARTS.map(part => [
  characterPattern(character, dimension, part),
  { ...characterMotion, ...CHARACTER_STYLE.parts[part], character, dimension, part },
] as const)));
export const CHARACTER_PATTERNS = Object.fromEntries(entries) as Record<CharacterPatternId, typeof entries[number][1]>;
export function isCharacterPattern(pattern: string): pattern is CharacterPatternId { return Object.hasOwn(CHARACTER_PATTERNS, pattern); }

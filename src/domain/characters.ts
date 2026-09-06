import artwork from './character-art.json';
import { CHARACTER_PATTERNS, CHARACTER_STYLE } from './characterCatalog';
import type { CharacterId, CharacterPatternId } from './characterCatalog';
import { randomSource } from './math';
import type { Vec3 } from './math';

interface Pixel { x: number; y: number; color: number; depth: number }
interface CharacterGeometry {
  width: number; height: number; scale: number; palette: string[];
  outline: Pixel[]; fill: Pixel[]; details: Pixel[]; shell: Pixel[];
}
export interface CharacterPoint { position: Vec3; color: string }
const geometries = new Map<CharacterId, CharacterGeometry>();
const iconCache = new Map<CharacterId, { color: string; path: string }[]>();
const DIAGONAL = Math.SQRT2;

function geometry(character: CharacterId): CharacterGeometry {
  const cached = geometries.get(character);
  if (cached) return cached;
  const { rows, palette } = artwork[character];
  const height = rows.length, width = rows[0].length;
  const colorAt = (x: number, y: number) => rows[y]?.[x] ?? '.';
  // Distance to the silhouette inflates the portrait into a rounded volume. Narrow ears
  // stay thin while cheeks, the hat and the body acquire independent curved surfaces.
  const distances = new Float32Array(width * height);
  const distanceAt = (x: number, y: number) => x < 0 || x >= width || y < 0 || y >= height ? 0 : distances[y * width + x];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (colorAt(x, y) === '.') continue;
    distances[y * width + x] = Math.min(distanceAt(x - 1, y) + 1, distanceAt(x, y - 1) + 1, distanceAt(x - 1, y - 1) + DIAGONAL, distanceAt(x + 1, y - 1) + DIAGONAL);
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    if (colorAt(x, y) === '.') continue;
    const index = y * width + x;
    distances[index] = Math.min(distances[index], distanceAt(x + 1, y) + 1, distanceAt(x, y + 1) + 1, distanceAt(x + 1, y + 1) + DIAGONAL, distanceAt(x - 1, y + 1) + DIAGONAL);
  }
  const maxDepth = Math.max(...distances);
  const result: CharacterGeometry = { width, height, scale: 2 / Math.max(width, height), palette, outline: [], fill: [], details: [], shell: [] };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const symbol = colorAt(x, y);
    if (symbol === '.') continue;
    const distance = distances[y * width + x];
    const pixel = { x, y, color: Number.parseInt(symbol, 36), depth: CHARACTER_STYLE.edgeDepth + CHARACTER_STYLE.depth * Math.sqrt(Math.max(0, distance - 1) / maxDepth) };
    result.shell.push(pixel);
    if (distance <= CHARACTER_STYLE.edgeWidth) result.outline.push(pixel);
    else if ([colorAt(x - 1, y), colorAt(x + 1, y), colorAt(x, y - 1), colorAt(x, y + 1)].some(neighbor => neighbor !== symbol)) result.details.push(pixel);
    else result.fill.push(pixel);
  }
  geometries.set(character, result);
  return result;
}

// Stratify by color first so small eyes, a nose, ribbons and highlights survive changes
// in count. Within each color, scanline stratification spreads samples over the whole mask.
function allocatePixels(pixels: Pixel[], count: number, colorWeight: number, seed: string): Pixel[] {
  const colors = new Map<number, Pixel[]>();
  for (const pixel of pixels) {
    const group = colors.get(pixel.color) ?? [];
    if (!colors.has(pixel.color)) colors.set(pixel.color, group);
    group.push(pixel);
  }
  const groups = [...colors.values()];
  const weights = groups.map(group => group.length ** colorWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let allocated = 0, cumulative = 0;
  return groups.flatMap((group, index) => {
    cumulative += weights[index];
    const end = index === groups.length - 1 ? count : Math.round(count * cumulative / total);
    const amount = end - allocated;
    allocated = end;
    const random = randomSource(`${seed}/color/${group[0].color}`);
    return Array.from({ length: amount }, (_, i) => group[Math.min(group.length - 1, Math.floor((i + random()) * group.length / amount))]);
  });
}

export function sampleCharacter(pattern: CharacterPatternId, count: number, seed: string): CharacterPoint[] {
  const { character, dimension, part } = CHARACTER_PATTERNS[pattern];
  const art = geometry(character);
  const pixels = allocatePixels(art[part].length ? art[part] : art.shell, count, part === 'fill' || part === 'shell' ? CHARACTER_STYLE.fillColorWeight : CHARACTER_STYLE.detailColorWeight, seed);
  return pixels.map((pixel, index) => {
    const random = randomSource(`${seed}/art/${index}`);
    const jitter = part === 'fill' || part === 'shell' ? CHARACTER_STYLE.fillJitter : 0;
    const x = (pixel.x + 0.5 + (random() - 0.5) * jitter - art.width / 2) * art.scale;
    const y = (art.height / 2 - pixel.y - 0.5 - (random() - 0.5) * jitter) * art.scale;
    // A back surface plus internal depth samples makes this a volume, not stacked planes.
    const depth = part === 'shell' ? (index % 3 === 0 ? -pixel.depth : (random() * 2 - 1) * pixel.depth) : pixel.depth;
    return { position: [x, y, dimension === '3d' ? depth : 0], color: art.palette[pixel.color] };
  });
}

export function characterIcon(character: CharacterId) {
  const cached = iconCache.get(character);
  if (cached) return cached;
  const { rows, palette } = artwork[character];
  const height = rows.length, width = rows[0].length;
  const scale = 32 / Math.max(width, height), left = (40 - width * scale) / 2, top = (40 - height * scale) / 2;
  const paths = palette.map(color => ({ color, path: '' }));
  const number = (value: number) => Number(value.toFixed(2));
  // Horizontal runs keep icons compact and use exactly the same art as the fireworks.
  rows.forEach((row, y) => {
    for (let x = 0; x < width;) {
      const start = x, symbol = row[x];
      while (x < width && row[x] === symbol) x++;
      if (symbol !== '.') paths[Number.parseInt(symbol, 36)].path += `M${number(left + start * scale)} ${number(top + y * scale)}h${number((x - start) * scale)}v${number(scale)}h${number((start - x) * scale)}z`;
    }
  });
  const result = paths.filter(item => item.path);
  iconCache.set(character, result);
  return result;
}

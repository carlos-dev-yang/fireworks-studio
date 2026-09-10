import { randomSource } from './math';
import type { Vec3 } from './math';
import { getArtworkAsset } from '../storage/library';

export const IMAGE_PARTS = ['outline', 'fill', 'details', 'shell'] as const;
export type ImagePart = typeof IMAGE_PARTS[number];
export interface ArtworkRef { assetId: string; dimension: '2d' | '3d'; part: ImagePart }

interface Pixel { x: number; y: number; color: number; depth: number }
interface ArtworkGeometry {
  width: number;
  height: number;
  palette: string[];
  outline: Pixel[];
  fill: Pixel[];
  details: Pixel[];
  shell: Pixel[];
}

const DIAGONAL = Math.SQRT2;
const EDGE_WIDTH = 1.5;
const EDGE_DEPTH = 0.035;
const VOLUME_DEPTH = 0.48;
const geometryCache = new Map<string, ArtworkGeometry>();

function colorBrightness(color: string) {
  return Number.parseInt(color.slice(1, 3), 16) + Number.parseInt(color.slice(3, 5), 16) + Number.parseInt(color.slice(5, 7), 16);
}

/** Builds all layers from the uploaded pixels; no asset-specific masks are retained. */
function geometry(rows: readonly string[], palette: readonly string[]): ArtworkGeometry | null {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (!height || !width || !palette.length) return null;

  const symbolAt = (x: number, y: number) => rows[y]?.[x] ?? '.';
  const opaqueAt = (x: number, y: number) => symbolAt(x, y) !== '.';
  const distances = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (opaqueAt(x, y)) distances[y * width + x] = Number.POSITIVE_INFINITY;
  }
  const distanceAt = (x: number, y: number) => x < 0 || x >= width || y < 0 || y >= height ? 0 : distances[y * width + x];

  // A two-pass chamfer distance transform measures each point from the silhouette.
  // It gives wide regions a rounder volume while keeping narrow marks thin.
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!opaqueAt(x, y)) continue;
    const index = y * width + x;
    distances[index] = Math.min(distances[index], distanceAt(x - 1, y) + 1, distanceAt(x, y - 1) + 1, distanceAt(x - 1, y - 1) + DIAGONAL, distanceAt(x + 1, y - 1) + DIAGONAL);
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    if (!opaqueAt(x, y)) continue;
    const index = y * width + x;
    distances[index] = Math.min(distances[index], distanceAt(x + 1, y) + 1, distanceAt(x, y + 1) + 1, distanceAt(x + 1, y + 1) + DIAGONAL, distanceAt(x - 1, y + 1) + DIAGONAL);
  }

  let maxDistance = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (opaqueAt(x, y)) maxDistance = Math.max(maxDistance, distances[y * width + x]);
  if (!Number.isFinite(maxDistance) || maxDistance <= 0) return null;

  const result: ArtworkGeometry = { width, height, palette: [...palette], outline: [], fill: [], details: [], shell: [] };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const symbol = symbolAt(x, y);
    if (symbol === '.') continue;
    const color = Number.parseInt(symbol, 36);
    if (!Number.isInteger(color) || color < 0 || color >= palette.length) continue;
    const distance = distances[y * width + x];
    const neighbors = [symbolAt(x - 1, y), symbolAt(x + 1, y), symbolAt(x, y - 1), symbolAt(x, y + 1)];
    const pixel = { x, y, color, depth: EDGE_DEPTH + VOLUME_DEPTH * Math.sqrt(Math.max(0, distance - 1) / maxDistance) };
    result.shell.push(pixel);

    if (distance <= EDGE_WIDTH) {
      result.outline.push(pixel);
      continue;
    }

    // Color transitions form a separate foreground layer in both dimensions. Small
    // dark marks and the brightest accent color retain eyes and teeth at low counts.
    const colorBoundary = neighbors.some(neighbor => neighbor !== '.' && neighbor !== symbol);
    const compactAccent = (colorBrightness(palette[color]) < 270 && y > height * 0.32) || color === palette.length - 1;
    if (colorBoundary || compactAccent) result.details.push(pixel);
    else result.fill.push(pixel);
  }
  return result.shell.length ? result : null;
}

// Allocate colors before positions so accents remain represented when layer counts vary.
function allocatePixels(pixels: Pixel[], count: number, colorWeight: number, seed: string): Pixel[] {
  if (!pixels.length || count <= 0) return [];
  const colors = new Map<number, Pixel[]>();
  for (const pixel of pixels) {
    const group = colors.get(pixel.color) ?? [];
    if (!colors.has(pixel.color)) colors.set(pixel.color, group);
    group.push(pixel);
  }
  const groups = [...colors.values()];
  const weights = groups.map(group => group.length ** colorWeight);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (!total) return [];
  let allocated = 0;
  let cumulative = 0;
  return groups.flatMap((group, index) => {
    cumulative += weights[index];
    const end = index === groups.length - 1 ? count : Math.round(count * cumulative / total);
    const amount = end - allocated;
    allocated = end;
    if (amount <= 0) return [];
    const random = randomSource(`${seed}/color/${group[0].color}`);
    return Array.from({ length: amount }, (_, sample) => group[Math.min(group.length - 1, Math.floor((sample + random()) * group.length / amount))]);
  });
}

export function sampleArtwork(ref: ArtworkRef, count: number, seed: string): { position: Vec3; color: string }[] {
  const art = getArtworkAsset(ref.assetId);
  const total = Math.floor(count);
  if (!art?.rows.length || !Number.isFinite(total) || total <= 0) return [];
  let image = geometryCache.get(art.id);
  if (!image) {
    image = geometry(art.rows, art.palette) ?? undefined;
    if (image) geometryCache.set(art.id, image);
  }
  if (!image) return [];
  const layer = image[ref.part];
  const pixels = allocatePixels(layer.length ? layer : image.shell, total, ref.part === 'fill' || ref.part === 'shell' ? 0.9 : 0.7, seed);
  const scale = 2 / Math.max(image.width, image.height);
  return pixels.map((pixel, index) => {
    const random = randomSource(`${seed}/art/${index}`);
    const jitter = ref.part === 'fill' || ref.part === 'shell' ? 0.8 : ref.part === 'details' ? 0.18 : 0;
    const x = (pixel.x + 0.5 + (random() - 0.5) * jitter - image.width / 2) * scale;
    const y = (image.height / 2 - pixel.y - 0.5 - (random() - 0.5) * jitter) * scale;
    // The shell supplies the rear surface. Detail stars are lifted slightly ahead
    // of the fill so facial marks and color boundaries remain visible front-on.
    const z = ref.part === 'shell' ? -pixel.depth * 0.74 : pixel.depth + (ref.part === 'details' ? 0.055 : 0);
    return { position: [x, y, ref.dimension === '3d' ? z : 0] as Vec3, color: image.palette[pixel.color] };
  });
}

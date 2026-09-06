export type Vec3 = [number, number, number];
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const smooth = (value: number) => { const x = clamp(value, 0, 1); return x * x * (3 - 2 * x); };

export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}
export function randomSource(seed: string) {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ state >>> 15, state | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function linearColor(hex: string): Vec3 {
  const n = Number.parseInt(hex.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255].map(byte => {
    const c = byte / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Vec3;
}

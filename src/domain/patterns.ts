import { PATTERNS, SCENE } from './catalog';
import { compileStar } from './compile';
import type { StarProfile } from './compile';
import { linearColor, randomSource } from './math';
import type { Vec3 } from './math';
import type { LayerDefinition, StarDefinition } from './schema';
import { isShape, sampleShape } from './shapes';
import { sampleArtwork } from './imageArt';

export interface StarTrack {
  id: string; origin: Vec3; velocity: Vec3; start: number; life: number;
  drag: number; gravity: number; tail: number; phase: number; profile: StarProfile; burstStrength: number; burstSeconds: number;
  headHeat?: number;
}
export interface CompiledEffect { tracks: StarTrack[]; duration: number; flashSeconds: number }

export function positionAt(track: StarTrack, age: number, out: Vec3): Vec3 {
  const k = -Math.expm1(-track.drag * age) / track.drag;
  const impulse = (track.burstStrength - 1) * track.burstSeconds * -Math.expm1(-age / track.burstSeconds);
  const travel = k + impulse;
  out[0] = track.origin[0] + track.velocity[0] * travel;
  out[1] = track.origin[1] + track.velocity[1] * travel - track.gravity / track.drag * (age - k);
  out[2] = track.origin[2] + track.velocity[2] * travel;
  return out;
}

const compiledLayers = new WeakMap<LayerDefinition, CompiledEffect>();
function paletteColor(colors: string[], amount: number) {
  const scaled = Math.max(0, Math.min(1, amount)) * (colors.length - 1), index = Math.floor(scaled), next = colors[Math.min(colors.length - 1, index + 1)], mix = scaled - index;
  const channel = (axis: number) => Math.round(Number.parseInt(colors[index].slice(1 + axis * 2, 3 + axis * 2), 16) + (Number.parseInt(next.slice(1 + axis * 2, 3 + axis * 2), 16) - Number.parseInt(colors[index].slice(1 + axis * 2, 3 + axis * 2), 16)) * mix).toString(16).padStart(2, '0');
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}
function sourceLightness(color: string) { return (Number.parseInt(color.slice(1, 3), 16) * .2126 + Number.parseInt(color.slice(3, 5), 16) * .7152 + Number.parseInt(color.slice(5, 7), 16) * .0722) / 255; }
export function compileLayer(effect: LayerDefinition): CompiledEffect {
  const cached = compiledLayers.get(effect);
  if (cached) return cached;
  const result = buildEffect(effect);
  compiledLayers.set(effect, result);
  return result;
}
function buildEffect(effect: LayerDefinition): CompiledEffect {
  const preset = PATTERNS[effect.pattern];
  const profile = compileStar(effect.star);
  const tracks: StarTrack[] = [];
  const angle = effect.rotation * Math.PI / 180;
  const outline = isShape(effect.pattern) ? sampleShape(effect.pattern, effect.count) : null;
  const artwork = effect.artwork ? sampleArtwork(effect.artwork, effect.count, effect.seed) : null;
  const artPalette = effect.palette;
  const customPalette = effect.colorPalette?.mode === 'custom' ? effect.colorPalette.colors : null;
  const coloredProfiles = new Map<string, StarProfile>();
  for (let i = 0; i < effect.count; i++) {
    // An independent stream per logical star keeps random attributes stable when count changes.
    const random = randomSource(`${effect.seed}/${i}`);
    let vector: Vec3;
    let starProfile = profile;
    if (artwork?.length) {
      const artPoint = artwork[i];
      vector = artPoint.position;
      const color = customPalette ? paletteColor(customPalette, sourceLightness(artPoint.color)) : artPalette?.[artPoint.color] ?? artPoint.color;
      if (!coloredProfiles.has(color)) {
        const tint = linearColor(color);
        coloredProfiles.set(color, { ...profile, color: tint, finishColor: artPalette || customPalette || !effect.star.material.finish ? tint : profile.finishColor });
      }
      starProfile = coloredProfiles.get(color)!;
    } else if (outline) {
      // Preserve radius as well as direction: normalizing would turn every outline into a ring.
      vector = [outline[i][0], outline[i][1], 0];
    } else if (effect.pattern === 'ring' || effect.pattern === 'crossette') {
      const theta = (i + 0.15) / effect.count * Math.PI * 2;
      vector = [Math.cos(theta), Math.sin(theta), effect.pattern === 'ring' ? 0 : (random() - 0.5) * 0.18];
    } else {
      const y = 1 - 2 * (i + 0.5) / effect.count;
      const radius = Math.sqrt(1 - y * y);
      const theta = i * Math.PI * (3 - Math.sqrt(5)) + (random() - 0.5) * 0.14;
      vector = [Math.cos(theta) * radius, y, Math.sin(theta) * radius];
    }
    if (customPalette && !artwork?.length) {
      const color = paletteColor(customPalette, (Math.atan2(vector[1], vector[0]) + Math.PI) / (Math.PI * 2));
      const tint = linearColor(color);
      if (!coloredProfiles.has(color)) coloredProfiles.set(color, { ...profile, color: tint, finishColor: tint });
      starProfile = coloredProfiles.get(color)!;
    }
    const [x, y, z] = vector;
    const speed = preset.speed * effect.spread * (outline || artwork?.length ? 1 : effect.pattern === 'ring' ? 0.985 + random() * 0.03 : 0.88 + random() * 0.24);
    const isBranch = effect.pattern === 'crossette';
    const track: StarTrack = {
      id: `star-${i}`, origin: [0, 0, 0],
      velocity: [(x * Math.cos(angle) + z * Math.sin(angle)) * speed, y * speed, (-x * Math.sin(angle) + z * Math.cos(angle)) * speed],
      start: 0, life: isBranch ? SCENE.splitAt : profile.lifetime * preset.lifeFactor * (outline || artwork?.length ? 0.97 + random() * 0.06 : 0.83 + random() * 0.3),
      drag: profile.drag * preset.dragFactor * effect.dragScale, burstStrength: effect.burstStrength, burstSeconds: effect.burstSeconds, gravity: preset.gravity,
      tail: profile.tail * (isBranch ? 0.55 : preset.tailFactor), phase: random() * Math.PI * 2, profile: starProfile,
      ...(artwork?.length ? { headHeat: .015 } : {}),
    };
    tracks.push(track);
    if (isBranch) {
      const origin = positionAt(track, track.life, [0, 0, 0]);
      const decay = Math.exp(-track.drag * track.life);
      const speedFactor = decay + (track.burstStrength - 1) * Math.exp(-track.life / track.burstSeconds);
      const inherited: Vec3 = [track.velocity[0] * speedFactor, track.velocity[1] * speedFactor - track.gravity / track.drag * (1 - decay), track.velocity[2] * speedFactor];
      for (let child = 0; child < SCENE.branches; child++) {
        const theta = i * 0.31 + child / SCENE.branches * Math.PI * 2;
        tracks.push({
          ...track, burstStrength: 1, id: `${track.id}/${child}`, origin: [...origin], start: track.life,
          velocity: [Math.cos(theta) * SCENE.childSpeed + inherited[0] * SCENE.inheritedSpeed, Math.sin(theta) * SCENE.childSpeed + inherited[1] * SCENE.inheritedSpeed, inherited[2] * SCENE.inheritedSpeed],
          life: profile.lifetime * SCENE.childLifeFactor * (0.88 + random() * 0.2), tail: profile.tail * preset.tailFactor,
          phase: random() * Math.PI * 2,
        });
      }
    }
  }
  return { tracks, duration: Math.max(...tracks.map(track => track.start + track.life + track.tail)), flashSeconds: effect.burstSeconds + SCENE.flashAfterglow };
}

export function compileSingleStar(star: StarDefinition): CompiledEffect {
  const profile = compileStar(star);
  return {
    flashSeconds: 0, duration: profile.lifetime + profile.tail,
    tracks: [{ id: 'single-star', burstStrength: 1, burstSeconds: SCENE.defaultBurstTime, origin: [-70, 0, 0], velocity: [58, 25, 0], start: 0, life: profile.lifetime, drag: profile.drag, gravity: 10, tail: profile.tail, phase: 0, profile }],
  };
}

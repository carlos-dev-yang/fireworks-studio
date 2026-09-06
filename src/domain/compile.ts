import { MATERIALS, SCENE } from './catalog';
import { linearColor, smooth } from './math';
import type { Vec3 } from './math';
import type { StarDefinition } from './schema';

export interface StarProfile {
  readonly source: StarDefinition;
  readonly lifetime: number;
  readonly tail: number;
  readonly drag: number;
  readonly glow: number;
  readonly size: number;
  readonly color: Vec3;
  readonly finishColor: Vec3;
  readonly transition: number;
}
const profiles = new WeakMap<StarDefinition, StarProfile>();

// One pure evaluator serves both the inspector and the simulation.
// Its coefficients describe an artistic response model, not physical chemistry.
export function compileStar(star: StarDefinition): StarProfile {
  const cached = profiles.get(star);
  if (cached) return cached;
  const base = MATERIALS[star.material.base];
  const finish = MATERIALS[star.material.finish ?? star.material.base];
  const share = star.material.finish ? star.material.transition : 1;
  const blend = (a: number, b: number) => a * share + b * (1 - share);
  const scale = Math.sqrt(star.body.scale);
  const result: StarProfile = {
    source: star, lifetime: blend(base.lifetime, finish.lifetime) * scale * star.lifetimeScale,
    tail: blend(base.tail, finish.tail) * star.material.trail,
    drag: blend(base.drag, finish.drag) / scale,
    glow: blend(base.glow, finish.glow) * star.brightness, size: SCENE.headSize * star.body.scale,
    color: linearColor(base.color), finishColor: linearColor(finish.color), transition: star.material.transition,
  };
  profiles.set(star, result);
  return result;
}

export function colorAt(profile: StarProfile, normalizedAge: number, out: Vec3): Vec3 {
  const rampWidth = SCENE.transitionWidth;
  const mix = smooth((normalizedAge - profile.transition + rampWidth / 2) / rampWidth);
  for (let i = 0; i < 3; i++) out[i] = profile.color[i] + (profile.finishColor[i] - profile.color[i]) * mix;
  return out;
}

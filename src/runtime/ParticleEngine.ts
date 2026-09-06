import { LIMITS, SCENE, TICK_RATE } from '../domain/catalog';
import { colorAt } from '../domain/compile';
import { clamp, smooth } from '../domain/math';
import type { Vec3 } from '../domain/math';
import { compileLayer, compileSingleStar, positionAt } from '../domain/patterns';
import type { CompiledEffect } from '../domain/patterns';
import { getDesign } from '../domain/schema';
import type { Cue, DesignOwner, FireworkDesign, LauncherDefinition, ShowDocument } from '../domain/schema';
export type EngineTarget = { kind: 'show' } | { kind: 'preview'; owner: DesignOwner | null; view: 'firework' | 'layer' | 'star'; layerId: string | null };
interface Instance { start: number; ground: Vec3; offset: Vec3; rise: number; height: number; layers: { effect: CompiledEffect; delay: number }[]; duration: number }
interface CachedInstance { cue: Cue; launcher: LauncherDefinition; instance: Instance }
export interface RenderFrame { positions: Float32Array; colors: Float32Array; sizes: Float32Array; brightness: Float32Array; count: number; capped: boolean }
// No DOM, React, store, or Three dependency. A Wasm adapter can implement this contract.
export interface SimulationEngine { load(document: ShowDocument, target: EngineTarget): number; evaluate(tick: number): RenderFrame }
function makeInstance(design: FireworkDesign, start: number, ground: Vec3, view = 'firework', layerId: string | null = null): Instance {
  const selected = design.layers.filter(layer => layer.enabled && (view === 'firework' || layer.id === layerId));
  const layers = selected.map(layer => ({ delay: view === 'star' ? 0 : layer.delaySeconds, effect: view === 'star' ? compileSingleStar(layer.star) : compileLayer(layer) }));
  const rise = view === 'star' ? 0 : design.flight.riseSeconds;
  return { start, ground, offset: [ground[0], design.flight.height, ground[2]], rise, height: design.flight.height, layers, duration: rise + Math.max(0, ...layers.map(layer => layer.delay + layer.effect.duration)) };
}
export class ParticleEngine implements SimulationEngine {
  private cache = new Map<string, CachedInstance>();
  private instances: Instance[] = [];
  private position: Vec3 = [0, 0, 0];
  private color: Vec3 = [0, 0, 0];
  private frame: RenderFrame = { positions: new Float32Array(LIMITS.pointBudget * 3), colors: new Float32Array(LIMITS.pointBudget * 3), sizes: new Float32Array(LIMITS.pointBudget), brightness: new Float32Array(LIMITS.pointBudget), count: 0, capped: false };
  load(document: ShowDocument, target: EngineTarget): number {
    if (target.kind === 'show') {
      for (const key of this.cache.keys()) if (!document.cues[key]) this.cache.delete(key);
      this.instances = Object.values(document.cues).sort((a, b) => a.atTick - b.atTick || a.id.localeCompare(b.id)).map(cue => {
        const launcher = document.launchers[cue.launcherId];
        const cached = this.cache.get(cue.id);
        if (cached?.cue === cue && cached.launcher === launcher) return cached.instance;
        const instance = makeInstance(cue.design, cue.atTick / TICK_RATE, [launcher.x * SCENE.launcherSpacing, 0, launcher.z * SCENE.launcherSpacing]);
        this.cache.set(cue.id, { cue, launcher, instance });
        return instance;
      });
    } else {
      const design = target.owner ? getDesign(document, target.owner) : undefined;
      this.instances = design ? [makeInstance(design, 0, [0, 0, 0], target.view, target.layerId)] : [];
    }
    const minimum = target.kind === 'show' ? SCENE.showMinimumSeconds : SCENE.previewMinimumSeconds;
    return Math.ceil(Math.max(minimum, ...this.instances.map(instance => instance.start + instance.duration)) * TICK_RATE);
  }
  private add(position: Vec3, offset: Vec3, size: number, brightness: number, color: Vec3, hot = 0) {
    const floor = smooth((position[1] + offset[1]) / SCENE.floorFade);
    if (floor <= 0 || brightness <= 0) return;
    if (this.frame.count >= LIMITS.pointBudget) { this.frame.capped = true; return; }
    const i = this.frame.count++;
    for (let axis = 0; axis < 3; axis++) { this.frame.positions[i * 3 + axis] = position[axis] + offset[axis]; this.frame.colors[i * 3 + axis] = color[axis] + (1 - color[axis]) * hot; }
    this.frame.sizes[i] = size; this.frame.brightness[i] = brightness * floor;
  }
  private flash(age: number, duration: number, instance: Instance, color: Vec3) {
    if (age < 0 || age >= duration || duration <= 0) return;
    const progress = age / duration;
    this.position.fill(0);
    this.add(this.position, instance.offset, SCENE.flashSize * (0.6 + progress), SCENE.flashBrightness * (1 - progress) ** 3, color, 0.8);
  }
  evaluate(tick: number): RenderFrame {
    const time = tick / TICK_RATE;
    this.frame.count = 0; this.frame.capped = false;
    for (const instance of this.instances) {
      if (this.frame.capped) break;
      const localTime = time - instance.start;
      if (localTime < 0 || localTime > instance.duration || !instance.layers.length) continue;
      const firstTrack = instance.layers[0].effect.tracks[0];
      if (instance.rise && localTime <= instance.rise + SCENE.launchTail) {
        const start = Math.ceil(Math.max(0, localTime - SCENE.launchTail) / SCENE.launchStep);
        const end = Math.floor(Math.min(localTime, instance.rise) / SCENE.launchStep);
        for (let sample = start; sample <= end && !this.frame.capped; sample++) {
          const t = sample * SCENE.launchStep, lag = localTime - t;
          this.position[0] = this.position[2] = 0;
          this.position[1] = SCENE.launcherHeight + (instance.height - SCENE.launcherHeight) * (1 - (1 - clamp(t / instance.rise, 0, 1)) ** 2) - SCENE.sparkGravity * lag * lag;
          this.add(this.position, instance.ground, SCENE.headSize, (1 - lag / SCENE.launchTail) * 0.75, firstTrack.profile.color, 0.6);
        }
      }
      // A shell flash marks the end of ascent even when all visible layers are delayed.
      this.flash(localTime - instance.rise, instance.layers[0].effect.flashSeconds, instance, firstTrack.profile.color);
      for (const layer of instance.layers) {
        if (this.frame.capped) break;
        const age = localTime - instance.rise - layer.delay;
        if (age < 0 || age > layer.effect.duration) continue;
        if (layer.delay > 0) this.flash(age, layer.effect.flashSeconds, instance, layer.effect.tracks[0].profile.color);
        for (const track of layer.effect.tracks) {
          if (this.frame.capped) break;
          const ownAge = age - track.start;
          if (ownAge < 0 || ownAge > track.life + track.tail) continue;
          if (ownAge <= track.life) {
            positionAt(track, ownAge, this.position); colorAt(track.profile, ownAge / track.life, this.color);
            this.add(this.position, instance.offset, track.profile.size, smooth((track.life - ownAge) / (track.life * SCENE.headFadePortion)) * track.profile.glow, this.color, track.headHeat ?? 0.28);
          }
          if (track.tail <= 0) continue;
          const first = Math.ceil(Math.max(0, ownAge - track.tail) / SCENE.trailStep), last = Math.floor(Math.min(ownAge, track.life) / SCENE.trailStep);
          for (let sample = first; sample <= last && !this.frame.capped; sample++) {
            const t = sample * SCENE.trailStep, lag = ownAge - t;
            const cooling = Math.max(0, 1 - lag / track.tail) ** 1.15;
            positionAt(track, t, this.position);
            const follow = Math.exp(-track.drag * t) * lag * SCENE.sparkFollow;
            this.position[0] += track.velocity[0] * follow + Math.sin(track.phase + sample) * SCENE.sparkJitter * lag;
            this.position[1] += track.velocity[1] * follow - SCENE.sparkGravity * lag * lag;
            this.position[2] += track.velocity[2] * follow + Math.cos(track.phase + sample) * SCENE.sparkJitter * lag;
            colorAt(track.profile, t / track.life, this.color);
            const grain = 0.7 + 0.3 * Math.sin(track.phase + sample * 2.39996) ** 2;
            this.add(this.position, instance.offset, SCENE.tailSize * track.profile.source.body.scale * (0.7 + 0.3 * cooling), SCENE.tailBrightness * cooling * smooth((track.life - t) / (track.life * SCENE.headFadePortion)) * grain * track.profile.glow, this.color);
          }
        }
      }
    }
    return this.frame;
  }
}

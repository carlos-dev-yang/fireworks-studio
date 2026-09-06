import { PATTERNS, SCENE, TICK_RATE } from '../domain/catalog';
import { compileStar } from '../domain/compile';
import { getDesign } from '../domain/schema';
import { localeStore, t } from '../i18n';
import { documentStore } from '../state/documentStore';
import { editorStore } from '../state/editorStore';
import { notify } from '../state/noticeStore';
import { ParticleEngine } from '../runtime/ParticleEngine';
import type { SimulationEngine } from '../runtime/ParticleEngine';
import { ThreeViewport } from '../viewport/ThreeViewport';
import { cameraActions, playback, viewportStatus } from './services';

export class StudioSession {
  private engine: SimulationEngine = new ParticleEngine();
  private viewport: ThreeViewport;
  private unsubscribers: (() => void)[] = [];
  private animation: number | null = null;
  private disposed = false;
  private dirty = true;
  private evaluatedTick = -1;
  private cappedNotice = false;
  private launcherReference = documentStore.getState().document.launchers;

  constructor(host: HTMLElement) {
    this.viewport = new ThreeViewport(host, () => this.schedule(), message => {
      playback.pause();
      viewportStatus.setState({ error: message });
    });
    cameraActions.bind(() => this.viewport.resetCamera());
    this.unsubscribers.push(
      documentStore.subscribe((state, previous) => {
        if (state.document === previous.document) return;
        const editor = editorStore.getState();
        const relevant = editor.page === 'show'
          ? state.document.cues !== previous.document.cues || state.document.launchers !== previous.document.launchers
          : editor.editing && getDesign(state.document, editor.editing) !== getDesign(previous.document, editor.editing);
        if (!relevant) return;
        this.dirty = true;
        this.schedule();
      }),
      editorStore.subscribe((state, previous) => {
        if (state.page === previous.page && (state.page === 'show' || (state.editing?.kind === previous.editing?.kind && state.editing?.id === previous.editing?.id && state.previewMode === previous.previewMode && (state.previewMode === 'firework' || state.layerId === previous.layerId)))) return;
        this.reload(true);
        this.schedule();
      }),
      localeStore.subscribe(() => this.viewport.setLabel(t('preview.canvas'))),
      playback.subscribe(() => this.schedule()),
    );
    const visibility = () => { if (document.hidden) playback.pause(); };
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const reduceMotion = () => { if (motion.matches) playback.pause(); };
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', reduceMotion);
    this.unsubscribers.push(() => document.removeEventListener('visibilitychange', visibility), () => motion.removeEventListener('change', reduceMotion));
    this.reload(true);
    viewportStatus.setState({ ready: true, error: null });
    this.schedule();
  }

  private reload(resetTime: boolean) {
    const document = documentStore.getState().document;
    const state = editorStore.getState();
    const show = state.page === 'show';
    const design = state.editing ? getDesign(document, state.editing) : undefined;
    const target = show ? { kind: 'show' as const } : { kind: 'preview' as const, owner: state.editing, view: state.previewMode, layerId: state.layerId };
    const duration = this.engine.load(document, target);
    playback.setDuration(duration);
    this.viewport.setMode(show);
    this.viewport.setHeight(show ? Math.max(SCENE.burstHeight, ...Object.values(document.cues).map(cue => cue.design.flight.height)) : design?.flight.height ?? SCENE.burstHeight);
    this.viewport.setLabel(t('preview.canvas'));
    if (resetTime || this.launcherReference !== document.launchers) {
      const launchers = show ? Object.values(document.launchers) : [{ id: 'preview', name: '', x: 0, z: 0 }];
      this.viewport.setLaunchers(!show && state.previewMode === 'star' ? [] : launchers);
      this.launcherReference = document.launchers;
    }
    if (resetTime) {
      const layer = design?.layers.find(layer => layer.id === state.layerId) ?? design?.layers[0];
      const time = show || !design || !layer ? 0 : state.previewMode === 'star'
        ? compileStar(layer.star).lifetime * 0.55
        : design.flight.riseSeconds + layer.delaySeconds + PATTERNS[layer.pattern].previewAge;
      playback.seek(time * TICK_RATE);
    }
    this.dirty = false;
    this.evaluatedTick = -1;
  }
  private schedule() {
    if (!this.disposed && this.animation === null) this.animation = requestAnimationFrame(this.frame);
  }
  private frame = (now: number) => {
    this.animation = null;
    if (this.disposed) return;
    if (this.dirty) this.reload(false);
    playback.advance(now);
    const { tick, playing } = playback.getSnapshot();
    if (this.evaluatedTick !== tick) {
      const result = this.engine.evaluate(tick);
      this.viewport.updateParticles(result);
      this.evaluatedTick = tick;
      if (result.capped && !this.cappedNotice) { notify('notice.capped'); this.cappedNotice = true; }
      if (!result.capped) this.cappedNotice = false;
    }
    // Camera-only changes reuse the existing frame, without recalculating particles.
    this.viewport.render();
    if (playing) this.schedule();
  };
  dispose() {
    this.disposed = true;
    if (this.animation !== null) cancelAnimationFrame(this.animation);
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.viewport.dispose();
    cameraActions.bind(null);
    viewportStatus.setState({ ready: false });
  }
}

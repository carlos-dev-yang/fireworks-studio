import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SCENE } from '../domain/catalog';
import type { LauncherDefinition } from '../domain/schema';
import type { MessageKey } from '../i18n';
import type { RenderFrame } from '../runtime/ParticleEngine';
import type { ViewportBackground } from '../state/backgroundStore';
import { createYeouidoEnvironment, disposeThreeResources } from './YeouidoBackground';

const VIEW = {
  sky: '#080b0e', ground: '#6e747e', launcher: '#777a7e', accent: '#f7b44f',
  fieldOfView: 43, frameHeight: 400, groundMargin: 45, previewWidth: 340, showWidth: 760,
  minDistance: 120, maxDistance: 1400, zoomOutFactor: 1.5, farPlaneFactor: 4, pixelRatioLimit: 2,
  groundSize: 1100, gridDivisions: 32, launcherHeight: 9, launcherRadius: 3,
} as const;

export class ThreeViewport {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(VIEW.fieldOfView, 1, 1, VIEW.maxDistance * VIEW.farPlaneFactor);
  private controls: OrbitControls;
  private points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private grid: THREE.GridHelper;
  private yeouido = new THREE.Group();
  private launchers = new THREE.Group();
  private observer: ResizeObserver;
  private show = false;
  private burstHeight: number = SCENE.burstHeight;
  private width = 1;
  private height = 1;
  private onCameraChange: () => void;
  private onContextLost: (event: Event) => void;
  private cityLoad?: Promise<void>;
  private disposed = false;
  private readonly invalidate: () => void;

  constructor(host: HTMLElement, invalidate: () => void, onError: (message: MessageKey) => void) {
    this.invalidate = invalidate;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, VIEW.pixelRatioLimit));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.renderer.domElement.setAttribute('role', 'img');
    host.append(this.renderer.domElement);
    this.scene.background = new THREE.Color(VIEW.sky);
    this.grid = new THREE.GridHelper(VIEW.groundSize, VIEW.gridDivisions, VIEW.ground, VIEW.ground);
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.10;
    this.grid.material.depthWrite = false;
    this.scene.add(this.grid, this.yeouido, this.launchers);
    this.yeouido.add(createYeouidoEnvironment());
    this.yeouido.visible = false;
    this.material = new THREE.ShaderMaterial({
      uniforms: { pixelScale: { value: 1 }, maxPixels: { value: 120 } },
      vertexShader: `
        attribute vec3 pointColor;
        attribute float pointSize;
        attribute float brightness;
        uniform float pixelScale;
        uniform float maxPixels;
        varying vec3 tint;
        varying float intensity;
        void main() {
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = clamp(pointSize * pixelScale / max(1.0, -viewPosition.z), 1.0, maxPixels);
          tint = pointColor;
          intensity = brightness;
        }
      `,
      fragmentShader: `
        varying vec3 tint;
        varying float intensity;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float r = dot(p, p);
          if (r > 1.0) discard;
          float alpha = (0.38 * exp(-r * 4.5) + exp(-r * 38.0)) * intensity;
          gl_FragColor = vec4(tint, alpha);
          #include <colorspace_fragment>
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(new THREE.BufferGeometry(), this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.minDistance = VIEW.minDistance;
    this.controls.maxDistance = VIEW.maxDistance;
    this.controls.maxPolarAngle = Math.PI * 0.62;
    this.onCameraChange = this.invalidate;
    this.controls.addEventListener('change', this.onCameraChange);
    this.onContextLost = event => { event.preventDefault(); onError('error.context'); };
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.observer = new ResizeObserver(() => {
      const size = host.getBoundingClientRect();
      const wasNarrow = this.width / this.height < 1;
      this.width = Math.max(1, size.width);
      this.height = Math.max(1, size.height);
      this.renderer.setSize(this.width, this.height, false);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      const tangent = Math.tan(THREE.MathUtils.degToRad(VIEW.fieldOfView / 2));
      this.material.uniforms.pixelScale.value = this.height * this.renderer.getPixelRatio() / (2 * tangent);
      if (wasNarrow !== (this.camera.aspect < 1)) this.resetCamera();
      invalidate();
    });
    this.observer.observe(host);
    this.resetCamera();
  }

  setMode(show: boolean) {
    if (this.show === show) return;
    this.show = show;
    this.resetCamera();
  }
  setBackground(background: ViewportBackground) {
    const isYeouido = background === 'yeouido';
    this.grid.visible = !isYeouido;
    this.yeouido.visible = isYeouido;
    this.scene.background = new THREE.Color(isYeouido ? '#041128' : VIEW.sky);
    this.renderer.toneMapping = isYeouido ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    this.renderer.toneMappingExposure = isYeouido ? 1.05 : 1;
    if (isYeouido) this.loadYeouidoCity();
  }
  private loadYeouidoCity() {
    if (this.cityLoad) return;
    const load = new Promise<void>((resolve, reject) => {
      new GLTFLoader().load(
        `${import.meta.env.BASE_URL}models/yeouido-night-skyline.glb`,
        gltf => {
          const city = gltf.scene;
          city.name = 'Blender-authored Yeouido skyline';
          // Asset contract: Y-up, front at +Z, ground at Y=0, and centered on X.
          city.position.set(0, 0, -925);
          if (this.disposed) disposeThreeResources(city);
          else this.yeouido.add(city);
          resolve();
        },
        undefined,
        reject,
      );
    });
    this.cityLoad = load;
    void load.then(() => { if (!this.disposed) this.invalidate(); }).catch(() => {
      if (this.cityLoad === load) this.cityLoad = undefined;
      if (!this.disposed) this.invalidate();
    });
  }
  setLabel(label: string) { this.renderer.domElement.setAttribute('aria-label', label); }
  setHeight(height: number) { if (this.burstHeight !== height) { this.burstHeight = height; this.resetCamera(); } }
  resetCamera() {
    const tangent = Math.tan(THREE.MathUtils.degToRad(VIEW.fieldOfView / 2));
    const width = this.show ? VIEW.showWidth : VIEW.previewWidth;
    const frameHeight = Math.max(VIEW.frameHeight, this.burstHeight + VIEW.frameHeight / 2);
    // Fit from the launchers up to the burst canopy, including tall shows.
    const targetHeight = frameHeight / 2 - VIEW.groundMargin;
    const distance = Math.max(frameHeight, width / this.camera.aspect) / (2 * tangent);
    this.controls.maxDistance = Math.max(VIEW.maxDistance, distance * VIEW.zoomOutFactor);
    this.camera.far = this.controls.maxDistance * VIEW.farPlaneFactor;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(distance * 0.06, targetHeight + distance * 0.10, distance);
    this.controls.target.set(0, targetHeight, 0);
    this.controls.update();
  }
  setLaunchers(launchers: LauncherDefinition[]) {
    for (const child of [...this.launchers.children]) {
      this.launchers.remove(child);
      child.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
    }
    for (const launcher of launchers) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(VIEW.launcherRadius, VIEW.launcherRadius, VIEW.launcherHeight, 12), new THREE.MeshBasicMaterial({ color: VIEW.launcher }));
      tube.position.set(launcher.x * SCENE.launcherSpacing, VIEW.launcherHeight / 2, launcher.z * SCENE.launcherSpacing);
      const cap = new THREE.Mesh(new THREE.TorusGeometry(VIEW.launcherRadius, 0.5, 6, 16), new THREE.MeshBasicMaterial({ color: VIEW.accent }));
      cap.rotation.x = Math.PI / 2;
      cap.position.y = VIEW.launcherHeight / 2;
      tube.add(cap);
      this.launchers.add(tube);
    }
  }
  updateParticles(frame: RenderFrame) {
    const geometry = this.points.geometry;
    const attributes: [string, Float32Array, number][] = [
      ['position', frame.positions, 3], ['pointColor', frame.colors, 3], ['pointSize', frame.sizes, 1], ['brightness', frame.brightness, 1],
    ];
    for (const [name, values, size] of attributes) {
      let attribute = geometry.getAttribute(name) as THREE.BufferAttribute | undefined;
      if (!attribute) {
        attribute = new THREE.BufferAttribute(values, size).setUsage(THREE.DynamicDrawUsage);
        geometry.setAttribute(name, attribute);
      }
      if (frame.count > 0) {
        attribute.clearUpdateRanges();
        attribute.addUpdateRange(0, frame.count * size);
        attribute.needsUpdate = true;
      }
    }
    geometry.setDrawRange(0, frame.count);
  }
  render() { this.renderer.render(this.scene, this.camera); }
  dispose() {
    this.disposed = true;
    this.observer.disconnect();
    this.controls.removeEventListener('change', this.onCameraChange);
    this.controls.dispose();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    disposeThreeResources(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

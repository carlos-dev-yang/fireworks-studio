import * as THREE from 'three';

/** The Blender GLB supplies the city and park; this supplies the surrounding night river. */
export function createYeouidoEnvironment(): THREE.Group {
  const environment = new THREE.Group();
  environment.name = 'Yeouido night environment';

  environment.add(new THREE.HemisphereLight('#7faac8', '#02060d', 1.3));
  const moonlight = new THREE.DirectionalLight('#b7d8f0', 2.2);
  moonlight.position.set(-420, 640, 360);
  environment.add(moonlight);
  const cityFill = new THREE.DirectionalLight('#456d98', 0.7);
  cityFill.position.set(280, 180, -540);
  environment.add(cityFill);

  const river = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshStandardMaterial({
    color: '#06182a', emissive: '#020b16', emissiveIntensity: 0.32, roughness: 0.68, metalness: 0.22,
  }));
  river.name = 'Han River water';
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, -1.5, 0);
  environment.add(river);

  const reflections = new THREE.Group();
  reflections.name = 'Water reflections';
  const reflectionColumns = [
    { x: -400, color: '#7c1c29', count: 11, opacity: 0.24 },
    { x: -315, color: '#a62a35', count: 15, opacity: 0.3 },
    { x: -190, color: '#a9c8df', count: 16, opacity: 0.34 },
    { x: -76, color: '#d1e6f2', count: 18, opacity: 0.38 },
    { x: 18, color: '#9dbfda', count: 14, opacity: 0.3 },
    { x: 145, color: '#9fc6e1', count: 12, opacity: 0.22 },
    { x: 255, color: '#b4d7eb', count: 15, opacity: 0.26 },
    { x: 390, color: '#769cc0', count: 10, opacity: 0.18 },
  ];
  for (const [column, reflection] of reflectionColumns.entries()) {
    const color = new THREE.Color(reflection.color);
    const strips = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.12, 1),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.36, roughness: 0.48,
        transparent: true, opacity: reflection.opacity, blending: THREE.AdditiveBlending, depthWrite: false,
      }),
      reflection.count,
    );
    strips.name = `River reflection ${column}`;
    const matrix = new THREE.Matrix4();
    for (let row = 0; row < reflection.count; row++) {
      const wobble = ((row * 19 + column * 7) % 11) - 5;
      const closeness = row / Math.max(1, reflection.count - 1);
      matrix.compose(
        new THREE.Vector3(reflection.x + wobble * (1.4 + closeness * 2.2), -1.24, -600 + row * 17),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), wobble * 0.016),
        new THREE.Vector3((7 + (row % 5) * 4) * (0.72 + closeness * 0.62), 1, 1.2 + (row % 3)),
      );
      strips.setMatrixAt(row, matrix);
    }
    strips.instanceMatrix.needsUpdate = true;
    reflections.add(strips);
  }
  environment.add(reflections);
  return environment;
}

export function disposeThreeResources(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const imageBitmaps = new Set<{ close: () => void }>();
  root.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
      geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
      if (object instanceof THREE.InstancedMesh) object.dispose();
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => {
    Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
    material.dispose();
  });
  textures.forEach(texture => {
    const source = texture.source.data as { close?: unknown } | null;
    if (source && typeof source.close === 'function') imageBitmaps.add(source as { close: () => void });
    texture.dispose();
  });
  imageBitmaps.forEach(bitmap => bitmap.close());
}

import * as THREE from '../vendor/three.module.js';

// Bakes a static group into one mesh per material (+ shadow flags + render order): a street segment goes from
// ~150 draw calls to ~30. Shared materials stay shared, so night lighting still changes them all at once.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${o.renderOrder}`;
    if (!buckets.has(key)) buckets.set(key, { like: o, parts: [] });
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    buckets.get(key).parts.push(g);
  });
  const out = new THREE.Group();
  for (const { like, parts } of buckets.values()) {
    const geo = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      if (!parts.every((p) => p.attributes[name])) continue;
      const arr = new Float32Array(parts.reduce((n, p) => n + p.attributes[name].array.length, 0));
      let off = 0;
      for (const p of parts) { arr.set(p.attributes[name].array, off); off += p.attributes[name].array.length; }
      geo.setAttribute(name, new THREE.BufferAttribute(arr, parts[0].attributes[name].itemSize));
    }
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const m = new THREE.Mesh(geo, like.material);
    m.castShadow = like.castShadow;
    m.receiveShadow = like.receiveShadow;
    m.renderOrder = like.renderOrder;
    out.add(m);
  }
  return out;
}

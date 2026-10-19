import * as THREE from 'three';

// Reuse the game's system font and materials: no downloaded font or bitmap asset.
// A translucent, lit surface decal supplies a subtle cut and lower bevel edge.
export function createSurfaceMarkings() {
  const textures = new Map();
  function texture(text, finish) {
    const key = finish + ':' + text;
    if (textures.has(key)) return textures.get(key);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    let size = 184;
    ctx.font = `700 ${size}px Arial, "PingFang SC", sans-serif`;
    size *= Math.min(1, 216 / ctx.measureText(text).width);
    ctx.font = `700 ${size}px Arial, "PingFang SC", sans-serif`;
    const metrics = ctx.measureText(text), y = 128 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    const colors = finish === 'ghost' ? ['#badfe9', '#5c8fa2', '#669bae'] : finish === 'gold' ? ['#eee5c7', '#9c8c5b', '#aa9b69'] : ['#c6d1d2', '#677b82', '#72858a'];
    ctx.fillStyle = colors[0]; ctx.fillText(text, 130, y + 2.5);
    ctx.fillStyle = colors[1]; ctx.fillText(text, 127, y - 1);
    ctx.fillStyle = colors[2]; ctx.fillText(text, 128, y);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    textures.set(key, map); return map;
  }
  return {
    stamp(parent, text, { position, width = .42, height = width, face = 'top', finish = 'stone' }) {
      const material = new THREE.MeshStandardMaterial({ map: texture(text, finish), transparent: true, opacity: .68, depthWrite: false, roughness: .95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
        emissive: finish === 'ghost' ? 0x267b99 : 0, emissiveIntensity: finish === 'ghost' ? .25 : 0 });
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      mark.position.set(...position); if (face === 'top') mark.rotation.x = -Math.PI / 2;
      mark.receiveShadow = true;
      // Kept transparent when the parent fades (bridges, ghosts, void fall).
      mark.userData.surfaceMark = { text, face, finish, width, height };
      mark.userData.baseOpacity = .68;
      parent.add(mark); return mark;
    },
    dispose() { for (const map of textures.values()) map.dispose(); textures.clear(); },
  };
}

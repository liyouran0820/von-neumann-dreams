import * as THREE from 'three';

// X/Y planes stand on the X/Z floor. Never copy the camera's quaternion.
const FONT = 'Arial, "PingFang SC", sans-serif';
function trackedText(ctx, text, y, size, weight, spacing, center) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  const chars = [...text];
  const width = chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + Math.max(0, chars.length - 1) * spacing;
  let x = center - width / 2;
  for (const c of chars) { ctx.fillText(c, x, y); x += ctx.measureText(c).width + spacing; }
}
function textCanvas(text) {
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
  ctx.font = `500 64px ${FONT}`;
  canvas.width = Math.ceil([...text].reduce((sum, c) => sum + ctx.measureText(c).width, 0) + Math.max(0, [...text].length - 1) * 5.12 + 32);
  canvas.height = 96;
  ctx.font = `500 64px ${FONT}`;
  const metrics = ctx.measureText(text);
  ctx.fillStyle = '#f0f4f3';
  trackedText(ctx, text, 48 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2, 64, 500, 5.12, canvas.width / 2);
  return canvas;
}
function bubbleCanvas(id, kind, on) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const shape = () => { ctx.beginPath(); ctx.roundRect(32, 32, 192, 192, 24); };
  if (on) {
    ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(123,218,207,.48)'; ctx.shadowBlur = 28; shape(); ctx.fill();
    ctx.shadowColor = 'rgba(255,240,184,.48)'; ctx.shadowBlur = 12; shape(); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'destination-out'; shape(); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
  }
  ctx.fillStyle = on ? 'rgba(62,102,98,.52)' : 'rgba(42,64,69,.48)'; shape(); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = on ? 'rgba(232,246,187,.92)' : 'rgba(189,173,117,.8)'; shape(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(128, 224); ctx.lineTo(128, 251); ctx.strokeStyle = 'rgba(142,163,139,.6)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = on ? '#fffde0' : '#fff2c8'; ctx.shadowColor = 'rgba(255,243,188,.55)'; ctx.shadowBlur = on ? 7 : 0;
  trackedText(ctx, id, 119, 74, 600, 4, 128);
  trackedText(ctx, kind === 'mirror' ? '转动' : '开关', 181, 43, 500, 3.5, 128);
  return canvas;
}

export function createWorldLabels(view) {
  const items = new Map(), textures = new Map(), geometry = new THREE.PlaneGeometry(1, 1);
  const project = p => {
    const point = view.root.localToWorld(p.clone()).project(view.camera);
    return { x: (point.x + 1) * view.width / 2, y: (1 - point.y) * view.height / 2 };
  };
  function moveScreen(mesh, dx, dy) {
    const origin = project(mesh.position), x = project(mesh.position.clone().add(new THREE.Vector3(1, 0, 0))), y = project(mesh.position.clone().add(new THREE.Vector3(0, 1, 0)));
    const ax = x.x - origin.x, ay = x.y - origin.y, bx = y.x - origin.x, by = y.y - origin.y, det = ax * by - ay * bx;
    if (Math.abs(det) > 1e-8) { mesh.position.x += (dx * by - dy * bx) / det; mesh.position.y += (ax * dy - ay * dx) / det; }
  }
  function reset() {
    for (const { mesh } of items.values()) { mesh.removeFromParent(); mesh.material.dispose(); }
    view.pickables = view.pickables.filter(mesh => !mesh.userData.worldLabel);
    for (const texture of textures.values()) texture.dispose();
    items.clear(); textures.clear();
  }
  function sync(anchors, science) {
    const optics = science?.opticsByWorld?.[view.world] || science?.optics;
    const placed = [];
    for (const anchor of anchors) {
      if (!['readout', 'sensor', 'mirror', 'switch'].includes(anchor.kind)) continue;
      const bubble = ['mirror', 'switch'].includes(anchor.kind), key = anchor.kind + ':' + (anchor.id || anchor.cell.join(','));
      const on = anchor.kind === 'mirror' ? !!optics?.bounces.some(b => b.id === anchor.id) : anchor.kind === 'switch' ? !!science?.signals[anchor.id] : anchor.kind === 'sensor' ? !!optics?.hits.includes(anchor.id) : !!science?.signals[anchor.signal];
      const text = bubble ? anchor.id : (anchor.label || anchor.id) + (anchor.kind === 'sensor' || anchor.signal ? ' ' + Number(on) : '');
      const signature = bubble ? key + ':' + on : text;
      let item = items.get(key);
      if (!item) {
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true, opacity: bubble ? 1 : .68, depthWrite: false, toneMapped: false }));
        if (bubble) {
          mesh.userData.pick = { kind: anchor.kind, id: anchor.id };
          // The transparent glow margin must not intercept a nearby mechanism.
          mesh.raycast = function(raycaster, hits) {
            const local = []; THREE.Mesh.prototype.raycast.call(this, raycaster, local);
            hits.push(...local.filter(hit => hit.uv.x >= .125 && hit.uv.x <= .875 && hit.uv.y >= .125 && hit.uv.y <= .875));
          };
          view.pickables.push(mesh);
        }
        view.root.add(mesh); item = { mesh }; items.set(key, item);
      }
      const mesh = item.mesh;
      if (item.signature !== signature) {
        if (!textures.has(signature)) {
          const map = new THREE.CanvasTexture(bubble ? bubbleCanvas(anchor.id, anchor.kind, on) : textCanvas(text));
          map.colorSpace = THREE.SRGBColorSpace; textures.set(signature, map);
        }
        mesh.material.map = textures.get(signature); mesh.material.needsUpdate = true;
        const canvas = mesh.material.map.image;
        mesh.scale.set(bubble ? 1.6 : .52 * canvas.width / canvas.height, bubble ? 1.6 : .52, 1);
        mesh.userData.worldLabel = { kind: anchor.kind, id: anchor.id, text, on, tracking: bubble ? null : .08 };
        item.signature = signature;
      }
      mesh.position.set(anchor.cell[0], anchor.height + (bubble ? .8 : .24), anchor.cell[1]);
      if (bubble) {
        const corners = [-.6, .6].flatMap(x => [-.6, .6].map(y => project(mesh.position.clone().add(new THREE.Vector3(x, y, 0)))));
        const width = Math.max(44, Math.max(...corners.map(p => p.x)) - Math.min(...corners.map(p => p.x)));
        const height = Math.max(44, Math.max(...corners.map(p => p.y)) - Math.min(...corners.map(p => p.y)));
        const center = project(mesh.position), clampX = x => Math.max(width / 2 + 2, Math.min(view.width - width / 2 - 2, x)), clampY = y => Math.max(height / 2 + 2, Math.min(view.height - height / 2 - 2, y));
        let x = clampX(center.x), y = clampY(center.y);
        // Move the actual world plane with its accessible target on narrow screens.
        for (const previous of placed) {
          const gapX = (width + previous.width) / 2 + 8, gapY = (height + previous.height) / 2 + 8;
          if (Math.abs(x - previous.x) < gapX && Math.abs(y - previous.y) < gapY) {
            if (previous.x + gapX <= view.width - width / 2 - 2) x = previous.x + gapX;
            else if (previous.x - gapX >= width / 2 + 2) x = previous.x - gapX;
            else y = clampY(previous.y - gapY);
          }
        }
        moveScreen(mesh, x - center.x, y - center.y);
        item.target = { x, y, width, height }; placed.push(item.target);
      }
    }
  }
  return { sync, target(anchor) { return items.get(anchor.kind + ':' + anchor.id)?.target; }, reset, dispose() { reset(); geometry.dispose(); } };
}

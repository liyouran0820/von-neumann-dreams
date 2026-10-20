// Read-only observation of the real app. The probe never substitutes game state,
// commands, time or rendering; its button publishes the observed scene to the DOM.
import * as THREE from 'three';
const scenes = {}, renderers = {};
THREE.Scene.prototype.onBeforeRender = function(renderer) {
  const world = renderer.domElement.parentElement.id.startsWith('day') ? 'day' : 'night';
  scenes[world] = this; renderers[world] = renderer;
};
function visible(object) { for (let p = object; p; p = p.parent) if (!p.visible) return false; return true; }
function snapshot() {
  const result = {};
  for (const [world, scene] of Object.entries(scenes)) {
    const marks = [], recesses = [], labels = [];
    scene.traverse(object => {
      if (object.userData.worldLabel) {
        const canvas = object.material.map.image, ctx = canvas.getContext('2d');
        labels.push({ ...object.userData.worldLabel, position: object.position.toArray(), scale: object.scale.toArray(), normal: new THREE.Vector3(0, 0, 1).transformDirection(object.matrixWorld).toArray(), up: new THREE.Vector3(0, 1, 0).transformDirection(object.matrixWorld).toArray(), opacity: object.material.opacity, depthTest: object.material.depthTest, centerAlpha: ctx.getImageData(90, 90, 1, 1).data[3], glowAlpha: canvas.width === 256 ? ctx.getImageData(20, 128, 1, 1).data[3] : null });
      }
      if (object.userData.surfaceMark) marks.push({ ...object.userData.surfaceMark, position: object.position.toArray(), worldPosition: object.getWorldPosition(new THREE.Vector3()).toArray(), visible: visible(object), transparent: object.material.transparent, opacity: object.material.opacity });
      if (object.userData.recess) recesses.push({ ...object.userData.recess, position: object.position.toArray(), parts: object.children.filter(c => !c.userData.surfaceMark).map(c => ({ position: c.position.toArray(), width: c.geometry.parameters.width, depth: c.geometry.parameters.depth })), mark: object.children.find(c => c.userData.surfaceMark)?.position.toArray() });
    });
    result[world] = { marks, recesses, labels, resources: { ...renderers[world].info.memory, calls: renderers[world].info.render.calls } };
  }
  return result;
}
const panel = document.createElement('details'); panel.id = 'markings-probe';
panel.style.cssText = 'position:fixed;right:0;bottom:0;z-index:100;max-width:340px;max-height:170px;overflow:auto;background:#fff;color:#111;font:10px monospace';
panel.innerHTML = '<summary>场景验收观察</summary><button type="button">记录当前模型</button><pre></pre>';
panel.querySelector('button').onclick = () => panel.querySelector('pre').textContent = JSON.stringify(snapshot());
document.body.append(panel);
import('../../web/app.js');

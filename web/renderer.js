import * as Game from './engine.js';
import * as Icons from './icons.js';

const NS = 'http://www.w3.org/2000/svg';
const UNIT = 38, PAD = 44;
export function svg(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text != null) node.textContent = text;
  return node;
}
export function icon(name, size = 20, rotation = 0) {
  const node = svg('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': true });
  if (rotation) node.style.transform = `rotate(${rotation}deg)`;
  for (const d of Icons.ICONS[name]) node.append(svg('path', { d }));
  return node;
}
export function point(level, world) { return world.map((value, axis) => PAD + (value - (axis ? level.view.y : level.view.x)) * UNIT); }
export function worldPoint(level, screen) { return screen.map((value, axis) => Math.round((value - PAD) / UNIT + (axis ? level.view.y : level.view.x))); }
function moving(level, current, previous, at, oldAt, attrs = {}) {
  const group = svg('g', attrs);
  const next = point(level, at); group.setAttribute('transform', `translate(${next})`);
  if (previous && oldAt) {
    const old = point(level, oldAt), dx = old[0] - next[0], dy = old[1] - next[1];
    if (dx || dy) {
      const animation = svg('animateTransform', { attributeName: 'transform', type: 'translate', from: old.join(' '), to: next.join(' '), dur: '.16s', fill: 'freeze' });
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) group.append(animation);
    }
  }
  return group;
}
function floor(group, rect, cls) {
  const x = (rect.x - .5) * UNIT, y = (rect.y - .5) * UNIT, w = rect.w * UNIT, h = rect.h * UNIT;
  group.append(svg('rect', { x, y: y + 8, width: w, height: h, rx: 3, class: 'floor-depth ' + cls }), svg('rect', { x, y, width: w, height: h, rx: 3, class: 'floor-top ' + cls }));
  for (let col = 1; col < rect.w; col++) group.append(svg('path', { d: `M${x + col * UNIT} ${y}v${h}`, class: 'floor-grid' }));
  for (let row = 1; row < rect.h; row++) group.append(svg('path', { d: `M${x} ${y + row * UNIT}h${w}`, class: 'floor-grid' }));
}
function mark(group, at, text, cls = '') { group.append(svg('text', { x: at[0], y: at[1], 'text-anchor': 'middle', class: 'scene-label ' + cls }, text)); }
function posts(group, object) {
  for (const rect of object.colliders ?? []) {
    const x = (rect.x - .5) * UNIT, y = (rect.y - .5) * UNIT;
    group.append(svg('rect', { x, y: y - 9, width: rect.w * UNIT, height: rect.h * UNIT + 9, rx: 2, class: 'room-post' }));
  }
}
export function renderScene(target, level, state, previous, selected) {
  const width = level.view.w * UNIT + PAD * 2, height = level.view.h * UNIT + PAD * 2;
  target.setAttribute('viewBox', `0 0 ${width} ${height}`);
  target.setAttribute('aria-label', level.name + '场景。点地面走路，金色手印可推拉，青色纹章可映射。');
  const root = svg('g'), current = Game.worldPositions(level, state), old = previous && Game.worldPositions(level, previous);
  const base = point(level, [0, 0]);
  const ground = svg('g', { transform: `translate(${base})`, class: 'ground' });
  level.floors.forEach(rect => floor(ground, rect, 'stone')); root.append(ground);
  for (const object of level.objects.filter(item => item.floor).sort((a, b) => (a.floor.priority ?? 1) - (b.floor.priority ?? 1))) {
    const group = moving(level, state, previous, current[object.id], old?.[object.id], { class: 'deck ' + object.kind });
    floor(group, object.floor, object.kind); posts(group, object); root.append(group);
  }
  for (const obstacle of level.obstacles ?? []) {
    const [x, y] = point(level, [obstacle.x - .5, obstacle.y - .5]);
    root.append(svg('rect', { x, y, width: obstacle.w * UNIT, height: obstacle.h * UNIT, rx: 12, class: 'glass-obstacle' }));
  }
  if (level.exitPoint) {
    const [x, y] = point(level, level.exitPoint);
    const group = svg('g', { transform: `translate(${x} ${y})`, 'data-walk': level.exitPoint.join(','), role: 'button', tabindex: 0, 'aria-label': '走到出口', class: 'portal' });
    group.append(svg('circle', { r: 28, class: 'portal-aura' }), svg('path', { d: 'M-15 17v-23a15 15 0 0 1 30 0v23M-19 17h38', class: 'portal-door' }));
    mark(group, [0, -33], '出口'); root.append(group);
  }
  for (const receiver of level.receiverMarks ?? []) {
    const at = point(level, receiver.at); root.append(svg('circle', { cx: at[0], cy: at[1], r: 23, class: 'receiver' })); mark(root, [at[0], at[1] + 38], receiver.name);
  }
  for (const guide of level.guides ?? []) {
    const at = point(level, guide.at); root.append(svg('circle', { cx: at[0], cy: at[1], r: 25, class: 'guide' }), svg('path', { d: `M${at[0]} ${at[1] - 36}v11m0 50v11`, class: 'guide-anchor' }));
  }
  // A child's rail travels with its parent; its world body is drawn independently.
  for (const object of level.objects) {
    const parent = object.parent ? current[object.parent] : [0, 0];
    const oldParent = object.parent && old ? old[object.parent] : [0, 0];
    const railAt = object.origin.map((value, i) => value + parent[i] + object.railOffset[i]);
    const oldAt = object.origin.map((value, i) => value + oldParent[i] + object.railOffset[i]);
    const group = moving(level, state, previous, railAt, oldAt, { class: 'rail' });
    const [ax, ay] = object.axis, start = object.min * UNIT, end = object.max * UNIT;
    group.append(svg('path', { d: `M${ax * start} ${ay * start}L${ax * end} ${ay * end}`, class: 'rail-line' }));
    for (let q = object.min; q <= object.max; q++) group.append(svg('path', { d: `M${ax * q * UNIT - ay * 5} ${ay * q * UNIT + ax * 5}l${ay * 10} ${-ax * 10}`, class: 'rail-tick' }));
    group.append(svg('circle', { cx: ax * state.q[object.id] * UNIT, cy: ay * state.q[object.id] * UNIT, r: 5, class: 'rail-position' }));
    const arrow = svg('g', { transform: `translate(${ax * (end + 17)} ${ay * (end + 17)}) rotate(${Math.atan2(ay, ax) * 180 / Math.PI})` });
    arrow.append(svg('path', { d: 'M-5 -5L1 0-5 5M-8 0H1', class: 'rail-arrow' })); group.append(arrow); root.append(group);
  }
  const seals = Object.fromEntries(level.objects.map(object => [object.id, point(level, current[object.id].map((value, i) => value + object.seal[i]))]));
  for (const [a, b] of state.links) {
    const p = seals[a], q = seals[b], bend = Math.max(25, Math.abs(p[0] - q[0]) * .18);
    const d = a === b ? `M${p}c-55 -50 55 -50 0 0` : `M${p}Q${(p[0] + q[0]) / 2} ${(p[1] + q[1]) / 2 - bend} ${q}`;
    const link = svg('g', { class: 'mapping-link', 'data-edge-a': a, 'data-edge-b': b, role: 'button', tabindex: 0, 'aria-label': `解除${level.objects.find(o => o.id === a).name}与${level.objects.find(o => o.id === b).name}的映射` });
    link.append(svg('path', { d, class: 'link-visible' }), svg('path', { d, class: 'link-hit' })); root.append(link);
  }
  for (const object of level.objects) {
    const group = moving(level, state, previous, current[object.id], old?.[object.id], { class: 'body ' + object.kind + (state.blocked?.body === object.id ? ' blocked-body' : '') });
    if (object.kind === 'door') {
      const r = object.solid;
      group.append(svg('rect', { x: (r.x - .5) * UNIT, y: (r.y - .5) * UNIT, width: r.w * UNIT, height: r.h * UNIT, rx: 4, class: 'stone-door' }));
      for (let i = 0; i < r.w; i++) group.append(svg('path', { d: `M${i * UNIT} -10v40`, class: 'door-engraving' }));
    } else if (object.kind === 'orb') {
      group.append(svg('circle', { cy: -4, r: 15, class: 'orb-body' }), svg('ellipse', { cy: -4, rx: 17, ry: 6, class: 'orb-orbit', transform: 'rotate(-28)' }));
    } else if (object.kind !== 'room' && object.kind !== 'bridge') {
      group.append(svg('rect', { x: -13, y: -18, width: 26, height: 30, rx: object.kind === 'handle' ? 10 : 3, class: 'slider-body ' + object.kind }), svg('path', { d: 'M-7 -7H7m-7-5v10', class: 'object-etch' }));
    }
    if (object.glass && object.kind !== 'door' && object.kind !== 'room' && object.kind !== 'bridge') group.append(svg('path', { d: 'M-20 16v-30a20 20 0 0 1 40 0v30Z', class: 'glass-case' }));
    if (object.spring) {
      const r = object.floor, anchor = state.q[object.id] * UNIT;
      group.append(svg('path', { d: `M${(r.x + r.w / 2 - .5) * UNIT} 9v${anchor + 10}`, class: 'weight-rope' }), svg('rect', { x: (r.x + r.w / 2 - .5) * UNIT - 7, y: anchor + 19, width: 14, height: 20, rx: 3, class: 'counterweight' }));
    }
    root.append(group);
  }
  for (const object of level.objects) {
    if (object.grip) {
      const grip = Game.gripPosition(level, state, object.id), prevGrip = previous && Game.gripPosition(level, previous, object.id);
      const group = moving(level, state, previous, grip, prevGrip, { 'data-grab': object.id, role: 'button', tabindex: 0, 'aria-label': '抓住' + object.name, class: 'grip' + (state.held === object.id ? ' held' : '') });
      group.append(svg('circle', { r: 17 })); const hand = icon('hand', 20); hand.setAttribute('x', -10); hand.setAttribute('y', -10); group.append(hand); root.append(group);
    }
    const at = seals[object.id];
    const group = svg('g', { transform: `translate(${at})`, 'data-seal': object.id, role: 'button', tabindex: 0, 'aria-label': '选择纹章：' + object.name, 'aria-pressed': selected === object.id, class: 'seal' + (selected === object.id ? ' selected' : '') });
    group.append(svg('path', { d: 'M0 -18L18 0 0 18-18 0Z', class: 'seal-shape' }), svg('path', { d: 'M-6 0h12m-6-6v12', class: 'seal-etch' }));
    mark(group, [0, -25], object.name); root.append(group);
  }
  const player = moving(level, state, previous, state.player.pos, previous?.player.pos, { class: 'paper-spirit', 'aria-hidden': true });
  player.append(svg('ellipse', { cy: 8, rx: 13, ry: 5, class: 'spirit-shadow' }), svg('path', { d: 'M0-21L13 9 0 4-13 9Z', class: 'spirit-paper' }), svg('path', { d: 'M0-21V4L13 9Z', class: 'spirit-fold' })); root.append(player);
  target.replaceChildren(root);
}

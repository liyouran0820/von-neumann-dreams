import * as Game from './engine.js';
import * as Levels from './levels.js';
import * as View from './renderer.js';

const $ = id => document.getElementById(id);
const storageKey = 'midnight-academy-rails-v3';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { /* 保存可选。 */ }
const solved = new Set(Array.isArray(saved.solved) ? saved.solved.filter(id => Levels.LEVELS.some(level => level.id === id && !level.lab)) : []);
const visited = new Set();
let level = null, session = null, selected = null, hintIndex = 0, walkToken = 0, walking = false;
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function button(text, action, className = '') {
  const node = el('button', className, text); node.type = 'button'; node.onclick = action; return node;
}
function withIcon(node, name, text) { node.replaceChildren(View.icon(name), el('span', '', text)); }
function persist() { try { localStorage.setItem(storageKey, JSON.stringify({ solved: [...solved] })); } catch { /* 无存储也可玩。 */ } }
function cancelWalk() { walkToken++; walking = false; }
function notice(text) { session.state.message = text; render(); }
function perform(command, fromQueue = false) {
  if (!level) return;
  if (!fromQueue) cancelWalk();
  const before = session.state;
  session = Game.act(level, session, command);
  if (session.state.status === 'success') { solved.add(level.id); persist(); }
  render(before);
}
function loadLevel(id) {
  cancelWalk(); level = Levels.LEVELS.find(current => current.id === id); session = Game.createSession(level);
  selected = null; hintIndex = 0; visited.add(id); $('hint').hidden = true;
  $('hub').hidden = true; $('game').hidden = false; $('back-home').hidden = false; render();
  $('level-title').focus({ preventScroll: true }); window.scrollTo(0, 0);
}
function home() {
  cancelWalk(); level = null; session = null; selected = null;
  $('hub').hidden = false; $('game').hidden = true; $('back-home').hidden = true; renderHub(); window.scrollTo(0, 0);
}
function renderHub() {
  $('progress').textContent = solved.size + ' / 5 学馆';
  $('portal-list').replaceChildren(...Levels.HUB.map((portal, i) => {
    const node = button('', () => loadLevel(portal.id), 'portal-card' + (i < 2 ? ' lab-card' : ''));
    node.append(el('span', 'portal-order', i < 2 ? '试' : String(i - 1).padStart(2, '0')), el('strong', '', portal.name), el('span', 'portal-detail', solved.has(portal.id) ? '已抵达' : visited.has(portal.id) && i < 2 ? '已进入' : portal.detail));
    return node;
  }));
  const root = View.svg('g');
  root.append(View.svg('ellipse', { cx: 460, cy: 347, rx: 320, ry: 208, class: 'courtyard-ring' }), View.svg('path', { d: 'M130 300L320 220 500 160 680 220 720 420 485 380 280 460 130 300M320 220L485 380 680 220', class: 'courtyard-path' }));
  for (const [i, portal] of Levels.HUB.entries()) {
    const group = View.svg('g', { transform: `translate(${portal.x} ${portal.y})`, role: 'button', tabindex: 0, 'data-portal': portal.id, 'aria-label': '进入' + portal.name, class: 'courtyard-building' + (solved.has(portal.id) ? ' done' : '') });
    group.append(View.svg('path', { d: 'M-49 14L0-14 49 14 0 43Z', class: 'building-shadow' }), View.svg('path', { d: 'M-39-12L0-34 39-12V17L0 39-39 17Z', class: 'building-body' }), View.svg('path', { d: 'M-39-12L0 10 39-12M0 10V39', class: 'building-etch' }), View.svg('path', { d: 'M-15-23L0-37 15-23V-7L0 3-15-7Z', class: 'building-cap' }));
    group.append(View.svg('text', { y: 70, 'text-anchor': 'middle', class: 'hub-label' }, portal.name), View.svg('text', { y: -53, 'text-anchor': 'middle', class: 'hub-number' }, solved.has(portal.id) ? '已抵达' : i < 2 ? '实验台' : String(i - 1).padStart(2, '0')));
    root.append(group);
  }
  root.append(View.svg('text', { x: 465, y: 310, 'text-anchor': 'middle', class: 'courtyard-title' }, '同一个世界，新的关系。'));
  $('courtyard').replaceChildren(root);
}
function render(previous) {
  if (!level) return;
  const focusedObject = document.activeElement?.dataset.object;
  const state = session.state;
  $('progress').textContent = solved.size + ' / 5 学馆';
  $('level-place').textContent = level.place;
  $('level-title').textContent = level.name;
  $('goal').textContent = level.goalText;
  $('stage').classList.toggle('editing', state.editing);
  View.renderScene($('scene'), level, state, previous, selected);
  withIcon($('mapping'), 'link', state.editing ? '结束映射' : '连接纹章');
  $('mapping').setAttribute('aria-pressed', state.editing); $('mapping').disabled = state.status === 'failed';
  $('mode-message').textContent = state.editing ? selected ? '再选一个纹章；重复选同一对可断开。' : '选两个纹章。连线时，世界暂停。' : '点地面走路 · 点金色手印推拉';
  $('objects').replaceChildren(...level.objects.map(object => {
    const node = button(object.name, () => selectSeal(object.id), 'object-chip' + (selected === object.id ? ' selected' : ''));
    node.dataset.object = object.id; node.setAttribute('aria-label', '纹章：' + object.name);
    node.setAttribute('aria-pressed', selected === object.id); node.disabled = !state.editing || state.status === 'failed';
    node.prepend(View.icon('link', 15)); return node;
  }));
  if (focusedObject && state.editing) $('objects').querySelector(`[data-object="${focusedObject}"]`)?.focus({ preventScroll: true });
  $('connections').replaceChildren(...state.links.map(([a, b]) => {
    const name = id => level.objects.find(object => object.id === id).name;
    const node = button(name(a) + ' ↔ ' + name(b), () => {
      if (!session.state.editing) perform({ type: 'edit' });
      selected = null; perform({ type: 'unlink', a, b });
    }, 'connection-chip');
    node.setAttribute('aria-label', '断开' + name(a) + '与' + name(b)); node.disabled = state.status === 'failed'; node.prepend(View.icon('unlink', 15)); return node;
  }));
  $('connections').hidden = !state.links.length;
  const held = level.objects.find(object => object.id === state.held);
  const near = level.objects.find(object => object.grip && Game.canGrab(level, state, object.id));
  $('held-name').textContent = held ? '抓住了 ' + held.name : walking ? '正在走近…' : '双手空着';
  withIcon($('grab'), 'hand', held ? '松手' : near ? '抓住' + near.name : '走近手印');
  $('grab').disabled = state.editing || state.status === 'failed' || (!held && !near);
  $('push-controls').hidden = !held;
  $('grip-targets').hidden = Boolean(held) || state.editing || state.status === 'failed';
  $('grip-targets').replaceChildren(...level.objects.filter(object => object.grip).map(object => {
    const node = button(object.name, () => grabObject(object.id), 'grip-target');
    node.setAttribute('aria-label', '走近并抓住' + object.name); return node;
  }));
  for (const id of ['forward', 'backward']) $(id).disabled = state.editing || state.status === 'failed';
  if (held) {
    const angle = Math.atan2(held.axis[1], held.axis[0]) * 180 / Math.PI + 90;
    $('forward').replaceChildren(View.icon('arrowUp', 21, angle), el('span', '', '沿箭头推'));
    $('backward').replaceChildren(View.icon('arrowUp', 21, angle + 180), el('span', '', '反向拉'));
  }
  document.querySelectorAll('[data-direction]').forEach(node => node.disabled = state.editing || state.status === 'failed');
  $('undo').disabled = !session.history.length;
  $('event-message').textContent = state.message; $('event-message').className = 'event-message ' + state.status;
  $('failure').hidden = state.status !== 'failed'; $('completion').hidden = state.status !== 'success';
  $('insight').textContent = level.insight || '';
  $('lab-next').hidden = !level.lab; $('lab-next').textContent = level.id === 'lab-tracks' ? '试试车厢实验台' : '进入测绘学馆';
  $('hint-button').disabled = state.status === 'failed';
}
function selectSeal(id) {
  if (session.state.status === 'failed') return;
  cancelWalk();
  if (!session.state.editing) perform({ type: 'edit' });
  if (selected == null) { selected = id; notice('已选' + level.objects.find(object => object.id === id).name + '，再选一个纹章。'); }
  else {
    const a = selected; selected = null;
    perform({ type: Game.linked(session.state, a, id) ? 'unlink' : 'link', a, b: id });
  }
}
async function followRoute(route, after) {
  const token = ++walkToken; walking = route.length > 0;
  for (const point of route) {
    if (token !== walkToken || !level || session.state.editing || session.state.status === 'failed') return;
    const delta = point.map((value, axis) => value - session.state.player.pos[axis]);
    perform({ type: 'walk', delta }, true);
    if (session.state.status === 'success') { walking = false; render(); return; }
    if (session.state.player.pos.some((value, axis) => value !== point[axis])) { cancelWalk(); return; }
    await new Promise(resolve => setTimeout(resolve, 105));
  }
  if (token === walkToken) { walking = false; if (after) after(); else render(); }
}
function freeHands() {
  if (session.state.held) perform({ type: 'release' });
  return session.state.status !== 'failed';
}
function walkTo(destination) {
  if (session.state.status === 'failed') return;
  cancelWalk(); if (session.state.editing) { notice('先结束映射，再走路。'); return; }
  if (!freeHands()) return;
  const route = Game.routeTo(level, session.state, destination);
  if (!route) { notice('这里暂时到不了。'); return; }
  followRoute(route);
}
function grabObject(id) {
  if (session.state.status === 'failed') return;
  cancelWalk(); if (session.state.editing) { notice('先结束映射，再推拉。'); return; }
  if (session.state.held === id) { perform({ type: 'release' }); return; }
  if (!freeHands()) return;
  if (Game.canGrab(level, session.state, id)) { perform({ type: 'grab', id }); return; }
  const grip = Game.gripPosition(level, session.state, id);
  if (!grip) return;
  const options = [grip, ...[[1, 0], [0, 1], [-1, 0], [0, -1]].map(delta => grip.map((value, i) => value + delta[i]))]
    .map(destination => ({ destination, route: Game.routeTo(level, session.state, destination) })).filter(option => option.route);
  options.sort((a, b) => Number(b.destination.join(',') === grip.join(',')) - Number(a.destination.join(',') === grip.join(',')) || a.route.length - b.route.length);
  if (!options.length) { notice('目前走不到这个推拉处。'); return; }
  followRoute(options[0].route, () => perform({ type: 'grab', id }));
}
function move(delta) {
  if (session.state.status === 'failed') return;
  cancelWalk();
  if (session.state.held && !session.state.editing) {
    const object = level.objects.find(object => object.id === session.state.held);
    const direction = delta[0] * object.axis[0] + delta[1] * object.axis[1];
    if (direction) perform({ type: 'push', direction }); else notice('抓住时，沿刻轨的箭头推拉；松手后可走路。');
  } else perform({ type: 'walk', delta });
}
function reset() { cancelWalk(); session = Game.createSession(level); selected = null; hintIndex = 0; $('hint').hidden = true; render(); }
function undo() { cancelWalk(); session = Game.undoSession(session); selected = null; render(); }
function activateScene(event) {
  const seal = event.target.closest('[data-seal]'); if (seal) { selectSeal(seal.dataset.seal); return; }
  const edge = event.target.closest('[data-edge-a]');
  if (edge) { if (!session.state.editing) perform({ type: 'edit' }); selected = null; perform({ type: 'unlink', a: edge.dataset.edgeA, b: edge.dataset.edgeB }); return; }
  const grip = event.target.closest('[data-grab]'); if (grip) { grabObject(grip.dataset.grab); return; }
  const exit = event.target.closest('[data-walk]'); if (exit) { walkTo(exit.dataset.walk.split(',').map(Number)); return; }
  if (event.type === 'keydown') return;
  const matrix = $('scene').getScreenCTM(); if (!matrix) return;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  walkTo(View.worldPoint(level, [point.x, point.y]));
}
$('scene').onclick = activateScene;
$('scene').onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); activateScene(event); } };
$('courtyard').onclick = event => { const portal = event.target.closest('[data-portal]'); if (portal) loadLevel(portal.dataset.portal); };
$('courtyard').onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); const portal = event.target.closest('[data-portal]'); if (portal) loadLevel(portal.dataset.portal); } };
$('start').onclick = () => loadLevel('lab-tracks');
$('back-home').onclick = home; $('complete-home').onclick = home;
$('mapping').onclick = () => { selected = null; perform({ type: 'edit' }); };
$('undo').onclick = undo; $('failure-undo').onclick = undo;
$('reset').onclick = reset; $('failure-reset').onclick = reset;
$('grab').onclick = () => { if (session.state.held) perform({ type: 'release' }); else { const object = level.objects.find(item => item.grip && Game.canGrab(level, session.state, item.id)); if (object) grabObject(object.id); } };
$('forward').onclick = () => perform({ type: 'push', direction: 1 });
$('backward').onclick = () => perform({ type: 'push', direction: -1 });
$('hint-button').onclick = () => { $('hint').hidden = false; $('hint').textContent = level.hints[Math.min(hintIndex++, level.hints.length - 1)]; };
$('lab-next').onclick = () => loadLevel(level.id === 'lab-tracks' ? 'lab-cart' : 'long-door');
$('next-room').onclick = () => { const next = Levels.LEVELS[Levels.LEVELS.indexOf(level) + 1]; if (next) loadLevel(next.id); else home(); };
for (const node of document.querySelectorAll('[data-direction]')) {
  const delta = node.dataset.direction.split(',').map(Number), angle = Math.atan2(delta[1], delta[0]) * 180 / Math.PI + 90;
  node.append(View.icon('arrowUp', 20, angle)); node.onclick = () => move(delta);
}
withIcon($('back-home'), 'home', '学院'); withIcon($('undo'), 'undo', '撤回');
$('help-button').onclick = () => $('help').showModal(); $('close-help').onclick = () => $('help').close();
$('clear-progress').onclick = () => { solved.clear(); persist(); $('help').close(); home(); };
window.addEventListener('keydown', event => {
  if (!level || $('help').open || event.ctrlKey || event.metaKey || event.altKey || event.target.matches('input,textarea,select')) return;
  const keys = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (keys[key]) { event.preventDefault(); move(keys[key]); }
  else if (key === 'm') { event.preventDefault(); selected = null; perform({ type: 'edit' }); }
  else if (key === 'z') { event.preventDefault(); undo(); }
  else if (key === 'e') { event.preventDefault(); $('grab').click(); }
  else if (key === 'Escape') { cancelWalk(); if (session.state.editing) { selected = null; perform({ type: 'edit' }); } else if (session.state.held) perform({ type: 'release' }); }
});
home();

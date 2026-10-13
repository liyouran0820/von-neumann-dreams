import * as Game from './engine.js';
import { LEVELS } from './levels.js';
import { createDiorama } from './renderer.js';
import { ICONS } from './icons.js';

const $ = id => document.getElementById(id);
const KEY = 'night-white-five-v1-progress';
const worldName = world => world === 'day' ? '白' : '夜';
const objectName = id => ({ A: '实验箱', B: '第一座桥', C: '第二座桥' })[id];
const media = matchMedia('(prefers-reduced-motion: reduce)');
let completed = [];
try { const saved = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(saved)) completed = saved.filter(id => LEVELS.some(level => level.id === id)); } catch { /* 存储可选。 */ }
let index = 0, level = LEVELS[0], state = Game.createState(level), hint = 0, walking = 0, lastAction = '', diorama;
let message = '先点任意一侧的实验箱，查看映射。';
function persist() { try { localStorage.setItem(KEY, JSON.stringify(completed)); } catch { /* 无存储也可玩。 */ } }
function icon(name, rotation = 0) {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="transform:rotate(${rotation}deg)">${ICONS[name].map(d => `<path d="${d}"/>`).join('')}</svg>`;
}
function renderAnchors(world, anchors) {
  const root = $(world + '-hotspots'), remaining = new Set();
  for (const anchor of anchors) {
    const key = anchor.kind + ':' + (anchor.id || anchor.cell.join(',')); remaining.add(key);
    let button = [...root.children].find(node => node.dataset.anchor === key);
    if (!button) {
      button = document.createElement('button'); button.type = 'button'; button.className = 'scene-hotspot'; button.dataset.anchor = key;
      button.dataset.world = world; button.dataset.kind = anchor.kind;
      if (anchor.id) button.dataset.object = anchor.id;
      const label = anchor.kind === 'object' ? '选择' + objectName(anchor.id) : anchor.kind === 'portal' ? '走到' + (anchor.id === 'P1' ? '一号' : '二号') + '门座' : '走到出口';
      button.setAttribute('aria-label', worldName(world) + '世界：' + label); button.title = label;
      button.addEventListener('click', event => { event.stopPropagation(); handlePick({ world, kind: button.dataset.kind === 'object' ? 'object' : 'cell', id: button.dataset.object, x: Number(button.dataset.x), y: Number(button.dataset.y) }); });
      root.append(button);
    }
    button.dataset.x = Math.round(anchor.cell[0]); button.dataset.y = Math.round(anchor.cell[1]);
    button.style.left = anchor.x + 'px'; button.style.top = anchor.y + 'px';
    button.classList.toggle('selected', anchor.kind === 'object' && state.preview?.id === anchor.id && state.preview.world === world);
    button.disabled = state.failed || state.won;
  }
  for (const node of [...root.children]) if (!remaining.has(node.dataset.anchor)) node.remove();
}
try {
  diorama = createDiorama({ dayElement: $('day-scene'), nightElement: $('night-scene'), onPick: handlePick, onProject: renderAnchors, onError: () => { $('render-error').hidden = false; $('render-error').textContent = '3D 场景未能启动，请重新载入页面。'; } });
  diorama.setReducedMotion(media.matches);
} catch (error) { console.error(error); }
$('reduced-motion').checked = media.matches;
media.addEventListener('change', event => { $('reduced-motion').checked = event.matches; diorama?.setReducedMotion(event.matches); });
function goalLabels() {
  return Game.goals(level, state).map(goal => {
    const body = goal.label.startsWith('身体');
    const label = body ? level.id === 'G5' ? '结业环' : '出口' : goal.label.startsWith('夜') ? level.id === 'G5' ? '夜侧校准槽' : '夜侧实验槽' : level.id === 'G1' ? '白侧实验槽' : '白侧踏板';
    return { ...goal, label };
  });
}
function render(meta = {}) {
  if (state.won && !completed.includes(level.id)) { completed.push(level.id); persist(); }
  $('chapter').textContent = String(index + 1).padStart(2, '0') + ' / 05';
  $('title').textContent = level.name.split(' · ')[0];
  $('goal').textContent = level.goal.replace(/夜箱到6、白箱到4，身体踏上夜C桥末端验收环。/, '让两侧实验槽亮起，穿过夜侧桥上的验收环。');
  $('levels').innerHTML = LEVELS.map((item, i) => `<button data-level="${i}" aria-current="${i === index ? 'step' : 'false'}"><span>${String(i + 1).padStart(2, '0')}</span><strong>${item.name.split(' · ')[0]}</strong><small>${completed.includes(item.id) ? '已抵达' : item.name.split(' · ')[1]}</small></button>`).join('');
  for (const world of ['day', 'night']) {
    $(world + '-world').classList.toggle('is-focused', state.view === world);
    $(world + '-body').hidden = state.body.world !== world;
    $(world + '-focus').hidden = state.view !== world;
    document.querySelector(`[data-focus-world="${world}"]`).setAttribute('aria-pressed', String(state.view === world));
    const feedback = state.feedback?.[world];
    $(world + '-feedback').textContent = lastAction === 'push' && feedback ? feedback.blocked ? '止挡 · 这一侧停住了' : '沿轨道移动一格' : '';
    $(world + '-feedback').classList.toggle('blocked', Boolean(feedback?.blocked));
  }
  $('body-view').hidden = state.view === state.body.world;
  $('body-view').textContent = '回到' + worldName(state.body.world) + '侧身体';
  $('mapping-status').innerHTML = icon('link') + `<span>${state.mapping ? objectName(state.mapping) + ' · 1/1' : '映射 · 0/1'}</span>`;
  const options = ['day', 'night'].flatMap(world => [ ...(level.track ? [{ id: 'A', world }] : []), ...level.bridges.filter(bridge => bridge.world === world) ]);
  $('objects').innerHTML = options.map(object => `<button data-select-object="${object.id}" data-source-world="${object.world}"><span>${worldName(object.world)}世界</span><strong>${objectName(object.id)}</strong></button>`).join('');
  $('goals').innerHTML = goalLabels().map((goal, i) => `<li class="${goal.ok ? 'satisfied' : ''}${goal.required === false ? ' optional' : ''}" data-goal="${i}" aria-label="${goal.label}${goal.ok ? '已满足' : '未满足'}"><i></i><span>${goal.label}</span></li>`).join('');
  $('selection-card').hidden = !state.preview || state.failed || state.won;
  if (state.preview) {
    $('selection-name').textContent = worldName(state.preview.world) + '侧 · ' + objectName(state.preview.id);
    let description = state.preview.id === 'A' ? '连接两侧的真实箱子，当前位置保留。' : '在' + worldName(Game.other(state.preview.world)) + '侧生成实体桥。';
    const oldBridge = level.bridges.find(bridge => bridge.id === state.mapping);
    if (oldBridge && state.preview.id !== state.mapping) description += '原来的虚影桥将消失。';
    if (!Game.canActivate(level, state)) description = '生成区域受阻，当前映射保留。';
    $('preview-status').textContent = description;
  }
  const frozen = state.failed || state.won;
  $('activate').disabled = $('confirm-preview').disabled = !Game.canActivate(level, state) || frozen;
  $('unlink').disabled = !state.mapping || frozen;
  $('undo').disabled = !state.history.length;
  $('teleport').disabled = frozen || state.view !== state.body.world || !level.portals.some(([x, y]) => x === state.body.x && y === state.body.y);
  document.querySelectorAll('[data-move]').forEach(button => button.disabled = frozen || state.view !== state.body.world);
  document.querySelectorAll('[data-push]').forEach(button => button.disabled = frozen || state.mapping !== 'A');
  $('message').textContent = message;
  $('failure').hidden = !state.failed; $('completion').hidden = !state.won;
  $('complete-title').textContent = index === 4 ? '天文台亮起，夜间课程完成。' : level.name.split(' · ')[0] + '已点亮。';
  $('next').hidden = index === 4;
  $('debug-state').textContent = JSON.stringify({ level: level.id, body: state.body, view: state.view, boxes: state.boxes, mapping: state.mapping, preview: state.preview, failed: state.failed, won: state.won, history: state.history.length }, null, 2);
  diorama?.update(state, meta);
}
function readableMessage(type, before, accepted) {
  if (state.failed) return '支撑消失了，随时可以撤回。';
  if (state.won) return '你的安排，让两侧连成了一条路。';
  if (type === 'push') return accepted ? '同一次推动，两侧各自回应。' : state.message;
  if (type === 'activate') return state.preview ? state.message : '映射已生效。';
  if (type === 'unlink') return before.mapping === 'A' ? '联系已解除，真实箱子的位置留下了。' : '联系已解除，虚影消失。';
  if (type === 'view') return state.view === state.body.world ? '现在可以移动身体。' : '观察另一侧，身体仍在' + worldName(state.body.world) + '世界。';
  if (type === 'move') return accepted ? '' : '这边暂时走不通。';
  if (type === 'teleport') return accepted ? '身体来到' + worldName(state.body.world) + '世界。' : '先走上门座，再穿门。';
  if (type === 'undo') return '回到上一步。';
  if (type === 'recover') return '已恢复当时的完整安全状态。';
  return '';
}
function action(type, arg, fromPath = false) {
  if (!fromPath) walking++;
  const before = { mapping: state.mapping, world: state.body.world };
  const accepted = Game.act(level, state, type, arg);
  lastAction = type; message = readableMessage(type, before, accepted);
  render({ type, direction: arg }); return accepted;
}
function focusWorld(world) {
  if (world !== state.view) action('view', world);
}
function chooseObject(id, world) {
  walking++; focusWorld(world);
  if (Game.select(level, state, id, world)) { lastAction = 'select'; message = '预览已就绪，确认后生效。'; render({ type: 'select' }); }
}
function handlePick(pick) {
  if (state.failed || state.won || document.querySelector('dialog[open]')) return;
  if (pick.kind === 'object') { chooseObject(pick.id, pick.world); return; }
  focusWorld(pick.world);
  if (pick.world !== state.body.world) { message = '身体仍在' + worldName(state.body.world) + '侧；穿门才能过去。'; render(); return; }
  const path = Game.findPath(level, state, Math.round(pick.x), Math.round(pick.y));
  if (!path) { message = '这里还没有可走的路线。'; render(); return; }
  const token = ++walking;
  (async () => {
    for (const step of path) {
      if (token !== walking || state.won || state.failed) return;
      if (!action('move', step, true)) return;
      await new Promise(resolve => setTimeout(resolve, media.matches ? 35 : 160));
    }
  })();
}
function load(i) {
  walking++; index = i; level = LEVELS[i]; state = Game.createState(level); hint = 0; lastAction = '';
  message = level.track ? '先点实验箱，查看两侧的映射。' : '比较两侧的桥，点真实桥查看预览。';
  $('hint-text').hidden = true; $('hint-text').textContent = ''; $('hint').textContent = '给我一点提示';
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  diorama?.setLevel(level, state); render({ instant: true });
}
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.level !== undefined) load(Number(button.dataset.level));
  else if (button.dataset.selectObject) { $('objects-dialog').close(); chooseObject(button.dataset.selectObject, button.dataset.sourceWorld); }
  else if (button.dataset.focusWorld) focusWorld(button.dataset.focusWorld);
  else if (button.dataset.move) action('move', button.dataset.move.split(',').map(Number));
  else if (button.dataset.push) action('push', button.dataset.push);
});
for (const [id, type] of [['view', 'view'], ['activate', 'activate'], ['confirm-preview', 'activate'], ['cancel-preview', 'cancelPreview'], ['unlink', 'unlink'], ['teleport', 'teleport'], ['undo', 'undo'], ['failure-undo', 'undo'], ['failure-recover', 'recover']]) $(id).onclick = () => action(type);
$('body-view').onclick = () => focusWorld(state.body.world);
$('mapping-status').onclick = () => { walking++; $('objects-dialog').showModal(); };
$('open-levels').onclick = () => { walking++; $('levels-dialog').showModal(); };
$('open-help').onclick = () => { walking++; $('help-dialog').showModal(); };
$('reset').onclick = () => load(index); $('replay').onclick = () => load(index);
$('recover').onclick = () => { $('levels-dialog').close(); action('recover'); };
$('clear-progress').onclick = () => { completed = []; persist(); load(0); };
$('next').onclick = () => load(Math.min(4, index + 1));
$('hint').onclick = () => { hint = Math.min(hint + 1, level.hints.length); $('hint-text').hidden = false; $('hint-text').textContent = level.hints.slice(0, hint).join('\n'); $('hint').textContent = hint === level.hints.length ? '全部提示已展开' : '再给一点提示'; };
$('zoom-in').onclick = () => diorama?.zoom(.12); $('zoom-out').onclick = () => diorama?.zoom(-.12);
$('reduced-motion').onchange = event => diorama?.setReducedMotion(event.target.checked);
$('open-levels').innerHTML = icon('home');
document.querySelector('[data-push="left"]').innerHTML = icon('arrowUp', -90);
document.querySelector('[data-push="right"]').innerHTML = icon('arrowUp', 90);
window.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]') || event.target.matches('input,textarea,select')) return;
  const key = event.key.toLowerCase();
  const moves = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0] };
  const pushes = { arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down' };
  const keys = { v: 'view', e: 'activate', q: 'unlink', f: 'teleport', z: 'undo' };
  if (moves[key]) { event.preventDefault(); action('move', moves[key]); }
  else if (pushes[key]) { event.preventDefault(); action('push', pushes[key]); }
  else if (keys[key]) { event.preventDefault(); action(keys[key]); }
  else if (key === 'escape' && state.preview) action('cancelPreview');
});
window.addEventListener('pagehide', () => { walking++; diorama?.dispose(); });
load(0);

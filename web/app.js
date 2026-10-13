import * as Game from './engine.js';
import { LEVELS as ORIGINAL_LEVELS } from './levels.js';
import { ACADEMY_LEVELS } from './academy-levels.js';
import { OPTICS_LEVELS } from './optics-levels.js';
import { renderCourse, showNotebook, resetCourseNotes, dismissWelcome } from './course-ui.js';
import { createDiorama } from './renderer.js';
import { ICONS } from './icons.js';

const $ = id => document.getElementById(id);
const originalMode = new URLSearchParams(location.search).get('version') === 'original';
const opticsMode = new URLSearchParams(location.search).get('version') === 'optics';
const LEVELS = originalMode ? ORIGINAL_LEVELS : opticsMode ? OPTICS_LEVELS : ACADEMY_LEVELS;
const KEY = originalMode ? 'night-white-five-v1-progress' : opticsMode ? 'night-white-academy-v1-progress' : 'night-white-logic-gates-v1-progress';
const worldName = world => world === 'day' ? '白' : '夜';
const objectName = id => ({ A: '实验箱', B: '第一座桥', C: '第二座桥' })[id];
const media = matchMedia('(prefers-reduced-motion: reduce)');
let completed = [];
try { const saved = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(saved)) completed = saved.filter(id => LEVELS.some(level => level.id === id)); } catch { /* 存储可选。 */ }
let index = 0, level = LEVELS[0], state = Game.createState(level), hint = 0, walking = 0, lastAction = '', diorama;
let message = '先点任意一侧的实验箱，查看映射。';
let pendingReset = null;
function toggleObservation() {
  walking++;
  Game.act(level, state, 'view', { world: Game.other(state.view), recordHistory: false });
  lastAction = 'observe';
  message = state.view === state.body.world ? '已回到身体所在的世界。' : '身体留在' + worldName(state.body.world) + '侧，按空格切回。';
  render({ instant: true });
}
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
      const readout = ['readout','sensor'].includes(anchor.kind);
      button = document.createElement(readout ? 'span' : 'button'); if (!readout) button.type = 'button'; button.className = readout ? 'scene-readout' : 'scene-hotspot'; button.dataset.anchor = key;
      button.dataset.world = world; button.dataset.kind = anchor.kind;
      if (anchor.id) button.dataset.object = anchor.id;
      const label = anchor.kind === 'mirror' ? '转动镜面 ' + anchor.id : anchor.kind === 'switch' ? '切换开关 ' + anchor.id : readout ? (anchor.label || anchor.id) : anchor.kind === 'object' ? '选择' + objectName(anchor.id) : anchor.kind === 'portal' ? '走到' + (anchor.id === 'P1' ? '一号' : '二号') + '门座' : '走到出口';
      button.setAttribute('aria-label', worldName(world) + '世界：' + label); button.title = label;
      if (!readout) button.addEventListener('click', event => { event.stopPropagation(); handlePick({ world, kind: ['object','mirror','switch'].includes(button.dataset.kind) ? button.dataset.kind : 'cell', id: button.dataset.object, x: Number(button.dataset.x), y: Number(button.dataset.y) }); });
      root.append(button);
    }
    button.dataset.x = Math.round(anchor.cell[0]); button.dataset.y = Math.round(anchor.cell[1]);
    const offset = anchor.kind === 'mirror' || anchor.kind === 'switch' ? [24,-27] : ['sensor','readout'].includes(anchor.kind) ? [0,19] : [0,0];
    button.style.left = (anchor.x + offset[0]) + 'px'; button.style.top = (anchor.y + offset[1]) + 'px';
    if (['mirror','switch'].includes(anchor.kind)) { button.classList.add('instrument-hotspot'); button.innerHTML = `<b>${anchor.id}</b><small>${anchor.kind === 'mirror' ? '转动' : '开关'}</small>`; }
    if (anchor.kind === 'readout') button.textContent = anchor.label;
    if (anchor.kind === 'sensor') { const on=Game.scienceResult(level,state).optics.hits.includes(anchor.id); button.textContent=anchor.label+' '+(on?'1':'0');button.classList.toggle('on',on); }
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
    if (goal.label.startsWith('实验线路')) return { ...goal, label: level.science.scope === 'assessment' ? '与门验收' : level.science.doors ? '后门线路' : worldName(level.science.world) + '门线路' };
    const body = goal.label.startsWith('身体');
    const label = body ? level.id === 'G5' ? '入学验收环' : '出口' : goal.label.startsWith('夜') ? level.id === 'G5' ? '夜侧校准槽' : '夜侧实验槽' : level.id === 'G1' ? '白侧实验槽' : '白侧踏板';
    return { ...goal, label };
  });
}
function render(meta = {}) {
  if (state.won && !completed.includes(level.id)) { completed.push(level.id); persist(); }
  $('chapter').textContent = (originalMode ? '空间试炼 ' : '入学试炼 ') + (index + 1) + ' / ' + LEVELS.length;
  $('title').textContent = level.name.split(' · ')[0];
  $('goal').textContent = level.goal.replace(/夜箱到6、白箱到4，身体踏上夜C桥末端验收环。/, '让两侧实验槽亮起，穿过夜侧桥上的验收环。');
  $('levels').innerHTML = LEVELS.map((item, i) => `<button data-level="${i}" aria-current="${i === index ? 'step' : 'false'}"><span>${String(i + 1).padStart(2, '0')}</span><strong>${item.name.split(' · ')[0]}</strong><small>${completed.includes(item.id) ? '课程通过' : item.academy?.title || item.name.split(' · ')[1]}</small></button>`).join('');
  renderCourse(level, state, index);
  $('science-help').hidden = !level.science;
  for (const world of ['day', 'night']) {
    $(world + '-world').classList.toggle('inactive', state.view !== world);
    $(world + '-world').setAttribute('aria-hidden', String(state.view !== world));
    $(world + '-world').classList.toggle('is-focused', state.view === world);
    $(world + '-body').hidden = false;
    $(world + '-body').textContent = state.body.world === world ? '身体所在' : '身体在' + worldName(state.body.world) + '侧';
    $(world + '-focus').hidden = state.view !== world;
    document.querySelector(`[data-focus-world="${world}"]`).setAttribute('aria-pressed', String(state.view === world));
    const feedback = state.feedback?.[world];
    $(world + '-feedback').textContent = lastAction === 'push' && feedback ? feedback.blocked ? '止挡 · 推力已作用' : '沿轨道移动一格' : '';
    $(world + '-feedback').classList.toggle('blocked', Boolean(feedback?.blocked));
  }
  $('body-view').hidden = true;
  $('view').setAttribute('aria-pressed', String(state.view !== state.body.world));
  $('mapping-status').innerHTML = icon('link') + `<span>${state.mapping ? objectName(state.mapping) + ' · 1/1' : '映射 · 0/1'}</span>`;
  const options = [ ...(level.track ? [{ id: 'A', world: state.view }] : []), ...level.bridges.filter(bridge => bridge.world === state.view) ];
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
  $('complete-title').textContent = level.academy?.completion || (index === 4 ? '天文台亮起，夜间课程完成。' : level.name.split(' · ')[0] + '已点亮。');
  $('next').hidden = index === 4;
  diorama?.update(state, meta);
  diorama?.setActiveWorld(state.view);
}
function readableMessage(type, before, accepted) {
  if (state.failed) return '支撑消失了，随时可以撤回。';
  if (state.won) return '你的安排，让两侧连成了一条路。';
  if (type === 'push') return accepted ? ['night', 'day'].map(world => worldName(world)+'侧'+(state.feedback?.[world]?.blocked?'受阻，推力已作用':'移动一格')).join(' · ') : state.message;
  if (type === 'mirror' || type === 'switch') return accepted ? (type === 'mirror' ? '镜面已转动，观察光输入与逻辑输出。' : '开关已改变，沿线路观察输出。') : '先用空格切到实验器材所在世界。';
  if (type === 'activate') return state.preview ? state.message : '映射已生效。';
  if (type === 'unlink') return before.mapping === 'A' ? '联系已解除，真实箱子的位置留下了。' : '联系已解除，虚影消失。';
  if (type === 'view') return state.view === state.body.world ? '现在可以移动身体。' : '观察另一侧，身体仍在' + worldName(state.body.world) + '世界。';
  if (type === 'move') return accepted ? '' : state.view !== state.body.world ? '按空格回到身体所在的世界，再走路。' : state.message || '这边暂时走不通。';
  if (type === 'teleport') return accepted ? '身体来到' + worldName(state.body.world) + '世界。' : state.view !== state.body.world ? '按空格回到身体所在的世界，再穿门。' : '先走上门座，再穿门。';
  if (type === 'undo') return '回到上一步。';
  if (type === 'recover') return '已恢复当时的完整安全状态。';
  return '';
}
function action(type, arg, fromPath = false) {
  if (!fromPath) walking++;
  const before = { mapping: state.mapping, world: state.body.world };
  const accepted = Game.act(level, state, type, arg);
  lastAction = accepted ? type : ''; message = readableMessage(type, before, accepted);
  render({ type: accepted ? type : undefined, direction: arg }); return accepted;
}
function focusWorld(world) {
  if (world !== state.view) toggleObservation();
}
function chooseObject(id, world) {
  walking++; if (world !== state.view) return;
  if (Game.select(level, state, id, world)) { lastAction = 'select'; message = '预览已就绪，确认后生效。'; render({ type: 'select' }); }
}
function handlePick(pick) {
  if (state.failed || state.won || document.querySelector('dialog[open]')) return;
  if (pick.world !== state.view) return;
  if (pick.kind === 'mirror' || pick.kind === 'switch') { action(pick.kind, pick.id); return; }
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
  document.body.classList.remove('course-collapsed'); $('course-collapse').setAttribute('aria-expanded','true');$('course-collapse').textContent='收起';
  message = level.track ? '先点实验箱，查看两侧的映射。' : '比较两侧的桥，点真实桥查看预览。';
  $('hint-text').hidden = true; $('hint-text').textContent = ''; $('hint').textContent = '给我一点提示';
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  diorama?.setLevel(level, state); render({ instant: true });
}
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.level !== undefined) load(Number(button.dataset.level));
  else if (button.dataset.selectObject) { $('objects-dialog').close(); chooseObject(button.dataset.selectObject, button.dataset.sourceWorld); }
  else if (button.dataset.signal) action('switch', button.dataset.signal);
  else if (button.dataset.focusWorld) focusWorld(button.dataset.focusWorld);
  else if (button.dataset.move) action('move', button.dataset.move.split(',').map(Number));
  else if (button.dataset.push) action('push', button.dataset.push);
});
for (const [id, type] of [['activate', 'activate'], ['confirm-preview', 'activate'], ['cancel-preview', 'cancelPreview'], ['unlink', 'unlink'], ['teleport', 'teleport'], ['undo', 'undo'], ['failure-undo', 'undo'], ['failure-recover', 'recover']]) $(id).onclick = () => action(type);
$('view').onclick = () => toggleObservation();
window.addEventListener('blur', () => { walking++; });
document.addEventListener('visibilitychange', () => { if (document.hidden) walking++; });
$('body-view').onclick = () => focusWorld(state.body.world);
$('mapping-status').onclick = () => { walking++; $('objects-dialog').showModal(); };
$('open-levels').onclick = () => { walking++; $('levels-dialog').showModal(); };
$('open-help').onclick = () => { walking++; $('help-dialog').showModal(); };
$('open-notebook').onclick = () => { walking++; showNotebook(level); };
$('dismiss-welcome').onclick = dismissWelcome;
$('science-observe').onclick = () => focusWorld(level.science.world);
$('science-mirror').onclick = () => action('mirror','M');
$('course-collapse').onclick = () => { const collapsed=document.body.classList.toggle('course-collapsed');$('course-collapse').setAttribute('aria-expanded',String(!collapsed));$('course-collapse').textContent=collapsed?'展开':'收起'; };
$('levels-dialog').querySelector('h2').textContent = originalMode ? '原版空间试炼' : '新生入学试炼';
function requestReset(kind) {
  walking++;
  pendingReset = kind;
  const clear = kind === 'progress';
  $('reset-title').textContent = clear ? '清除当前版本的通关记录？' : '重新开始本关？';
  $('reset-description').textContent = clear ? (originalMode ? '当前版本的通关记录和本关进展将被清除，并返回第一关。此操作不能撤销。' : '当前版本的通关记录、实验札记和本关进展将被清除，并返回第一关。此操作不能撤销。') : '本关的箱子、映射、检查点和撤销历史将恢复到起点；已通关记录保留。';
  $('reset-confirm').textContent = clear ? '确认清除' : '确认重来';
  $('levels-dialog').close();
  $('reset-dialog').returnValue = 'cancel';
  $('reset-dialog').showModal();
}
$('reset-dialog').addEventListener('close', () => {
  const kind = pendingReset;
  pendingReset = null;
  if (!kind || $('reset-dialog').returnValue !== 'confirm') return;
  if (kind === 'progress') { completed = []; persist(); if(!originalMode)resetCourseNotes(); load(0); }
  else load(index);
});
$('reset').onclick = () => requestReset('level'); $('replay').onclick = () => load(index);
$('recover').onclick = () => { $('levels-dialog').close(); action('recover'); };
$('clear-progress').onclick = () => requestReset('progress');
$('next').onclick = () => load(Math.min(4, index + 1));
$('hint').onclick = () => { hint = Math.min(hint + 1, level.hints.length); $('hint-text').hidden = false; $('hint-text').textContent = level.hints.slice(0, hint).join('\n'); $('hint').textContent = hint === level.hints.length ? '全部提示已展开' : '再给一点提示'; };
$('zoom-in').onclick = () => diorama?.zoom(.12); $('zoom-out').onclick = () => diorama?.zoom(-.12);
$('reduced-motion').onchange = event => diorama?.setReducedMotion(event.target.checked);
$('open-levels').innerHTML = icon('home');
document.querySelector('[data-push="left"]').innerHTML = icon('arrowUp', -90);
document.querySelector('[data-push="right"]').innerHTML = icon('arrowUp', 90);
window.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]') || event.target.matches('input,textarea,select')) return;
  if (event.code === 'Space') { event.preventDefault(); event.stopPropagation(); if (!event.repeat) toggleObservation(); return; }
  if (event.code === 'KeyR' && level.science?.mirrors?.length) { event.preventDefault(); if(!event.repeat)action('mirror','M');return; }
  const key = event.key.toLowerCase();
  const moves = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0] };
  const pushes = { arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down' };
  const keys = { e: 'activate', q: 'unlink', f: 'teleport', z: 'undo' };
  if (moves[key]) { event.preventDefault(); action('move', moves[key]); }
  else if (pushes[key]) { event.preventDefault(); action('push', pushes[key]); }
  else if (keys[key]) { event.preventDefault(); action(keys[key]); }
  else if (key === 'escape' && state.preview) action('cancelPreview');
}, true);
window.addEventListener('pagehide', () => { walking++; diorama?.dispose(); });
load(0);

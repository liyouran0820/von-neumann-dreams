import * as Game from './engine.js';
import * as Levels from './levels.js';

const $ = id => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
const storageKey = 'von-neumann-dreams-exchange-v2';
let saved = {};
try {
  const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed;
} catch { /* Persistence is optional. */ }
const drafts = {};
for (const level of Levels.LEVELS) {
  drafts[level.id] = [...(Game.validProgram(saved.programs?.[level.id], level) ? saved.programs[level.id] : level.initialProgram)];
}
const solved = new Set(Array.isArray(saved.solved) ? saved.solved.filter(id => Levels.LEVELS.some(level => level.id === id)) : []);
let index = 0, level = Levels.LEVELS[0], session = Game.createSession(level, drafts[level.id]);
let running = false, timer = null, editingSlot = -1, selectedCell = null, hintIndex = 0;
let message = '点程序格选择指令，然后运行。';

function html(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function svg(tag, attrs = {}) {
  const node = document.createElementNS(ns, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}
function glyph(code, size = 28) {
  const icon = svg('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'glyph code-' + code });
  icon.append(svg('use', { href: '#icon-' + code }));
  return icon;
}
function persist() {
  saved.programs = Object.fromEntries(Object.entries(drafts).map(([id, draft]) => [id, [...draft]]));
  saved.solved = [...solved];
  try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* The game works without storage. */ }
}
function pause() { running = false; clearTimeout(timer); timer = null; }
function restart(text = '地面回到原状，起始程序保留。') {
  pause(); session = Game.createSession(level, drafts[level.id]); editingSlot = -1; message = text;
}
function loadLevel(next) {
  pause(); index = next; level = Levels.LEVELS[index]; editingSlot = -1; selectedCell = null; hintIndex = 0;
  $('hint-text').hidden = true;
  restart('点程序格选择指令，然后运行。'); render(); window.scrollTo(0, 0);
}
function tick() {
  if (session.state.status !== 'ready') return;
  const previous = session.state;
  session = Game.stepSession(level, session);
  const event = session.events.at(-1);
  message = session.state.reason || event.message;
  if (event.swap && event.swap.incoming === event.swap.outgoing) {
    message = '脚下和第 ' + (event.swap.slot + 1) + ' 格都是“' + Game.INSTRUCTIONS[event.swap.incoming].name + '”，内容不变，程序继续到下一格。';
  }
  if (session.state.status === 'success') { solved.add(level.id); persist(); }
  if (session.state.status !== 'ready') pause();
  render(previous);
}
function schedule() {
  if (!running) return;
  tick();
  if (running) timer = setTimeout(schedule, 650);
}
function renderChapters() {
  $('chapters').replaceChildren(...Levels.LEVELS.map((current, i) => {
    const button = html('button', 'chapter-button');
    button.type = 'button'; button.dataset.level = i;
    button.setAttribute('aria-current', String(i === index));
    button.setAttribute('aria-label', '第' + (i + 1) + '关 ' + current.name);
    button.append(html('span', 'chapter-number', current.number), html('span', '', current.name));
    if (solved.has(current.id)) button.append(html('span', 'chapter-done', '完成'));
    return button;
  }));
}
function renderProgram() {
  const state = session.state;
  $('program').replaceChildren(...state.program.map((code, slot) => {
    const button = html('button', 'program-slot code-' + code);
    button.id = 'slot-' + slot; button.type = 'button'; button.dataset.slot = slot;
    button.disabled = running; button.classList.toggle('is-next', state.status === 'ready' && state.pc === slot);
    button.classList.toggle('is-received', state.lastSwap?.slot === slot);
    button.setAttribute('aria-label', '编辑第' + (slot + 1) + '格，目前是' + Game.INSTRUCTIONS[code].name);
    button.setAttribute('aria-expanded', String(editingSlot === slot));
    button.setAttribute('aria-controls', 'palette');
    button.append(html('span', 'slot-number', String(slot + 1).padStart(2, '0')), glyph(code, 34), html('strong', '', Game.INSTRUCTIONS[code].name));
    if (state.steps && drafts[level.id][slot] !== code) button.append(html('small', 'original-code', '原：' + Game.INSTRUCTIONS[drafts[level.id][slot]].name));
    return button;
  }));
  $('next-slot').textContent = state.status === 'success' ? '抵达出口' : '将执行 ' + (state.pc + 1);
  $('palette').hidden = editingSlot < 0;
  if (editingSlot >= 0) {
    $('palette-title').textContent = '选择第 ' + (editingSlot + 1) + ' 格的指令';
    $('palette-options').replaceChildren(...Game.CODES.map(code => {
      const button = html('button', 'palette-option code-' + code);
      button.type = 'button'; button.dataset.code = code;
      button.setAttribute('aria-label', '选择' + Game.INSTRUCTIONS[code].name);
      button.setAttribute('aria-pressed', String(state.program[editingSlot] === code));
      button.append(glyph(code, 24), html('span', '', Game.INSTRUCTIONS[code].name));
      return button;
    }));
  }
  $('draft').hidden = !state.steps;
  $('draft').textContent = '起始：' + drafts[level.id].map(code => Game.INSTRUCTIONS[code].name).join(' · ');
}
function point(cell) {
  const [x, y] = cell.split(',').map(Number);
  return [50 + x * 86, 50 + y * 86];
}
function renderScene(previous) {
  const state = session.state;
  const width = (Math.max(...level.cells.map(cell => cell.x)) + 1) * 86 + 94;
  const height = (Math.max(...level.cells.map(cell => cell.y)) + 1) * 86 + 98;
  $('scene').setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  $('scene').setAttribute('aria-label', level.name + '的庭院，纸灵在' + state.cell + '，朝' + Game.DIRECTIONS[state.facing]);
  const root = svg('g');
  for (const cell of level.cells) {
    const key = cell.x + ',' + cell.y, code = state.floor[key], [x, y] = point(key);
    const group = svg('g', { class: 'floor-cell code-' + code, 'data-cell': key, 'data-code': code, role: 'button', tabindex: 0, 'aria-label': '查看地面 ' + key + '，' + Game.INSTRUCTIONS[code].name + (key === level.goal ? '，出口' : '') + (key === state.cell ? '，纸灵在这里' : ''), 'aria-pressed': String(selectedCell === key) });
    group.classList.toggle('is-current', key === state.cell);
    group.classList.toggle('is-selected', key === selectedCell);
    group.classList.toggle('was-changed', code !== cell.code);
    group.classList.toggle('was-swapped', state.lastSwap?.cell === key);
    group.append(svg('rect', { x, y: y + 7, width: 74, height: 74, rx: 10, class: 'tile-side' }));
    group.append(svg('rect', { x, y, width: 74, height: 74, rx: 10, class: 'tile-top' }));
    group.append(svg('path', { d: 'M' + (x + 11) + ' ' + (y + 16) + 'V' + (y + 11) + 'H' + (x + 16), class: 'tile-print' }));
    const icon = glyph(code, 36); icon.setAttribute('x', x + 19); icon.setAttribute('y', y + 19); group.append(icon);
    if (key === level.start) {
      const label = svg('text', { x: x + 6, y: y - 12, class: 'scene-label' }); label.textContent = '起点'; group.append(label);
    }
    if (key === level.goal) {
      group.append(svg('rect', { x: x - 5, y: y - 5, width: 84, height: 84, rx: 13, class: 'exit-frame' }));
      const label = svg('text', { x: x + 37, y: y + 99, 'text-anchor': 'middle', class: 'exit-label' }); label.textContent = '出口'; group.append(label);
    }
    if (code !== cell.code) group.append(svg('circle', { cx: x + 64, cy: y + 64, r: 3, class: 'changed-mark' }));
    root.append(group);
  }
  const [x, y] = point(state.cell);
  const spirit = svg('g', { transform: 'translate(' + (x + 58) + ' ' + (y + 13) + ')', 'aria-hidden': 'true', class: 'paper-spirit' });
  const motion = svg('g', { class: previous && previous.cell !== state.cell ? 'spirit-motion' : '' });
  if (previous && previous.cell !== state.cell) {
    const before = point(previous.cell);
    motion.setAttribute('style', '--from-x:' + (before[0] - x) + 'px;--from-y:' + (before[1] - y) + 'px');
  }
  motion.append(svg('ellipse', { cx: 0, cy: 7, rx: 17, ry: 7, fill: '#53685b', opacity: .13 }));
  const folded = svg('g', { transform: 'rotate(' + state.facing * 90 + ')' });
  folded.append(svg('path', { d: 'M0 -21L14 13 0 7-14 13Z', fill: '#fffdf5', stroke: '#527c70', 'stroke-width': 1.5 }));
  folded.append(svg('path', { d: 'M0 -21V7L14 13Z', fill: '#c2d4c6' }));
  folded.append(svg('path', { d: 'M0 -21V7', fill: 'none', stroke: '#e0e7d6', 'stroke-width': 1 }));
  motion.append(folded); spirit.append(motion); root.append(spirit);
  $('scene').replaceChildren(root);
  $('tile-inspector').hidden = !selectedCell;
  if (selectedCell) {
    const original = level.cells.find(cell => cell.x + ',' + cell.y === selectedCell).code;
    $('tile-inspector').textContent = '地面 ' + selectedCell + ' · ' + Game.INSTRUCTIONS[state.floor[selectedCell]].name + (original !== state.floor[selectedCell] ? ' · 原来是' + Game.INSTRUCTIONS[original].name : '');
  }
}
function renderPreview() {
  const state = session.state, target = state.lastSwap ? state.lastSwap.slot : (state.pc + 1) % state.program.length;
  const floor = html('div', 'preview-item code-' + state.floor[state.cell]);
  floor.append(html('span', 'preview-label', '脚下'), glyph(state.floor[state.cell], 21), html('strong', '', Game.INSTRUCTIONS[state.floor[state.cell]].name));
  const arrow = glyph('S', 23); arrow.classList.add('preview-arrow');
  const destination = html('div', 'preview-item code-' + state.program[target]);
  destination.append(html('span', 'preview-label', '程序第 ' + (target + 1) + ' 格'), glyph(state.program[target], 21), html('strong', '', Game.INSTRUCTIONS[state.program[target]].name));
  $('exchange-preview').classList.toggle('did-swap', Boolean(state.lastSwap));
  $('exchange-preview').replaceChildren(html('p', 'preview-title', state.lastSwap ? '刚刚交换了这两处' : '如果现在执行交换'), floor, arrow, destination);
}
function render(previous) {
  const state = session.state;
  renderChapters(); renderProgram(); renderScene(previous); renderPreview();
  $('chapter-eyebrow').textContent = 'CHAPTER ' + level.number + ' / ' + level.subtitle;
  $('chapter-title').textContent = level.name;
  $('actor-state').textContent = '纸灵 ' + state.cell + ' · 朝' + Game.DIRECTIONS[state.facing];
  $('step-count').textContent = String(state.steps).padStart(2, '0') + ' 拍';
  $('run').textContent = running ? '暂停' : state.status === 'success' ? '再运行' : state.status === 'blocked' ? '重试' : state.steps ? '继续' : '运行';
  $('step').disabled = running || state.status !== 'ready';
  $('undo').disabled = !session.history.length || running;
  $('event-message').textContent = message;
  $('event-message').className = 'event-message ' + state.status;
  $('completion').hidden = state.status !== 'success'; $('insight').textContent = level.insight;
  $('next-level').textContent = index < Levels.LEVELS.length - 1 ? '下一关' : '回到第一关';
  $('trace-count').textContent = session.events.length;
  $('trace-list').replaceChildren(...session.events.slice(-15).map(event => {
    const li = html('li');
    li.append(html('span', 'trace-step', String(event.step).padStart(2, '0')), html('span', '', event.message));
    return li;
  }));
  $('starter').disabled = running;
}
function selectCell(key) {
  if (!Object.hasOwn(session.state.floor, key)) return;
  selectedCell = key; renderScene();
}
$('chapters').onclick = event => {
  const button = event.target.closest('[data-level]');
  if (button) loadLevel(Number(button.dataset.level));
};
$('program').onclick = event => {
  const button = event.target.closest('[data-slot]'); if (!button || running) return;
  const slot = Number(button.dataset.slot);
  if (session.state.steps || session.state.status !== 'ready') restart('回到起点，开始修改起始程序。');
  editingSlot = editingSlot === slot ? -1 : slot; render();
  if (editingSlot >= 0) $('palette-options').querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
};
$('palette-options').onclick = event => {
  const button = event.target.closest('[data-code]'); if (!button || running || editingSlot < 0) return;
  const slot = editingSlot;
  drafts[level.id] = [...drafts[level.id]]; drafts[level.id][slot] = button.dataset.code;
  restart('起始程序已改写，地面回到原状。'); persist(); render(); $('slot-' + slot).focus({ preventScroll: true });
};
$('palette').onkeydown = event => {
  if (event.key === 'Escape') { const slot = editingSlot; editingSlot = -1; renderProgram(); $('slot-' + slot)?.focus(); }
};
document.addEventListener('click', event => {
  if (editingSlot >= 0 && !event.target.closest('#palette, #program')) { editingSlot = -1; renderProgram(); }
}, true);
$('scene').onclick = event => {
  const cell = event.target.closest('[data-cell]'); if (cell) selectCell(cell.dataset.cell);
};
$('scene').onkeydown = event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const cell = event.target.closest('[data-cell]'); if (cell) { event.preventDefault(); selectCell(cell.dataset.cell); $('scene').querySelector('[data-cell="' + cell.dataset.cell + '"]').focus({ preventScroll: true }); }
};
$('run').onclick = () => {
  if (running) { pause(); render(); return; }
  if (session.state.status !== 'ready') restart();
  editingSlot = -1; running = true; render(); timer = setTimeout(schedule, 150);
};
$('step').onclick = () => { pause(); editingSlot = -1; tick(); };
$('undo').onclick = () => {
  pause(); const previous = session.state; session = Game.undoSession(session); editingSlot = -1;
  message = '撤回了一次执行，程序和地面一起恢复。'; render(previous);
};
$('reset').onclick = () => { restart(); render(); };
$('starter').onclick = () => { drafts[level.id] = [...level.initialProgram]; restart('回到本关的起始程序。'); persist(); render(); };
$('hint').onclick = () => { $('hint-text').hidden = false; $('hint-text').textContent = level.hints[Math.min(hintIndex++, level.hints.length - 1)]; };
$('next-level').onclick = () => loadLevel((index + 1) % Levels.LEVELS.length);
$('help-toggle').onclick = () => {
  const open = $('help-panel').hidden; $('help-panel').hidden = !open; $('help-toggle').setAttribute('aria-expanded', String(open));
};
$('start-demo').onclick = () => { saved.started = true; persist(); $('welcome').close(); $('slot-0').focus({ preventScroll: true }); };
$('welcome').addEventListener('cancel', () => { saved.started = true; persist(); });
$('replay-guide').onclick = () => { loadLevel(0); $('help-panel').hidden = true; $('help-toggle').setAttribute('aria-expanded', 'false'); $('welcome').showModal(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && running) { pause(); render(); } });
window.addEventListener('pagehide', pause);
$('welcome-symbols').replaceChildren(...Game.CODES.map(code => {
  const item = html('span', 'welcome-symbol code-' + code); item.append(glyph(code, 25), html('b', '', Game.INSTRUCTIONS[code].name)); return item;
}));
render();
if (!saved.started) $('welcome').showModal();

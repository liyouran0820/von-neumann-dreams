import * as Game from './engine.js';
import * as Levels from './levels.js';

const $ = id => document.getElementById(id);
const storageKey = 'von-neumann-dreams-demo-v3';
let saved = {};
try { const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed; } catch { /* storage is optional */ }
let levelIndex = 0;
let level = Levels.LEVELS[0];
let world = Game.createState(level);
let program = [];
let running = false;
let timer = null;
let lens = Boolean(saved.lens);
let selected = 'pad';
let hintIndex = 0;
let trace = [];
let message = '先运行一次，观察纸灵的选择。';
let seen = new Set();
let draftBackup = null;
let advanced = false;
let editingRule = -1;
const solved = new Set(Array.isArray(saved.solved) ? saved.solved.filter(id => Levels.LEVELS.some(l => l.id === id)) : []);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const copyRules = rules => rules.map(rule => ({ ...rule }));

function validProgram(rules, current) {
  const actions = Game.actionsFor(current);
  return Array.isArray(rules) && rules.length > 0 && rules.length <= 10 && rules.every(r => current.conditions.some(c => c.id === r.condition) && actions.some(a => a.id === r.action) && typeof r.enabled === 'boolean');
}

function persist() {
  saved.programs ??= {};
  saved.programs[level.id] = copyRules(program);
  saved.lens = lens;
  saved.solved = [...solved];
  try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { /* local files may disable storage */ }
}

function pause() { running = false; clearTimeout(timer); timer = null; }

function resetWorld(text = '协议已重置，世界回到起点。') {
  pause(); world = Game.createState(level); trace = []; seen = new Set([Game.fingerprint(world)]); message = text;
}

function loadLevel(index) {
  pause(); levelIndex = index; level = Levels.LEVELS[index];
  const stored = saved.programs?.[level.id];
  program = copyRules(validProgram(stored, level) ? stored : levelIndex === 0 ? level.solution : level.initialProgram);
  selected = 'pad'; hintIndex = 0; draftBackup = null; editingRule = -1;
  $('hint-text').hidden = true; $('reference-tools').hidden = true;
  $('reference-alt').hidden = !level.alternative; $('restore-draft').hidden = true;
  resetWorld(levelIndex === 0 ? '点击右上角“运行”，让纸灵出发。' : '先运行，观察在哪里停住；点开指令卡修改后重试。'); render(); window.scrollTo(0, 0);
}

function shortAction(action) {
  const [type, target, source] = action.split(':');
  if (type === 'move') return '往前走';
  if (type === 'turn-left') return '向左转';
  if (type === 'turn-right') return '向右转';
  if (type === 'sample') return `记住${Game.nameOf(level, target)}的状态`;
  if (type === 'link') return `让${Game.nameOf(level, target)}跟随${source === 'memory' ? '符印' : Game.nameOf(level, source)}`;
  return action;
}

function renderLesson() {
  let guide = levelIndex === 0 ? '先点击“运行”。纸灵会按你的指令走到出口。' : levelIndex === 1 ? '月门需要暗。先运行看看，再点“修改”改变一张指令卡。' : '这次由你添加指令，让纸灵走过月门。';
  if (running) guide = '看发亮的指令卡：这就是纸灵正在执行的动作。';
  else if (world.status === 'blocked') guide = '程序停住了。查看状态，修改或调整指令后再运行。';
  else if (world.status === 'success') guide = levelIndex === 0 ? '试试改变指令的顺序，看看桥会怎样；也可以进入下一章。' : '你写的程序生效了。也可以改变指令，再试一次。';
  $('lesson-guide').textContent = guide;
  $('lesson-guide').hidden = advanced;
  document.body.classList.toggle('simple-mode', !advanced);
  document.body.classList.toggle('has-error', world.status === 'blocked');
  $('advanced-toggle').setAttribute('aria-pressed', String(advanced));
  $('advanced-toggle').textContent = advanced ? '收起全部条件' : '展开全部条件';
}

function editProgram(change, focusId) {
  if (running) return;
  change();
  resetWorld('协议已修改，纸灵从起点重新开始。'); persist(); render();
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
}

function performStep() {
  if (world.status === 'success') return false;
  const previousNode = world.node;
  const result = Game.stepProgram(level, world, program);
  world = result.state; message = result.event.message;
  if (!advanced && world.status === 'blocked') {
    const edge = Game.forwardEdge(level, world), signals = Game.signalsFor(level, world);
    if (edge?.gate && signals[edge.gate] === 0) {
      const device = level.devices.find(d => d.id === edge.gate);
      const source = world.bindings[device.id];
      message = `${device.name}还没开启：${Game.nameOf(level, source)}现在是${signals[source] ? '亮' : '暗'}，它需要${device.activeWhen ? '亮' : '暗'}。换一个动作再试试。`;
    } else if (!edge) message = '前方没有道路了。看看纸灵是否需要转向。';
    else if (result.event.ruleIndex == null) message = '前方可以走，但没有指令让纸灵前进。检查一下指令卡。';
  }
  trace.push({ ...result.event, step: world.steps });
  if (!['success', 'blocked'].includes(world.status)) {
    const key = Game.fingerprint(world);
    if (seen.has(key)) {
      world.status = 'blocked'; world.reason = message = '完整状态重复，程序进入循环。修改条件或优先级后重试。';
      const edge = Game.forwardEdge(level, world), signals = Game.signalsFor(level, world);
      if (!advanced && edge?.gate && signals[edge.gate] === 0) message = `${Game.nameOf(level, edge.gate)}仍关闭，这条指令没有改变状态。点“修改”试试其他动作。`;
    }
    else seen.add(key);
    if (world.steps >= 128) { world.status = 'blocked'; world.reason = message = '运行已达到 128 步预算。'; }
  }
  if (world.status === 'success') { solved.add(level.id); persist(); pause(); }
  if (world.status === 'blocked') pause();
  render(previousNode);
  return !['success', 'blocked'].includes(world.status);
}

function scheduleStep() {
  if (!running) return;
  if (performStep()) timer = setTimeout(scheduleStep, Number($('speed').value));
}

function renderChapters() {
  $('chapters').innerHTML = Levels.LEVELS.map((l, i) => `<button class="chapter-button" type="button" data-level="${i}" aria-current="${i === levelIndex}" aria-label="第${i + 1}章 ${l.name}"><span class="chapter-number">${l.number}</span><span>${l.name}</span>${solved.has(l.id) ? '<span class="chapter-done">已完成</span>' : ''}</button>`).join('');
}

function renderRules() {
  const actions = Game.actionsFor(level);
  $('rule-list').innerHTML = program.map((rule, index) => `<article class="rule-card ${world.lastRule === index ? 'is-active' : ''} ${rule.enabled === false ? 'is-disabled' : ''}" data-rule="${index}"><div class="rule-top"><button class="rule-enabled" data-command="enable" type="button" aria-pressed="${rule.enabled !== false}" aria-label="${rule.enabled === false ? '启用' : '停用'}规则${index + 1}" ${running ? 'disabled' : ''}><span></span><b class="rule-number">${String(index + 1).padStart(2, '0')}</b></button><div class="rule-actions"><button type="button" data-command="up" aria-label="上移规则${index + 1}" ${index === 0 || running ? 'disabled' : ''}>上移</button><button type="button" data-command="down" aria-label="下移规则${index + 1}" ${index === program.length - 1 || running ? 'disabled' : ''}>下移</button><button class="delete-rule" type="button" data-command="delete" aria-label="移除规则${index + 1}" ${program.length === 1 || running ? 'disabled' : ''}>移除</button></div></div><label class="rule-field"><span>当</span><select id="condition-${index}" data-field="condition" aria-label="规则${index + 1}的条件" ${running ? 'disabled' : ''}>${level.conditions.map(c => `<option value="${c.id}" ${c.id === rule.condition ? 'selected' : ''}>${escape(c.label)}</option>`).join('')}</select></label><label class="rule-field"><span>则</span><select id="action-${index}" class="action-select" data-field="action" aria-label="规则${index + 1}的行动" ${running ? 'disabled' : ''}>${actions.map(a => `<option value="${a.id}" ${a.id === rule.action ? 'selected' : ''}>${escape(a.label)}</option>`).join('')}</select></label></article>`).join('');
  for (const [index, card] of [...$('rule-list').children].entries()) {
    card.classList.toggle('is-editing', editingRule === index);
    card.querySelector('[data-command="enable"]').disabled = running || (!advanced && editingRule !== index);
    const edit = document.createElement('button'); edit.type = 'button'; edit.dataset.command = 'edit'; edit.textContent = editingRule === index ? '收起' : '修改'; edit.setAttribute('aria-label', `${editingRule === index ? '收起' : '修改'}规则${index + 1}`); edit.setAttribute('aria-expanded', String(editingRule === index)); edit.hidden = advanced; edit.disabled = running; card.querySelector('.rule-actions').prepend(edit);
    const actionName = document.createElement('strong'); actionName.className = 'simple-action'; actionName.textContent = shortAction(program[index].action); card.append(actionName);
    const trigger = document.createElement('span'); trigger.className = 'simple-trigger'; trigger.textContent = `触发：${level.conditions.find(c => c.id === program[index].condition).label}`; card.append(trigger);
  }
  $('rule-count').textContent = `${program.length} 张卡`;
  $('add-rule').disabled = program.length >= 10 || running;
  for (const id of ['reference-main', 'reference-alt', 'starter', 'restore-draft']) $(id).disabled = running;
}

function polygon(points, fill, extra = '') { return `<polygon points="${points.map(p => p.join(',')).join(' ')}" fill="${fill}" ${extra}/>`; }

function projector() {
  const raw = n => [(n.x - n.y) * 80, (n.x + n.y) * 40];
  const positions = level.nodes.map(raw);
  const centerX = (Math.min(...positions.map(p => p[0])) + Math.max(...positions.map(p => p[0]))) / 2;
  const centerY = (Math.min(...positions.map(p => p[1])) + Math.max(...positions.map(p => p[1]))) / 2;
  return (node, z = 0) => { const p = raw(node); return [p[0] + 490 - centerX, p[1] + 380 - centerY - z]; };
}

function cube(x, y, half = 72, height = 62, top = '#f8f1df', left = '#d6c5d1', right = '#bba8c4') {
  return polygon([[x - half, y], [x, y + half / 2], [x, y + half / 2 + height], [x - half, y + height]], left) + polygon([[x, y + half / 2], [x + half, y], [x + half, y + height], [x, y + half / 2 + height]], right) + polygon([[x, y - half / 2], [x + half, y], [x, y + half / 2], [x - half, y]], top);
}

function lineDeck(a, b, color, thickness = 26, opacity = 1) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len * thickness / 2, ny = dx / len * thickness / 2;
  const pts = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
  return `<g opacity="${opacity}">${polygon(pts.map(p => [p[0], p[1] + 10]), '#b6a3bd')}${polygon(pts, color)}</g>`;
}

function renderScene(previousNode) {
  const signals = Game.signalsFor(level, world);
  const project = projector();
  const nodeById = id => level.nodes.find(n => n.id === id);
  const devicePosition = device => { const a = project(nodeById(device.edge[0])), b = project(nodeById(device.edge[1])); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
  const memoryPosition = [levelIndex === 0 ? 550 : 490, 215];
  const location = id => id === 'memory' ? memoryPosition : level.sources.some(s => s.id === id) ? project(nodeById(level.sources.find(s => s.id === id).node)) : devicePosition(level.devices.find(d => d.id === id));
  let drawing = `<title id="scene-title">${escape(level.name)}的等距庭院</title><desc id="scene-description">纸灵位于${escape(Game.nameOf(level, world.node))}，朝${Game.DIRECTIONS[world.facing]}。记忆符印${world.memory ? '亮' : '暗'}。使用下方对象按钮查看详细状态。</desc><defs><radialGradient id="sun-halo"><stop stop-color="#fff4dd" stop-opacity=".8"/><stop offset="1" stop-color="#f7eedc" stop-opacity="0"/></radialGradient><filter id="soft-shadow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="13"/></filter></defs>`;
  drawing += `<ellipse cx="485" cy="575" rx="245" ry="43" fill="#b3a2c0" opacity=".15" filter="url(#soft-shadow)"/><circle cx="600" cy="255" r="110" fill="url(#sun-halo)"/><path d="M215 548 Q490 680 800 552" fill="none" stroke="#d6c9df" stroke-width="1"/><path d="M246 242 Q490 157 748 261" fill="none" stroke="#ddd1e6" stroke-width="1"/>`;
  for (const [x, y, r] of [[260, 320, 2], [775, 340, 2], [320, 230, 2], [700, 205, 1.5], [650, 585, 2], [215, 430, 1.5]]) drawing += `<circle cx="${x}" cy="${y}" r="${r}" fill="#c9b6d2"/>`;
  for (const edge of level.edges) {
    const a = project(nodeById(edge.ends[0])), b = project(nodeById(edge.ends[1]));
    drawing += lineDeck(a, b, edge.gate ? signals[edge.gate] ? '#d9c7d8' : '#e7dfe7' : '#eee5d7', edge.gate ? 33 : 26, edge.gate && !signals[edge.gate] ? .23 : 1);
    if (edge.gate && !signals[edge.gate]) drawing += `<path d="M${a[0]},${a[1]} L${b[0]},${b[1]}" fill="none" stroke="#bdacc7" stroke-dasharray="5 8" stroke-width="1.4" opacity=".65"/>`;
  }
  for (const node of [...level.nodes].sort((a, b) => a.x + a.y - b.x - b.y)) {
    const [x, y] = project(node);
    drawing += cube(x, y, node.id === level.goal ? 75 : 66, node.id === level.goal ? 93 : 64);
    drawing += polygon([[x, y - 25], [x + 50, y], [x, y + 25], [x - 50, y]], '#fcf6e8', 'opacity=".55"');
    if (node.id === level.start) {
      const isSelected = selected === 'pad';
      drawing += `<g data-world-object="pad">${cube(x, y - 4, 36, 9, signals.pad ? '#83b9a4' : '#d1d9c4', '#a4b7a7', '#7b998e')}<path d="M${x - 18} ${y - 4} L${x} ${y - 13} L${x + 18} ${y - 4} L${x} ${y + 5} Z" fill="none" stroke="${signals.pad ? '#edf7d9' : '#acbca2'}" stroke-width="2"/>${isSelected ? `<ellipse cx="${x}" cy="${y - 3}" rx="47" ry="24" fill="none" stroke="#6e9b89" stroke-width="2" stroke-dasharray="3 5"/>` : ''}</g>`;
    }
    if (node.id === level.goal) {
      drawing += `<g>${cube(x - 21, y - 104, 10, 104, '#f6e8d2', '#dbc4bd', '#c3a9b8')}${cube(x + 21, y - 104, 10, 104, '#f6e8d2', '#dbc4bd', '#c3a9b8')}<path d="M${x - 21},${y - 11} V${y - 90} Q${x},${y - 125} ${x + 21},${y - 90} V${y - 11}" fill="none" stroke="#f6e8d2" stroke-width="14"/><ellipse cx="${x}" cy="${y}" rx="19" ry="10" fill="${world.status === 'success' ? '#efc977' : '#efd28c'}" opacity=".7"/></g>`;
    }
    drawing += `<text class="scene-label" x="${x}" y="${y - (node.id === level.goal ? 145 : 75)}" text-anchor="middle">${node.id === level.start || node.id === level.goal ? escape(node.name) : ''}</text>`;
  }
  for (const device of level.devices) {
    const [x, y] = devicePosition(device), active = signals[device.id] === 1, isSelected = selected === device.id;
    const hue = device.id === 'moon' ? '#ae8bab' : '#7a9e99';
    drawing += `<g data-world-object="${device.id}">${cube(x - 18, y - 68, 8, 63, active ? '#f3e9d8' : '#dfd2df', '#c1adca', '#a28bb4')}${cube(x + 18, y - 68, 8, 63, active ? '#f3e9d8' : '#dfd2df', '#c1adca', '#a28bb4')}<path d="M${x - 18},${y - 5} V${y - 63} Q${x},${y - 83} ${x + 18},${y - 63} V${y - 5}" fill="none" stroke="${active ? '#f3e9d8' : '#d4c0d6'}" stroke-width="10"/>${!active ? `<path d="M${x - 11},${y - 8} V${y - 49} M${x},${y - 3} V${y - 55} M${x + 11},${y - 8} V${y - 49}" stroke="#b09abb" stroke-width="4"/>` : ''}<circle cx="${x}" cy="${y - 75}" r="9" fill="${active ? '#e9c379' : hue}" stroke="#f9f0df" stroke-width="3"/><text class="scene-label" x="${x}" y="${y - 107}" text-anchor="middle">${escape(device.name)} · ${device.activeWhen ? '亮' : '暗'}</text>${isSelected ? `<ellipse cx="${x}" cy="${y + 6}" rx="37" ry="18" fill="none" stroke="#8b779d" stroke-width="2" stroke-dasharray="3 5"/>` : ''}</g>`;
  }
  const [mx, my] = memoryPosition;
  drawing += `<g data-world-object="memory"><path d="M${mx},${my - 20} L${mx + 19},${my} L${mx},${my + 20} L${mx - 19},${my} Z" fill="${world.memory ? '#dfb563' : '#b9a9c7'}" stroke="#fbf4e5" stroke-width="5"/><path d="M${mx},${my - 11} L${mx + 9},${my} L${mx},${my + 11} L${mx - 9},${my} Z" fill="none" stroke="${world.memory ? '#ffe8ad' : '#d8cbe2'}" stroke-width="1.5"/><circle cx="${mx}" cy="${my}" r="38" fill="none" stroke="#d6c9e0" stroke-width="1"/></g>`;
  if (lens) {
    for (const device of level.devices) {
      const source = world.bindings[device.id], a = location(source), b = devicePosition(device), sourceValue = signals[source];
      drawing += `<path class="scene-wire ${sourceValue ? 'bright' : ''}" d="M${a[0]},${a[1] - 15} Q${(a[0] + b[0]) / 2},${Math.min(a[1], b[1]) - 120} ${b[0]},${b[1] - 74}" stroke="${source === 'memory' ? '#bb914f' : '#478c83'}"/><circle cx="${b[0]}" cy="${b[1] - 74}" r="4" fill="${source === 'memory' ? '#bb914f' : '#478c83'}"/>`;
    }
    for (const node of level.nodes) { const [x, y] = project(node); drawing += `<circle cx="${x}" cy="${y}" r="4" fill="#438e83" opacity=".8"/>`; }
  }
  const [x, y] = project(nodeById(world.node)), prior = previousNode ? project(nodeById(previousNode)) : [x, y];
  const facing = [[-13, -6], [13, -6], [13, 6], [-13, 6]][world.facing];
  drawing += `<g class="paper-spirit" transform="translate(${x},${y - 13})"><g class="spirit-motion" style="--from-x:${prior[0] - x}px;--from-y:${prior[1] - y}px"><ellipse cx="0" cy="17" rx="18" ry="8" fill="#85748d" opacity=".2"/>${polygon([[-14, -9], [0, -29], [15, -8], [0, 17]], '#fcf9ee')}${polygon([[0, -29], [15, -8], [0, 17]], '#d8ccdc')}${polygon([[-14, -9], [0, -2], [0, 17]], '#83aaa0')}<path d="M0 -29 V17 M-14 -9 L0 -2 L15 -8" fill="none" stroke="#bdb0c6" stroke-width="1"/><path d="M0 -6 l${facing[0]} ${facing[1]}" stroke="#62526f" stroke-width="2" stroke-linecap="round"/><circle cx="${facing[0] * .5}" cy="${-6 + facing[1] * .5}" r="2" fill="#62526f"/></g></g>`;
  $('scene').innerHTML = drawing;
  $('scene').onclick = event => { const object = event.target.closest('[data-world-object]'); if (object) { selected = object.dataset.worldObject; renderObjects(); renderScene(); } };
}

function renderObjects() {
  const signals = Game.signalsFor(level, world);
  const objects = [...level.sources, { id: 'memory', name: '记忆符印' }, ...level.devices];
  $('object-buttons').innerHTML = objects.map(o => `<button class="object-button" data-object="${o.id}" type="button" aria-pressed="${selected === o.id}" aria-label="查看${o.name}"><span class="object-light ${signals[o.id] ? 'bright' : ''}"></span>${o.name}<span>${signals[o.id] ? '亮' : '暗'}</span></button>`).join('');
  const device = level.devices.find(d => d.id === selected);
  $('object-inspector').textContent = device ? `${device.name} · 来源：${Game.nameOf(level, world.bindings[device.id])} · 输入${signals[world.bindings[device.id]] ? '亮' : '暗'} · ${signals[device.id] ? '开启' : '关闭'}` : selected === 'memory' ? `记忆符印 · 当前${world.memory ? '亮' : '暗'} · 再次印刻会覆盖这一份记忆` : `压力台 · ${signals.pad ? '纸灵站在台上，输出亮' : '纸灵已离开，输出暗'}`;
}

function render(previousNode) {
  renderChapters(); renderRules(); renderScene(previousNode); renderObjects(); renderLesson();
  $('chapter-eyebrow').textContent = `CHAPTER ${level.number} / ${level.subtitle}`;
  $('chapter-title').textContent = level.name; $('mission').textContent = levelIndex === 0 ? '目标：让纸灵走到发光的出口。' : level.mission;
  $('lens-toggle').setAttribute('aria-pressed', String(lens));
  $('lens-toggle').textContent = lens ? '连接已显示' : '查看连接';
  $('memory-value').textContent = world.memory ? '亮' : '暗'; $('memory-orb').classList.toggle('is-bright', world.memory === 1);
  const status = running ? 'running' : world.status;
  $('run-status').textContent = ({ running: '协议运行中', success: '协议已生效', blocked: '协议中断', ready: world.steps ? '已暂停' : '等待协议' })[status];
  $('status-dot').className = `status-dot ${status}`;
  $('step-count').textContent = `${String(world.steps).padStart(2, '0')} 步`;
  $('actor-state').textContent = `纸灵 · ${Game.nameOf(level, world.node)} · 朝${Game.DIRECTIONS[world.facing]}`;
  $('run').textContent = running ? '暂停' : world.status === 'success' ? !advanced ? levelIndex < 2 ? '下一章' : '再玩一次' : '再试一次' : world.steps && world.status !== 'blocked' ? '继续' : '运行';
  $('run').disabled = false;
  $('step').disabled = running || world.status === 'success';
  $('step').textContent = world.status === 'blocked' ? '从头看一步' : '看一步';
  $('event-message').textContent = message;
  $('event-message').className = `event-message ${world.status}`;
  $('completion').hidden = world.status !== 'success'; $('insight').textContent = level.insight;
  $('next-level').textContent = levelIndex < Levels.LEVELS.length - 1 ? '下一章' : '回到第一章';
  $('trace-count').textContent = trace.length;
  $('trace-list').innerHTML = trace.slice(-12).map(event => `<li><span class="trace-index">${String(event.step).padStart(2, '0')}</span><span>${event.ruleIndex != null ? `<span class="trace-rule">规则 ${event.ruleIndex + 1}</span>` : ''}${escape(event.message)}${event.changes?.length ? `<br><small>${event.changes.map(c => `${Game.nameOf(level, c.id)} ${c.before ? '亮' : '暗'}→${c.after ? '亮' : '暗'}`).join(' · ')}</small>` : ''}</span></li>`).join('');
  $('object-buttons').hidden = levelIndex === 0 && !lens && !advanced; $('object-inspector').hidden = levelIndex === 0 && !lens && !advanced;
}

$('chapters').addEventListener('click', event => { const button = event.target.closest('[data-level]'); if (button) loadLevel(Number(button.dataset.level)); });
$('rule-list').addEventListener('change', event => {
  const card = event.target.closest('[data-rule]');
  if (!card || !event.target.dataset.field) return;
  const index = Number(card.dataset.rule), field = event.target.dataset.field, value = event.target.value, focusId = event.target.id;
  editProgram(() => { program[index][field] = value; }, focusId);
});
$('rule-list').addEventListener('click', event => {
  const button = event.target.closest('[data-command]'); if (!button || running) return;
  const index = Number(button.closest('[data-rule]').dataset.rule);
  if (button.dataset.command === 'edit') { editingRule = editingRule === index ? -1 : index; render(); if (editingRule >= 0) $(`action-${index}`).focus({ preventScroll: true }); return; }
  editProgram(() => {
    switch (button.dataset.command) {
      case 'up': [program[index - 1], program[index]] = [program[index], program[index - 1]]; editingRule = index - 1; break;
      case 'down': [program[index + 1], program[index]] = [program[index], program[index + 1]]; editingRule = index + 1; break;
      case 'delete': program.splice(index, 1); editingRule = -1; break;
      case 'enable': program[index].enabled = !program[index].enabled; break;
    }
  });
});
$('add-rule').onclick = () => { editProgram(() => { editingRule = program.length; program.push({ condition: 'ahead', action: 'move', enabled: true }); }); $(`condition-${editingRule}`).focus(); };
$('advanced-toggle').onclick = () => { advanced = !advanced; render(); };
$('run').onclick = () => {
  if (running) { pause(); render(); return; }
  if (world.status === 'success' && !advanced) { loadLevel((levelIndex + 1) % Levels.LEVELS.length); return; }
  if (['blocked', 'success'].includes(world.status)) resetWorld();
  running = true; render(); timer = setTimeout(scheduleStep, 150);
};
$('step').onclick = () => { pause(); if (world.status === 'blocked') resetWorld('逐步重放你的程序。'); performStep(); };
$('reset').onclick = () => { resetWorld(); render(); };
$('lens-toggle').onclick = () => { lens = !lens; persist(); render(); };
$('object-buttons').onclick = event => { const button = event.target.closest('[data-object]'); if (button) { selected = button.dataset.object; renderObjects(); renderScene(); } };
$('hint').onclick = () => { $('hint-text').hidden = false; $('hint-text').textContent = level.hints[Math.min(hintIndex++, level.hints.length - 1)]; };
$('reference').onclick = () => { $('reference-tools').hidden = !$('reference-tools').hidden; };
function loadReference(rules) { draftBackup ??= copyRules(program); editProgram(() => { program = copyRules(rules); editingRule = -1; }); $('restore-draft').hidden = false; }
$('reference-main').onclick = () => loadReference(level.solution);
$('reference-alt').onclick = () => { if (level.alternative) loadReference(level.alternative); };
$('restore-draft').onclick = () => { if (draftBackup) editProgram(() => { program = copyRules(draftBackup); draftBackup = null; }); $('restore-draft').hidden = true; };
$('starter').onclick = () => { draftBackup = null; editProgram(() => { program = copyRules(levelIndex === 0 ? level.solution : level.initialProgram); editingRule = -1; }); $('restore-draft').hidden = true; };
$('next-level').onclick = () => loadLevel((levelIndex + 1) % Levels.LEVELS.length);
$('help-toggle').onclick = () => { const open = $('help-panel').hidden; $('help-panel').hidden = !open; $('help-toggle').setAttribute('aria-expanded', String(open)); };
$('replay-guide').onclick = () => { pause(); advanced = false; loadLevel(0); program = copyRules(level.solution); resetWorld('点击开始，看纸灵执行你的三张指令卡。'); render(); $('welcome').showModal(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && running) { pause(); render(); } });
window.addEventListener('pagehide', pause);
loadLevel(0);
if (!saved.started) {
  $('welcome').showModal();
}
$('start-demo').onclick = () => {
  saved.started = true; persist();
  $('welcome').close();
  $('run').click();
};

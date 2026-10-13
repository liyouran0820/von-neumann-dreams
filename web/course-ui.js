import { scienceResult } from './science.js';
const $ = id => document.getElementById(id);
const NOTES_KEY = 'night-white-academy-v1-notes';
let notes = {};
let welcomed = false;
try { welcomed = sessionStorage.getItem('academy-welcomed') === 'yes'; } catch { /* optional storage */ }
try { const saved = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); if (saved && typeof saved === 'object') notes = saved; } catch { /* optional storage */ }
const bit = value => value ? '1' : '0';
const color = value => value ? '#71ddd0' : '#71818c';
function wire(d, on) { return `<path d="${d}" fill="none" stroke="${color(on)}" stroke-width="3" stroke-linecap="round"/>`; }
function input(id, y, on) { return `<circle cx="21" cy="${y}" r="12" fill="${on ? '#28665f' : '#263742'}" stroke="${color(on)}"/><text x="21" y="${y + 5}" text-anchor="middle">${bit(on)}</text><text x="42" y="${y + 5}">${id}</text>`; }
function circuit(config, result) {
  const s = result.signals;
  let content;
  if (config.kind === 'optics') {
    content = input('A', 52, s.A) + wire('M64 52H290', s.A) + '<text x="171" y="29" text-anchor="middle">感应器 → 光门</text>';
  } else {
    const y = config.kind === 'combined' ? 51 : 33;
    content = input('A', y, s.A) + wire(`M64 ${y}H221V51H235`, s.A);
    if ('P' in s) content += input('P', 18, s.P) + wire('M64 18H207V36H235', s.P);
    content += input('B', 89, s.B) + wire('M64 89H104', s.B);
    content += '<path d="M104 69L136 89L104 109Z" fill="#253944" stroke="#c4d0d0" stroke-width="1.5"/><circle cx="143" cy="89" r="6" fill="#253944" stroke="#c4d0d0" stroke-width="1.5"/><text x="116" y="64" text-anchor="middle">非</text>';
    content += wire('M150 89H207V76H235', !s.B) + `<text x="177" y="78" text-anchor="middle" fill="${color(!s.B)}">${bit(!s.B)}</text>`;
    content += '<path d="M235 24H251A30 30 0 0 1 251 84H235Z" fill="#253944" stroke="#c4d0d0" stroke-width="1.5"/><text x="254" y="59" text-anchor="middle">与</text>';
    content += wire('M281 54H302', result.output);
  }
  content += `<circle cx="310" cy="${config.kind === 'optics' ? 52 : 54}" r="13" fill="${result.output ? '#d8b96c' : '#263742'}" stroke="#d8b96c"/><text x="310" y="${config.kind === 'optics' ? 57 : 59}" text-anchor="middle" fill="${result.output ? '#14232c' : '#e5ede7'}">${bit(result.output)}</text>`;
  return `<svg viewBox="${config.kind === 'optics' ? '0 16 334 70' : '0 0 334 116'}" role="img" aria-label="白侧电路 ${config.formula}；${Object.entries(s).map(([id,value])=>id+'='+bit(value)).join('，')}；输出=${bit(result.output)}">${content}</svg>`;
}

export function renderCourse(level, state, index) {
  const course = level.academy, config = level.science;
  document.body.classList.toggle('academy', !!course);
  document.body.classList.toggle('has-science', !!config);
  $('course-panel').hidden = !course;
  if (!course) return;
  $('course-title').textContent = course.title;
  $('course-schools').textContent = course.schools;
  $('welcome').hidden = index !== 0 || welcomed;
  $('course-panel').classList.toggle('optics-course', config?.kind === 'optics');
  $('science-panel').hidden = !config;
  if (!config) return;
  const result = scienceResult(level, state);
  $('science-formula').textContent = config.formula;
  $('science-circuit').innerHTML = circuit(config, result);
  const occupied = state.body.world === config.world && level.grids[config.world][state.body.y]?.[state.body.x] === 'D';
  $('science-output').textContent = result.output ? '白门已接通' : occupied ? '门等待关闭 · 可以离开' : '白门未接通';
  $('science-output').classList.toggle('on', result.output);
  $('science-observe').hidden = state.view === config.world;
  const frozen = state.failed || state.won || state.view !== config.world;
  $('science-switch').hidden = !config.inputs.some(i => i.type === 'switch');
  $('science-switch').disabled = frozen;
  $('science-switch').setAttribute('aria-pressed', String(!!state.science.switches.B));
  $('science-switch').textContent = 'B 开关 · ' + (state.science.switches.B ? '亮' : '灭');
  $('science-mirror').hidden = !(config.mirrors || []).length;
  $('science-mirror').disabled = frozen;
  $('science-angle').hidden = !(config.mirrors || []).length;
  $('science-angle').textContent = result.optics.bounces.length ? '入射 45° = 反射 45° · 虚线为法线' : '让光线经过镜面，观察入射与反射。';
  const key = config.inputs.map(i => bit(result.signals[i.id])).join('');
  if (!notes[level.id] || typeof notes[level.id] !== 'object') notes[level.id] = {};
  if (notes[level.id][key] !== result.output) {
    notes[level.id][key] = result.output;
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); } catch { /* optional storage */ }
  }
}

export function showNotebook(level) {
  $('notebook-title').textContent = level.academy?.title || '实验札记';
  $('notebook-note').textContent = level.academy?.note || '观察、试验，再把发现用到下一处。';
  const config = level.science;
  $('notebook-results').hidden = !config;
  if (config) {
    const ids = config.inputs.map(i => i.id), records = notes[level.id] || {};
    const rows = Array.from({length:2 ** ids.length}, (_,i) => i.toString(2).padStart(ids.length,'0'));
    $('notebook-table').innerHTML = `<thead><tr>${ids.map(id=>'<th>'+id+'</th>').join('')}<th>输出</th></tr></thead><tbody>${rows.map(key=>`<tr class="${Object.hasOwn(records,key)?'observed':''}">${[...key].map(value=>'<td>'+value+'</td>').join('')}<td>${Object.hasOwn(records,key)?bit(records[key]):'—'}</td></tr>`).join('')}</tbody>`;
  }
  $('notebook-dialog').showModal();
}
export function resetCourseNotes() {
  notes = {}; welcomed = false;
  try { localStorage.removeItem(NOTES_KEY); sessionStorage.removeItem('academy-welcomed'); } catch { /* optional storage */ }
}
export function dismissWelcome() { welcomed = true; try { sessionStorage.setItem('academy-welcomed','yes'); } catch { /* optional storage */ } $('welcome').hidden = true; }
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--course-bottom', ($('course-panel').getBoundingClientRect().bottom + 12) + 'px');
}).observe($('course-panel'));

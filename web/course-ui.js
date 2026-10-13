import { scienceResult } from './science.js';
const $ = id => document.getElementById(id);
const NOTES_KEY = new URLSearchParams(location.search).get('version') === 'optics' ? 'night-white-academy-v1-notes' : 'night-white-logic-gates-v1-notes';
let notes = {};
let welcomed = false;
try { welcomed = sessionStorage.getItem('academy-welcomed') === 'yes'; } catch { /* optional storage */ }
try { const saved = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); if (saved && typeof saved === 'object') notes = saved; } catch { /* optional storage */ }
const bit = value => value ? '1' : '0';
const color = value => value ? '#71ddd0' : '#71818c';
function wire(d, on) { return `<path d="${d}" fill="none" stroke="${color(on)}" stroke-width="3" stroke-linecap="round"/>`; }
function input(id, y, on) { return `<circle cx="21" cy="${y}" r="12" fill="${on ? '#28665f' : '#263742'}" stroke="${color(on)}"/><text x="21" y="${y + 5}" text-anchor="middle">${bit(on)}</text><text x="42" y="${y + 5}">${id}</text>`; }
function gateSymbol(kind, x, y) {
  const labels={and:'与',or:'或',not:'非',xor:'异或',nand:'与非'};
  let path=kind==='not'?'M-25 -24L18 0L-25 24Z':kind==='or'||kind==='xor'?'M-28 -27Q0 -27 25 0Q0 27 -28 27Q-10 0 -28 -27Z':'M-27 -27H-2A27 27 0 0 1 -2 27H-27Z';
  return `<g transform="translate(${x} ${y})"><path d="${path}" fill="#253944" stroke="#c4d0d0" stroke-width="1.5"/>${kind==='xor'?'<path d="M-35 -27Q-17 0 -35 27" fill="none" stroke="#c4d0d0" stroke-width="1.5"/>':''}${['not','nand'].includes(kind)?`<circle cx="${kind==='not'?24:31}" cy="0" r="5" fill="#253944" stroke="#c4d0d0" stroke-width="1.5"/>`:''}<text x="-3" y="5" text-anchor="middle" style="font-size:13px">${labels[kind]}</text></g>`;
}
function logicCircuit(config, result) {
  const s=result.signals, kind=config.lessonGate;
  let content;
  if(kind==='nand') {
    const c=result.lessonOutput;
    content=input('A',27,s.A)+input('B',87,s.B)+wire('M64 27H86V43H105',s.A)+wire('M64 87H86V69H105',s.B)+gateSymbol('nand',132,56);
    content+=wire('M168 56H198',c)+`<circle cx="191" cy="56" r="3" fill="${color(c)}"/><text x="184" y="36" text-anchor="middle">C ${bit(c)}</text>`;
    content+=wire('M191 56V43H214',c)+wire('M191 56V69H214',c)+gateSymbol('nand',241,56)+wire('M277 56H296',result.output);
  } else {
    const single=kind==='not', y=single?56:28, gateX=kind==='xor'?181:190;
    content=input('A',y,s.A)+wire(`M64 ${y}H162V${single?56:43}H${gateX}`,s.A);
    if(!single)content+=input('B',88,s.B)+wire(`M64 88H162V69H${gateX}`,s.B);
    content+=gateSymbol(kind,217,56)+wire(`M${single?246:243} 56H296`,result.output);
  }
  content+=`<circle cx="310" cy="56" r="13" fill="${result.output?'#d8b96c':'#263742'}" stroke="#d8b96c"/><text x="310" y="61" text-anchor="middle" fill="${result.output?'#14232c':'#e5ede7'}">${bit(result.output)}</text><text x="310" y="92" text-anchor="middle">Y</text>`;
  const scope=config.scope==='assessment'?'联合验收':config.world==='night'?'夜侧电路':'白侧电路';
  return `<svg viewBox="0 0 334 116" role="img" aria-label="${scope} ${config.formula}；${Object.entries(s).map(([id,value])=>id+'='+bit(value)).join('，')}${kind==='nand'?'；C='+bit(result.lessonOutput):''}；输出Y=${bit(result.output)}">${content}</svg>`;
}
function circuit(config, result) {
  if(config.lessonGate)return logicCircuit(config,result);
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
  const worldName=config.world==='night'?'夜':'白';
  $('science-output').textContent = config.scope==='assessment' ? (result.output?'验收条件已满足':'验收条件未满足') : result.output ? worldName+'门已接通' : occupied ? '门等待关闭 · 可以离开' : worldName+'门未接通';
  $('science-output').classList.toggle('on', result.output);
  $('science-observe').hidden = state.view === config.world;
  $('science-observe').textContent='观察'+worldName+'侧 · 空格';
  const frozen = state.failed || state.won || state.view !== config.world;
  const switches=config.inputs.filter(i=>i.type==='switch'), parent=$('science-switches');
  for(const old of [...parent.children])if(!switches.some(i=>i.id===old.dataset.signal))old.remove();
  for(const item of switches){
    let button=[...parent.children].find(b=>b.dataset.signal===item.id);
    if(!button){button=document.createElement('button');button.dataset.signal=item.id;parent.append(button);}
    button.disabled=frozen;button.setAttribute('aria-label','切换'+worldName+'侧 '+item.id+' 开关');
    button.setAttribute('aria-pressed',String(state.science.switches[item.id]));button.textContent=item.id+' 开关 · '+(state.science.switches[item.id]?'1 亮':'0 灭');
  }
  $('science-mirror').hidden = !(config.mirrors || []).length;
  $('science-mirror').disabled = frozen;
  $('science-angle').hidden = !config.lessonGate && !(config.mirrors || []).length;
  const rules={and:'两路都为 1，输出才为 1。',or:'至少一路为 1，输出就是 1。',not:'输入与输出相反：1 → 0，0 → 1。',xor:'两路不同输出 1；相同输出 0。',nand:'第二门两端都接 C，再取反一次。'};
  $('science-angle').textContent=config.lessonGate?rules[config.lessonGate]:(result.optics.bounces.length?'入射 45° = 反射 45° · 虚线为法线':'让光线经过镜面，观察入射与反射。');
  const key = config.inputs.map(i => bit(result.signals[i.id])).join('');
  if (!notes[level.id] || typeof notes[level.id] !== 'object') notes[level.id] = {};
  const record={gate:result.lessonOutput,door:result.output};
  if (JSON.stringify(notes[level.id][key]) !== JSON.stringify(record)) {
    notes[level.id][key] = record;
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
    const combined=config.lessonGate==='nand';
    $('notebook-table').innerHTML = `<thead><tr>${ids.map(id=>'<th>'+id+'</th>').join('')}${combined?'<th>与非 C</th>':''}<th>输出 Y</th></tr></thead><tbody>${rows.map(key=>{const seen=Object.hasOwn(records,key),entry=records[key];const record=typeof entry==='boolean'?{gate:entry,door:entry}:entry;return `<tr class="${seen?'observed':''}">${[...key].map(value=>'<td>'+value+'</td>').join('')}${combined?'<td>'+(seen?bit(record.gate):'—')+'</td>':''}<td>${seen?bit(record.door):'—'}</td></tr>`;}).join('')}</tbody>`;
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

import { scienceResult } from './science.js';
const $ = id => document.getElementById(id);
let NOTES_KEY = new URLSearchParams(location.search).get('version') === 'optics' ? 'night-white-academy-v1-notes' : 'night-white-logic-gates-v1-notes';
let welcomeKey='academy-welcomed';
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
  if(config.doors){
    const front=result.doors.front,back=result.doors.back;
    const y=result.output;
    let content=input('A',28,s.A)+input('B',88,s.B)+wire('M64 28H84V43H96',s.A)+wire('M64 88H84V69H96',s.B)+gateSymbol('xor',132,56)+wire('M158 56H183',y);
    content+=`<circle cx="183" cy="56" r="3" fill="${color(y)}"/><text x="178" y="48" text-anchor="middle" style="font-size:12px">Y ${bit(y)}</text>`;
    content+=wire('M183 56V26H192',y)+gateSymbol('not',217,26)+wire('M246 26H296',front)+wire('M183 56V86H296',back);
    for(const [y,on,label] of [[26,front,'前门'],[86,back,'后门']])content+=`<circle cx="310" cy="${y}" r="12" fill="${on?'#d8b96c':'#263742'}" stroke="#d8b96c"/><text x="310" y="${y+5}" text-anchor="middle" fill="${on?'#14232c':'#e5ede7'}">${bit(on)}</text><text x="248" y="${y-10}" style="font-size:12px">${label}</text>`;
    return `<svg viewBox="0 0 334 116" role="img" aria-label="异或联动：A=${bit(s.A)}，B=${bit(s.B)}，Y=${bit(y)}，前门=${bit(front)}，后门=${bit(back)}">${content}</svg>`;
  }
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
  document.body.classList.toggle('has-science',level.schemaVersion===2?!!config?.circuits.length:!!config);
  $('course-panel').hidden = !course;
  if (!course) return;
  $('course-title').textContent = course.title;
  $('course-schools').textContent = course.schools;
  $('welcome').hidden = index !== 0 || welcomed;
  $('course-panel').classList.toggle('optics-course', config?.kind === 'optics');
  $('science-panel').hidden = !config;
  if (!config) return;
  if(level.schemaVersion===2){renderV2Course(level,state);return;}
  const result = scienceResult(level, state);
  $('science-formula').textContent = config.formula;
  $('science-circuit').innerHTML = circuit(config, result);
  const occupied = state.body.world === config.world && level.grids[config.world][state.body.y]?.[state.body.x] === 'D';
  const worldName=config.world==='night'?'夜':'白';
  $('science-output').textContent = config.scope==='assessment' ? (result.output?'验收条件已满足':'验收条件未满足') : result.output ? worldName+'门已接通' : occupied ? '门等待关闭 · 可以离开' : worldName+'门未接通';
  if(config.doors)$('science-output').textContent=config.doors.map(door=>{
    const waiting=!result.doors[door.id]&&state.body.world===config.world&&door.cells.some(([x,y])=>state.body.x===x&&state.body.y===y);
    return door.label+(result.doors[door.id]?'开':waiting?'待关':'关');
  }).join(' / ');
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
  $('science-angle').textContent=config.doors?'两个开关共同控制两道门。':config.lessonGate?rules[config.lessonGate]:(result.optics.bounces.length?'入射 45° = 反射 45° · 虚线为法线':'让光线经过镜面，观察入射与反射。');
  const key = config.inputs.map(i => bit(result.signals[i.id])).join('');
  if (!notes[level.id] || typeof notes[level.id] !== 'object') notes[level.id] = {};
  const record={gate:result.lessonOutput,door:result.output,...(config.doors?{front:result.doors.front}:{})};
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
    if(level.schemaVersion===2){showV2Notebook(level);$('notebook-dialog').showModal();return;}
    const ids = config.inputs.map(i => i.id), records = notes[level.id] || {};
    const rows = Array.from({length:2 ** ids.length}, (_,i) => i.toString(2).padStart(ids.length,'0'));
    const combined=config.lessonGate==='nand', paired=!!config.doors;
    $('notebook-table').innerHTML = `<thead><tr>${ids.map(id=>'<th>'+id+'</th>').join('')}${combined?'<th>与非 C</th>':''}${paired?'<th>前门 ¬Y</th>':''}<th>${paired?'后门 Y':'输出 Y'}</th></tr></thead><tbody>${rows.map(key=>{const seen=Object.hasOwn(records,key),entry=records[key];const record=typeof entry==='boolean'?{gate:entry,door:entry}:entry;return `<tr class="${seen?'observed':''}">${[...key].map(value=>'<td>'+value+'</td>').join('')}${combined?'<td>'+(seen?bit(record.gate):'—')+'</td>':''}${paired?'<td>'+(seen&&typeof record.front==='boolean'?bit(record.front):'—')+'</td>':''}<td>${seen?bit(record.door):'—'}</td></tr>`;}).join('')}</tbody>`;
  }
  $('notebook-dialog').showModal();
}
export function resetCourseNotes() {
  notes = {}; welcomed = false;
  try { if(NOTES_KEY)localStorage.removeItem(NOTES_KEY); sessionStorage.removeItem(welcomeKey); } catch { /* optional storage */ }
}
export function dismissWelcome() { welcomed = true; try { sessionStorage.setItem(welcomeKey,'yes'); } catch { /* optional storage */ } $('welcome').hidden = true; }
export function setCourseCatalog(catalog){
 NOTES_KEY=catalog.notesKey;welcomeKey=catalog.welcomeKey;notes={};welcomed=false;
 try{welcomed=sessionStorage.getItem(welcomeKey)==='yes';const value=JSON.parse(localStorage.getItem(NOTES_KEY)||'{}');if(value&&typeof value==='object')notes=catalog.id==='v2'?(value.format===1&&value.catalog==='v2'?value.levels||{}:{}):value;}catch{/* optional storage */}
 $('welcome').querySelector('p').textContent=catalog.id==='v2'?'十三项试炼，继续探索夜白之间。':'欢迎，新生。完成五项入学试炼，抵达天文台。';
}
function renderV2Course(level,state){
 const config=level.science,result=scienceResult(level,state);$('welcome').hidden=true;
 $('science-panel').hidden=!config.circuits.length;if(!config.circuits.length)return;
 $('science-formula').textContent=config.circuits.map(c=>c.id).join(' · ');
 $('science-circuit').innerHTML=config.circuits.map(c=>{
  const r=result.circuits.find(r=>r.id===c.id),nodes=c.nodes.length?c.nodes:[{id:c.output,op:null,args:[{signal:c.output}]}];
  return `<div class="circuit-world">${c.world==='night'?'夜':'白'}侧${c.crossWorld?' · N／W':''}</div>`+nodes.map(n=>{
   const inputList=n.args.map(a=>a.signal),on=r.signals[n.id];let content='';
   for(let i=0;i<inputList.length;i++){const y=inputList.length===1?56:i?88:28;content+=input(inputList[i],y,r.signals[inputList[i]])+wire(`M64 ${y}H156V${inputList.length===1?56:i?69:43}H190`,r.signals[inputList[i]]);}
   content+=(n.op?gateSymbol(n.op,217,56):'')+wire('M246 56H292',on)+`<circle cx="310" cy="56" r="13" fill="${on?'#d8b96c':'#263742'}"/><text x="310" y="61" text-anchor="middle">${bit(on)}</text><text x="310" y="92" text-anchor="middle">${n.id}</text>`;
   return `<svg viewBox="0 0 334 110" role="img" aria-label="${n.id}=${bit(on)}，${inputList.map(id=>id+'='+bit(r.signals[id])).join('，')}">${content}</svg>`;
  }).join('');
 }).join('');
 $('science-output').textContent=level.doors.length?level.doors.map(d=>{const on=result.signals[d.signal],occupied=(state.body.world===d.world&&d.cells.some(([x,y])=>x===state.body.x&&y===state.body.y))||level.entities.some(e=>e.world===d.world&&d.cells.some(([x,y])=>state.entities[e.id]?.[0]===x&&state.entities[e.id]?.[1]===y));return d.label+(on?'开':occupied?'待关':'关');}).join(' / '):'输出 '+bit(result.output);
 $('science-output').classList.toggle('on',result.output);$('science-observe').hidden=true;$('science-mirror').hidden=true;$('science-angle').hidden=true;
 const mirrors=(config.optics[state.view]?.mirrors||[]).filter(m=>m.rotatable);
 $('science-switches').innerHTML=mirrors.map(m=>`<button data-mirror="${m.id}"${state.failed||state.won?' disabled':''} aria-label="转动${m.id}镜面">${m.id} · ${state.science.mirrors[m.id]}</button>`).join('');
 notes[level.id]||={};for(const c of config.circuits){const r=result.circuits.find(r=>r.id===c.id),key=c.inputs.map(i=>bit(r.signals[i.id])).join('');notes[level.id][c.id]||={};notes[level.id][c.id][key]=r.signals;}
 try{localStorage.setItem(NOTES_KEY,JSON.stringify({format:1,catalog:'v2',levels:notes}));}catch{/* optional storage */}
}
function showV2Notebook(level){
 $('notebook-table').innerHTML=level.science.circuits.map(c=>{
  const records=notes[level.id]?.[c.id]||{},ids=c.inputs.map(i=>i.id),outputs=c.nodes.map(n=>n.id),rows=Array.from({length:2**ids.length},(_,i)=>i.toString(2).padStart(ids.length,'0'));
  return `<tbody><tr><th colspan="${ids.length+outputs.length}">${c.id}</th></tr><tr>${[...ids,...outputs].map(id=>'<th>'+id+'</th>').join('')}</tr>${rows.map(key=>'<tr>'+[...key].map(v=>'<td>'+v+'</td>').join('')+outputs.map(id=>'<td>'+(records[key]?bit(records[key][id]):'—')+'</td>').join('')+'</tr>').join('')}</tbody>`;
 }).join('');
}
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--course-bottom', ($('course-panel').getBoundingClientRect().bottom + 12) + 'px');
}).observe($('course-panel'));

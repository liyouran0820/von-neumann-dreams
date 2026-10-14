import { initialScience, scienceResult, instrumentAt } from './science.js';
import { entitySpec, entityAt, entitiesIn, hasCell, availableSources } from './entities.js';
export { scienceResult } from './science.js';
export const other = w => w === 'night' ? 'day' : 'night';
const copy = x => structuredClone(x);
const inside = (p,r) => p.x>=r.x[0]&&p.x<=r.x[1]&&p.y>=r.y[0]&&p.y<=r.y[1];
export function createState(level) {
 if(level.schemaVersion!==undefined&&level.schemaVersion!==2)throw new Error('Unknown level schema');
 const s={body:{world:'night',x:level.start[0],y:level.start[1]},view:'night',boxes:level.track?{night:level.track.initial,day:level.track.initial}:null,mapping:null,preview:null,failed:false,won:false,feedback:null,message:level.goal,checkpoint:null,region:-1,history:[]};
 if(level.science)s.science=initialScience(level);
 if(level.schemaVersion===2){s.entities=Object.fromEntries(level.entities.map(e=>[e.id,[...e.cell]]));s.lastSource=null;s.fallen=[];
  if(level.initialMapping){const g=level.groups[level.initialMapping];s.mapping=g.id;s.entities[g.ghostId]=[...s.entities[g.source]];}
 }
 s.checkpoint=snapshot(s); return s;
}
function snapshot(s){ const {history,checkpoint,...rest}=s;return copy(rest); }
function save(s){s.history.push({state:snapshot(s),checkpoint:copy(s.checkpoint)});}
export function doorOpen(level,s,world,x,y){
 if(level.schemaVersion===2){const d=level.doors.find(d=>d.world===world&&hasCell(d.cells,x,y));return !!d&&scienceResult(level,s).signals[d.signal];}
 if(level.science?.world===world&&level.science.scope!=='assessment'){
  const result=scienceResult(level,s);
  if(level.science.doors&&x!==undefined){const door=level.science.doors.find(d=>d.cells.some(([a,b])=>a===x&&b===y));return door?result.doors[door.id]:false;}
  return result.output;
 }
 if(world!=='day'||!level.track)return false;
 // Keep the original campaign's occupied-door protection from main.
 const occupied=s.body.world===world&&level.grids[world][s.body.y]?.[s.body.x]==='D';
 return s.boxes.day===level.track.targets.day||occupied;
}
export function support(level,s,world,x,y){
 if(level.schemaVersion===2)return entityFloor(level,s,world,x,y);
 if(instrumentAt(level,world,x,y))return null;
 const p={x,y};
 const real=level.bridges.find(b=>b.world===world&&inside(p,b));if(real)return 'real-'+real.id;
 const ghost=level.bridges.find(b=>b.world!==world&&b.id===s.mapping&&inside(p,b));if(ghost)return 'ghost-'+ghost.id;
 const tile=level.grids[world][y]?.[x];
 if(tile==='D')return doorOpen(level,s,world,x,y)||(level.science&&s.body.world===world&&s.body.x===x&&s.body.y===y)?'floor':null;
 if(tile&&'.S12'.includes(tile))return 'floor';
 if(tile==='E'&&level.id!=='G5')return 'floor';
 return null;
}
export function goals(level,s){
 if(level.schemaVersion===2){const signals=scienceResult(level,s).signals;return [...level.requirements.map(g=>({label:g.label,ok:g.type==='position'?!!s.entities[g.entity]&&hasCell([g.cell],...s.entities[g.entity]):signals[g.signal]===g.value})),{label:'身体 · 夜侧出口',ok:s.body.world==='night'&&hasCell(level.exit,s.body.x,s.body.y)}];}
 const targets=level.science?.lessonGate==='or'?{}:level.track?.targets||{};
 const result=Object.entries(targets).map(([w,x])=>({required:level.id!=='G2',label:`${w==='night'?'夜':'白'}箱 A · x=${x}${level.id==='G2'||(level.id==='G5'&&w==='day')?' / 白门':''}`,ok:s.boxes[w]===x}));
 if(level.science)result.push({label:'实验线路 · '+level.science.formula,required:false,ok:scienceResult(level,s).output});
 result.push({label:level.id==='G5'?'身体 · 夜C虚影桥末端 (15,2–3)':'身体 · 夜世界出口',ok:s.body.world==='night'&&level.exit.some(([x,y])=>x===s.body.x&&y===s.body.y)&&(level.id!=='G5'||support(level,s,'night',s.body.x,s.body.y)==='ghost-C')});return result;
}
function settle(level,s,moved=false){
 if(level.schemaVersion===2){
  s.fallen=[];if(!support(level,s,s.body.world,s.body.x,s.body.y))s.fallen.push('body');
  for(const e of level.entities.filter(e=>e.kind==='weight'))if(!support(level,s,e.world,...s.entities[e.id]))s.fallen.push(e.id);
  if(s.fallen.length){s.failed=true;s.won=false;s.message=s.fallen.includes('body')?'失去支撑 · 撤销，或恢复安全点。':'配重失去支撑 · 撤销，或恢复安全点。';return;}
  s.won=goals(level,s).every(g=>g.ok);if(s.won){s.message='地点已点亮 · '+level.name;return;}
  if(moved){const region=level.checkpoints.findIndex(r=>r.world===s.body.world&&inside(s.body,r));if(region!==s.region&&region>=0&&support(level,s,s.body.world,s.body.x,s.body.y)==='floor'){s.region=region;s.checkpoint=snapshot(s);}else s.region=region;}
  return;
 }
 if(!support(level,s,s.body.world,s.body.x,s.body.y)){s.failed=true;s.won=false;s.message='失去支撑 · 撤销，或恢复安全点。';return;}
 s.won=goals(level,s).filter(g=>g.required!==false).every(g=>g.ok);
 if(s.won){s.message='地点已点亮 · '+level.name;return;}
 if(moved){const region=level.checkpoints.findIndex(r=>r.world===s.body.world&&inside(s.body,r));if(region!==s.region&&region>=0&&support(level,s,s.body.world,s.body.x,s.body.y)==='floor'){s.region=region;s.checkpoint=snapshot(s);}else s.region=region;}
}
export function select(level,s,id,world=s.view){
 if(s.failed||s.won)return false;
 if(level.schemaVersion===2){if(!availableSources(level,world).some(g=>g.id===id)){s.message='请选择带映射标记的真实源。';return false;}s.preview={id,world};s.lastSource={id,world};s.message='映射预览已就绪。';return true;}
 if(id!=='A'&&!level.bridges.some(b=>b.id===id&&b.world===world)){s.message='虚影不能作为映射源。';return false;}
 if(id==='A'&&!level.track)return false;
 s.preview={id,world};s.message=id==='A'?'真实箱 A ↔ A · 固定配对，激活不改变位置。':'固定结构 · 无真实对应物 · 将生成实体虚影。';return true;
}
export function canActivate(level,s){
 if(level.schemaVersion===2)return generationAllowed(level,s);
 if(!s.preview)return false;
 if(s.preview.id==='A')return !!level.track;
 const b=level.bridges.find(b=>b.id===s.preview.id&&b.world===s.preview.world);if(!b)return false;
 for(let y=b.y[0];y<=b.y[1];y++)for(let x=b.x[0];x<=b.x[1];x++)if(!'~E.S12'.includes(level.grids[other(b.world)][y]?.[x]||'#'))return false;
 return true;
}
export function act(level,s,type,arg){
 if(type==='undo'){const h=s.history.pop();if(!h)return false;const history=s.history;Object.assign(s,copy(h.state),{checkpoint:copy(h.checkpoint),history});return true;}
 if(type==='recover'){save(s);const h=s.history;const cp=copy(s.checkpoint);Object.assign(s,cp,{checkpoint:cp,history:h});s.message='已恢复进入安全区时的完整状态。';return true;}
 if(type==='view'){
  const recordHistory=!(arg&&typeof arg==='object'&&arg.recordHistory===false);
  const world=arg&&typeof arg==='object'?arg.world:arg||other(s.view);
  if(!['night','day'].includes(world))return false;
  if(s.view===world)return true;
  if(recordHistory)save(s);
  s.view=world;return true;
 }
 if(type==='cancelPreview'){s.preview=null;return true;}
 if(s.failed||s.won)return false;
 if(level.schemaVersion===2)return entityAction(level,s,type,arg);
 if(type==='switch'||type==='mirror'){
  const config=level.science;
  if(!config||s.view!==config.world)return false;
  const item=type==='switch'?config.inputs.find(i=>i.id===arg&&i.type==='switch'):(config.mirrors||[]).find(m=>m.id===arg);
  if(!item)return false;
  save(s);
  if(type==='switch')s.science.switches[arg]=!s.science.switches[arg];
  else s.science.mirrors[arg]=s.science.mirrors[arg]==='/'?'\\':'/';
  const result=scienceResult(level,s);
  s.message=result.output?'实验线路接通，机关打开。':'实验线路未接通。';
  settle(level,s);return true;
 }
 if(type==='activate'){
  if(!canActivate(level,s)){s.message='此处无法生成，原映射保持。';return false;}
  save(s);s.mapping=s.preview.id;s.preview=null;s.message='映射已激活 · '+s.mapping;settle(level,s);return true;
 }
 if(type==='unlink'){if(!s.mapping)return false;save(s);s.mapping=null;s.preview=null;s.message='联系已解除 · 真实物件保持位置。';settle(level,s);return true;}
 if(type==='push'){
  if(!['left','right'].includes(arg)){s.message='实验箱只能沿轨道左右推动。';return false;}
  if(!s.mapping){s.message='先选择真实物件，再激活映射。';return false;}
  if(s.mapping!=='A'){s.message='固定桥不可推动。';return false;}
  save(s);s.feedback={};for(const w of ['night','day']){const old=s.boxes[w];const dx=arg==='left'?-1:1;const [lo,hi]=level.track[w];s.boxes[w]=Math.max(lo,Math.min(hi,old+dx));s.feedback[w]={from:old,to:s.boxes[w],blocked:old===s.boxes[w]};}
  s.message=['night','day'].map(w=>`${w==='night'?'夜':'白'}端 ${s.feedback[w].blocked?'受阻':`${s.feedback[w].from} → ${s.feedback[w].to}`}`).join(' · ');settle(level,s);return true;
 }
 if(type==='move'){
  if(s.view!==s.body.world){s.message='正在观察另一世界 · 返回身体视角才能走路。';return false;}
  const [dx,dy]=arg;if(Math.abs(dx)+Math.abs(dy)!==1)return false;
  if(instrumentAt(level,s.body.world,s.body.x+dx,s.body.y+dy)){s.message='前方是实验器材，请从旁边绕行。';return false;}
  if(!support(level,s,s.body.world,s.body.x+dx,s.body.y+dy)){s.message='前方没有可通行的支撑。';return false;}
  save(s);s.body.x+=dx;s.body.y+=dy;s.message='';settle(level,s,true);return true;
 }
 if(type==='teleport'){
  if(s.view!==s.body.world){s.message='先返回身体视角，再穿门。';return false;}
  if(!level.portals.some(([x,y])=>x===s.body.x&&y===s.body.y)){s.message='走到 P1 或 P2 门座，再穿门。';return false;}
  if(!support(level,s,other(s.body.world),s.body.x,s.body.y))return false;
  save(s);s.body.world=other(s.body.world);s.view=s.body.world;s.message='已穿行至'+(s.view==='night'?'夜':'白')+'世界。';settle(level,s,true);return true;
 }
 return false;
}
export function findPath(level,s,x,y){
 if(s.view!==s.body.world||s.failed||s.won)return null;
 const q=[[s.body.x,s.body.y,[]]],seen=new Set([`${s.body.x},${s.body.y}`]);
 for(let i=0;i<q.length;i++){const [a,b,path]=q[i];if(a===x&&b===y)return path;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=a+dx,ny=b+dy,key=`${nx},${ny}`;if(!seen.has(key)&&support(level,s,s.body.world,nx,ny)&&!(level.schemaVersion===2&&entityAt(level,s,s.body.world,nx,ny))){seen.add(key);q.push([nx,ny,[...path,[dx,dy]]]);}}}return null;
}

export function bridgeActive(level,s,id){const g=level.groups?.[id];return !!g&&(!g.condition||scienceResult(level,s).signals[g.condition]===true);}
export function mappingSources(level,s){return level.schemaVersion===2?availableSources(level,s.view):[...(level.track?[{id:'A',world:s.view,label:'实验箱'}]:[]),...level.bridges.filter(b=>b.world===s.view).map(b=>({...b,label:b.id==='B'?'第一座桥':'第二座桥'}))];}
export function canPushMapping(level,s){if(level.schemaVersion===2)return activeMembers(level,s).length>0;return s.mapping==='A';}
function entityFloor(level,s,world,x,y){
 if(!hasCell(level.walk[world],x,y))return null;
 if(instrumentAt(level,world,x,y))return null;
 const d=level.doors.find(d=>d.world===world&&hasCell(d.cells,x,y));
 if(d&&!doorOpen(level,s,world,x,y)){
  const current= s.body.world===world&&s.body.x===x&&s.body.y===y;
  const real=entitiesIn(level,s,world).some(e=>!e.ghost&&hasCell([e.cell],x,y));
  if(!current&&!real)return null;
 }
 if(!hasCell(level.pits,x,y))return 'floor';
 const signals=scienceResult(level,s).signals;
 for(const h of level.decks)if(h.world===world&&hasCell(h.cells,x,y)&&signals[h.signal])return 'deck-'+h.id;
 for(const g of Object.values(level.groups))if(g.kind==='bridge'&&hasCell(g.cells,x,y)&&bridgeActive(level,s,g.id)){
  if(g.world===world)return 'real-'+g.id;
  if(g.target===world&&s.mapping===g.id)return 'ghost-'+g.id;
 }
 return null;
}
function generationAllowed(level,s){
 const selected=s.preview||s.lastSource,g=selected&&level.groups[selected.id];if(!g)return false;
 if(g.kind==='ghost'&&s.mapping===g.id&&s.entities[g.ghostId])return true;
 if(g.kind==='pair')return true;
 const obstacles=entitiesIn(level,s,g.target).filter(e=>!e.ghost);
 const closed=cell=>level.doors.some(d=>d.world===g.target&&hasCell(d.cells,...cell)&&!doorOpen(level,s,g.target,...cell));
 if(g.kind==='bridge')return bridgeActive(level,s,g.id)&&g.cells.every(([x,y])=>hasCell(level.walk[g.target],x,y)&&!hasCell(level.walls[g.target],x,y)&&!closed([x,y])&&!obstacles.some(e=>hasCell([e.cell],x,y)));
 const cell=s.entities[g.source];if(!cell)return false;
 if(g.rail&&!hasCell(g.rail,...cell))return false;
 return !hasCell(level.walls[g.target],...cell)&&!closed(cell)&&!obstacles.some(e=>hasCell([e.cell],...cell))&&!(s.body.world===g.target&&hasCell([cell],s.body.x,s.body.y));
}
function clearGhosts(level,s){for(const id of Object.keys(s.entities))if(entitySpec(level,id)?.ghost)delete s.entities[id];}
function slideEntities(level,s,ids,dx,dy){
 const positions={},feedback={};
 for(const id of ids){
  const e=entitySpec(level,id),old=s.entities[id],cell=[old[0]+dx,old[1]+dy];
  let ok=e.rail?hasCell(e.rail,...cell):!!support(level,s,e.world,...cell);
  ok=ok&&!entityAt(level,s,e.world,...cell)&&!(s.body.world===e.world&&hasCell([cell],s.body.x,s.body.y));
  positions[id]=ok?cell:[...old];feedback[id]={from:[...old],to:positions[id],blocked:!ok,world:e.world};
 }
 Object.assign(s.entities,positions);s.feedback=feedback;return feedback;
}
function activeMembers(level,s){const g=level.groups[s.mapping];return g?.kind==='pair'?g.members:g?.kind==='ghost'&&g.rail?[g.source,g.ghostId]:[];}
function entityAction(level,s,type,arg){
 if(type==='mirror'){
  const mirror=level.science.optics[s.view]?.mirrors.find(m=>m.id===arg&&m.rotatable);if(!mirror)return false;
  save(s);s.science.mirrors[arg]=s.science.mirrors[arg]==='/'?'\\':'/';s.message='镜面已转动。';settle(level,s);return true;
 }
 if(type==='activate'){
  if(!generationAllowed(level,s)){s.message='生成条件未满足，原映射保持。';return false;}
  const selected=s.preview||s.lastSource,g=level.groups[selected.id];save(s);
  if(s.mapping!==g.id){clearGhosts(level,s);s.mapping=g.id;if(g.kind==='ghost')s.entities[g.ghostId]=[...s.entities[g.source]];}
  s.lastSource={...selected};s.preview=null;s.message='映射已激活。';settle(level,s);return true;
 }
 if(type==='unlink'){
  if(!s.mapping)return false;save(s);clearGhosts(level,s);s.mapping=null;s.preview=null;s.message='真实状态留下，虚影已解除。';settle(level,s);return true;
 }
 if(type==='push'){
  const ids=activeMembers(level,s);if(!ids.length||!['left','right'].includes(arg)){s.message='当前映射不能沿此方向推动。';return false;}
  save(s);slideEntities(level,s,ids,arg==='left'?-1:1,0);s.message='两端分别结算推动。';settle(level,s);return true;
 }
 if(type==='move'){
  if(s.view!==s.body.world){s.message='回到身体视角才能走路。';return false;}
  const [dx,dy]=arg;if(Math.abs(dx)+Math.abs(dy)!==1)return false;
  const cell=[s.body.x+dx,s.body.y+dy],e=entityAt(level,s,s.body.world,...cell);
  if(e){
   if(!e.nearPush){s.message='前方实体挡住道路。';return false;}
   const ids=e.group&&s.mapping===e.group?activeMembers(level,s):[e.id];
   if(e.rail&&dy!==0)return false;
   if(ids.length===1){const next=[cell[0]+dx,cell[1]+dy];if(entityAt(level,s,e.world,...next))return false;
    if((e.rail&&!hasCell(e.rail,...next))||(!e.rail&&!support(level,s,e.world,...next))){save(s);s.feedback={[e.id]:{from:[...e.cell],to:[...e.cell],blocked:true,world:e.world}};s.message='配重受阻。';settle(level,s);return true;}
   }
   const waitingDoor=level.doors.find(d=>d.world===s.body.world&&hasCell(d.cells,...cell)&&!doorOpen(level,s,s.body.world,...cell));
   save(s);const feedback=slideEntities(level,s,ids,dx,dy);
   if(!feedback[e.id].blocked&&!waitingDoor){s.body.x=cell[0];s.body.y=cell[1];}
   s.message=feedback[e.id].blocked?'这一端受阻，另一端仍收到推力。':'';settle(level,s,true);return true;
  }
  if(!support(level,s,s.body.world,...cell)){s.message='前方没有可通行的支撑。';return false;}
  save(s);s.feedback=null;s.body.x=cell[0];s.body.y=cell[1];s.message='';settle(level,s,true);return true;
 }
 if(type==='teleport'){
  if(s.view!==s.body.world||!hasCell(level.portals,s.body.x,s.body.y))return false;
  const target=other(s.body.world);if(!support(level,s,target,s.body.x,s.body.y)||entityAt(level,s,target,s.body.x,s.body.y))return false;
  save(s);s.body.world=target;s.view=target;s.message='已穿行。';settle(level,s,true);return true;
 }
 return false;
}

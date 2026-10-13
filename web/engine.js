export const other = w => w === 'night' ? 'day' : 'night';
const copy = x => structuredClone(x);
const inside = (p,r) => p.x>=r.x[0]&&p.x<=r.x[1]&&p.y>=r.y[0]&&p.y<=r.y[1];
export function createState(level) {
 const s={body:{world:'night',x:level.start[0],y:level.start[1]},view:'night',boxes:level.track?{night:level.track.initial,day:level.track.initial}:null,mapping:null,preview:null,failed:false,won:false,feedback:null,message:level.goal,checkpoint:null,region:-1,history:[]};
 s.checkpoint=snapshot(s); return s;
}
function snapshot(s){ const {history,checkpoint,...rest}=s;return copy(rest); }
function save(s){s.history.push({state:snapshot(s),checkpoint:copy(s.checkpoint)});}
export function doorOpen(level,s,world){
 if(world!=='day'||!level.track)return false;
 // A body in the doorway physically prevents closure. This is derived from
 // current occupancy, not a latched switch; leaving closes an unpowered door.
 const occupied=s.body.world===world&&level.grids[world][s.body.y]?.[s.body.x]==='D';
 return s.boxes.day===level.track.targets.day||occupied;
}
export function support(level,s,world,x,y){
 const p={x,y};
 const real=level.bridges.find(b=>b.world===world&&inside(p,b));if(real)return 'real-'+real.id;
 const ghost=level.bridges.find(b=>b.world!==world&&b.id===s.mapping&&inside(p,b));if(ghost)return 'ghost-'+ghost.id;
 const tile=level.grids[world][y]?.[x];
 if(tile==='D')return doorOpen(level,s,world)?'floor':null;
 if(tile&&'.S12'.includes(tile))return 'floor';
 if(tile==='E'&&level.id!=='G5')return 'floor';
 return null;
}
export function goals(level,s){
 const result=Object.entries(level.track?.targets||{}).map(([w,x])=>({required:level.id!=='G2',label:`${w==='night'?'夜':'白'}箱 A · x=${x}${level.id==='G2'||(level.id==='G5'&&w==='day')?' / 白门':''}`,ok:s.boxes[w]===x}));
 result.push({label:level.id==='G5'?'身体 · 夜C虚影桥末端 (15,2–3)':'身体 · 夜世界出口',ok:s.body.world==='night'&&level.exit.some(([x,y])=>x===s.body.x&&y===s.body.y)&&(level.id!=='G5'||support(level,s,'night',s.body.x,s.body.y)==='ghost-C')});return result;
}
function settle(level,s,moved=false){
 if(!support(level,s,s.body.world,s.body.x,s.body.y)){s.failed=true;s.won=false;s.message='失去支撑 · 撤销，或恢复安全点。';return;}
 s.won=goals(level,s).filter(g=>g.required!==false).every(g=>g.ok);
 if(s.won){s.message='地点已点亮 · '+level.name;return;}
 if(moved){const region=level.checkpoints.findIndex(r=>r.world===s.body.world&&inside(s.body,r));if(region!==s.region&&region>=0&&support(level,s,s.body.world,s.body.x,s.body.y)==='floor'){s.region=region;s.checkpoint=snapshot(s);}else s.region=region;}
}
export function select(level,s,id,world=s.view){
 if(s.failed||s.won)return false;
 if(id!=='A'&&!level.bridges.some(b=>b.id===id&&b.world===world)){s.message='虚影不能作为映射源。';return false;}
 if(id==='A'&&!level.track)return false;
 s.preview={id,world};s.message=id==='A'?'真实箱 A ↔ A · 固定配对，激活不改变位置。':'固定结构 · 无真实对应物 · 将生成实体虚影。';return true;
}
export function canActivate(level,s){
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
 if(type==='activate'){
  if(!canActivate(level,s)){s.message='此处无法生成，原映射保持。';return false;}
  save(s);s.mapping=s.preview.id;s.preview=null;s.message='映射已激活 · '+s.mapping;settle(level,s);return true;
 }
 if(type==='unlink'){if(!s.mapping)return false;save(s);s.mapping=null;s.preview=null;s.message='联系已解除 · 真实物件保持位置。';settle(level,s);return true;}
 if(type==='push'){
  if(!s.mapping){s.message='先选择真实物件，再激活映射。';return false;}
  if(s.mapping!=='A'){s.message='固定桥不可推动。';return false;}
  save(s);s.feedback={};for(const w of ['night','day']){const old=s.boxes[w];const dx=arg==='left'?-1:arg==='right'?1:0;const [lo,hi]=level.track[w];s.boxes[w]=Math.max(lo,Math.min(hi,old+dx));s.feedback[w]={from:old,to:s.boxes[w],blocked:old===s.boxes[w]};}
  s.message=['night','day'].map(w=>`${w==='night'?'夜':'白'}端 ${s.feedback[w].blocked?'受阻':`${s.feedback[w].from} → ${s.feedback[w].to}`}`).join(' · ');settle(level,s);return true;
 }
 if(type==='move'){
  if(s.view!==s.body.world){s.message='正在观察另一世界 · 返回身体视角才能走路。';return false;}
  const [dx,dy]=arg;if(Math.abs(dx)+Math.abs(dy)!==1)return false;
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
 for(let i=0;i<q.length;i++){const [a,b,path]=q[i];if(a===x&&b===y)return path;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=a+dx,ny=b+dy,key=`${nx},${ny}`;if(!seen.has(key)&&support(level,s,s.body.world,nx,ny)){seen.add(key);q.push([nx,ny,[...path,[dx,dy]]]);}}}return null;
}

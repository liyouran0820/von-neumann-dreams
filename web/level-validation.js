import { createState, support } from './engine.js';
import { entitySpec, hasCell } from './entities.js';
export function validateLevel(level) {
 const need=(condition,message)=>{if(!condition)throw new Error(level.id+': '+message);};
 need(level.schemaVersion===2,'unknown schema');
 const coord=c=>Array.isArray(c)&&c.length===2&&c.every(Number.isInteger)&&c[0]>=0&&c[0]<=12&&c[1]>=0&&c[1]<=8;
 const unique=a=>new Set(a).size===a.length;
 need(unique(level.entities.map(e=>e.id)),'duplicate entity');need(level.hints.length===3,'three hints required');
 for(const world of ['night','day'])for(const p of [...level.walk[world],...level.walls[world]])need(coord(p),'invalid cell');
 for(const p of level.pits)need(coord(p),'invalid pit');
 for(const e of level.entities){need(['night','day'].includes(e.world)&&coord(e.cell),'invalid entity world/cell');if(e.rail)need(hasCell(e.rail,...e.cell)&&e.rail.every(coord),'invalid rail');}
 for(const g of Object.values(level.groups)){
  if(g.kind==='pair')need(g.members.length===2&&new Set(g.members).size===2&&g.members.every(id=>entitySpec(level,id))&&new Set(g.members.map(id=>entitySpec(level,id).world)).size===2,'invalid pair');
  else if(g.kind==='ghost')need(entitySpec(level,g.source)&&g.target!==entitySpec(level,g.source).world,'invalid ghost source');
  else need(g.kind==='bridge'&&g.cells.every(coord)&&g.cells.every(p=>hasCell(level.walk[g.target],...p)),'invalid bridge');
 }
 const outputs=new Set(),inputIds=new Set();
 for(const c of level.science.circuits){
  need(['night','day'].includes(c.world),'invalid circuit world');need(unique([...c.inputs.map(i=>i.id),...c.nodes.map(n=>n.id)]),'duplicate signal');
  const known=new Set(c.inputs.map(i=>i.id)),nodes=new Map(c.nodes.map(n=>[n.id,n])),visiting=new Set();
  const visit=id=>{if(known.has(id))return;need(nodes.has(id)&&!visiting.has(id),'missing or cyclic dependency');visiting.add(id);const n=nodes.get(id);need(['and','or','xor','nand','not'].includes(n.op),'invalid gate');need(n.args.length===(n.op==='not'?1:2),'invalid arity');for(const a of n.args)visit(a.signal);visiting.delete(id);known.add(id);};
  for(const n of c.nodes)visit(n.id);need(known.has(c.output),'missing output');
  for(const i of c.inputs){
   need(!inputIds.has(i.id)&&!outputs.has(i.id),'duplicate global input');inputIds.add(i.id);
   const world=i.world||entitySpec(level,i.entity)?.world||c.world;
   if(world!==c.world)need(['V2-01','V2-02','V2-05'].includes(level.id)&&c.crossWorld?.inputs.includes(i.id),'illegal cross-world circuit');
   if(i.type==='target')need(entitySpec(level,i.entity)&&coord(i.cell),'unknown target');
   else if(i.type==='contact')need(i.cells.length&&i.cells.every(coord),'invalid plate');
   else need(i.type==='sensor'&&level.science.optics[world]?.sensors.some(s=>s.id===i.sensor),'unknown sensor');
  }
  for(const n of c.nodes){need(!outputs.has(n.id)&&!inputIds.has(n.id),'duplicate global output');outputs.add(n.id);}
  if(c.crossWorld){
   const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
   const track=(i,id,entity,cell)=>i?.id===id&&i.type==='target'&&i.entity===entity&&eq(i.cell,cell)&&(!i.world||i.world===entitySpec(level,entity)?.world);
   const and=(n,id,args)=>n?.id===id&&n.op==='and'&&eq(n.args.map(a=>a.signal),args);
   const door=level.doors.find(d=>d.id==='D'),nightDoor=c.world==='night'&&c.output==='Y'&&door?.world==='night'&&door.signal==='Y'&&eq(door.cells,[[6,1]]);
   const first=level.id==='V2-01'&&nightDoor&&c.inputs.length===2&&track(c.inputs[0],'A','A_N',[3,7])&&track(c.inputs[1],'B','A_W',[4,7])&&c.nodes.length===1&&and(c.nodes[0],'Y',['A','B'])&&eq(c.crossWorld.inputs,['A','B'])&&c.crossWorld.output==='Y'&&c.crossWorld.door==='D'&&!c.crossWorld.bridge;
   const second=level.id==='V2-02'&&nightDoor&&c.inputs.length===3&&track(c.inputs[0],'a','A_N',[3,7])&&track(c.inputs[1],'w','A_W',[1,7])&&c.inputs[2].id==='b'&&c.inputs[2].type==='contact'&&c.inputs[2].world==='night'&&eq(c.inputs[2].cells,[[3,2]])&&c.nodes.length===2&&and(c.nodes[0],'C',['a','w'])&&and(c.nodes[1],'Y',['C','b'])&&eq(c.crossWorld.inputs,['a','w'])&&c.crossWorld.output==='C'&&c.crossWorld.door==='D'&&!c.crossWorld.bridge;
   const fifth=level.id==='V2-05'&&c.world==='day'&&c.inputs.length===2&&track(c.inputs[0],'a','A_N',[5,2])&&track(c.inputs[1],'b','A_W',[2,2])&&c.nodes.length===1&&and(c.nodes[0],'Y',['a','b'])&&c.output==='Y'&&eq(c.crossWorld.inputs,['a','b'])&&c.crossWorld.output==='Y'&&c.crossWorld.bridge==='B'&&!c.crossWorld.door&&level.groups.B.condition==='Y';
   need(first||second||fifth,'cross-world whitelist mismatch');
  }
 }
 const all=new Set([...inputIds,...outputs]);
 for(const d of level.doors)need(all.has(d.signal)&&d.cells.every(p=>hasCell(level.walk[d.world],...p)),'invalid door');
 for(const h of level.decks)need(all.has(h.signal)&&h.cells.every(p=>hasCell(level.pits,...p)),'invalid deck');
 for(const g of Object.values(level.groups))if(g.condition)need(all.has(g.condition),'missing bridge condition');
 const mirrors=[];for(const o of Object.values(level.science.optics)){for(const i of [...o.emitters,...o.mirrors,...o.sensors])need(coord(i.cell),'invalid optical cell');mirrors.push(...o.mirrors.map(m=>m.id));}
 need(unique(mirrors),'duplicate mirror');
 const state=createState(level);need(support(level,state,'night',...level.start),'unsupported start');
 for(const e of level.entities.filter(e=>e.kind==='weight'))need(support(level,state,e.world,...e.cell),'unsupported weight');
 for(const p of level.portals)for(const w of ['night','day'])need(support(level,state,w,...p),'unsupported portal');
 for(const p of level.exit)need(hasCell(level.walk.night,...p),'invalid exit');
 return true;
}
export function validateLevels(levels){if(new Set(levels.map(l=>l.id)).size!==levels.length)throw new Error('duplicate level ID');levels.forEach(validateLevel);return true;}

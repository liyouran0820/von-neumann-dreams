// Geometry and identity shared by commands, circuits, path finding and rendering.
export const sameCell = (a,b) => a[0]===b[0] && a[1]===b[1];
export const hasCell = (cells,x,y) => cells.some(c=>c[0]===x&&c[1]===y);
export function entitySpec(level,id) {
 const real=level.entities.find(e=>e.id===id);if(real)return real;
 const group=Object.values(level.groups).find(g=>g.ghostId===id);
 if(!group)return null;
 const source=level.entities.find(e=>e.id===group.source);
 return {...source,id,world:group.target,rail:group.rail,ghost:true,nearPush:group.rail?true:!!source.nearPush,group:group.id};
}
export function entitiesIn(level,state,world) {
 return Object.entries(state.entities).filter(([id])=>entitySpec(level,id)?.world===world)
  .map(([id,cell])=>({...entitySpec(level,id),cell}));
}
export function entityAt(level,state,world,x,y) {
 return entitiesIn(level,state,world).find(e=>sameCell(e.cell,[x,y]))||null;
}
export function availableSources(level,world) {
 return Object.values(level.groups).filter(g=>g.kind==='pair'||g.world===world||g.sourceWorld===world)
  .map(g=>({id:g.id,world,label:g.label}));
}

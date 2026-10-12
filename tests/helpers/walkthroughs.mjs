import * as G from '../../web/engine.js';
export function bind(l,s,id){const world=id==='A'?s.view:l.bridges.find(b=>b.id===id).world;G.select(l,s,id,world);if(!G.act(l,s,'activate'))throw Error('无法映射 '+id);}
export function walk(l,s,x,y){G.act(l,s,'view',s.body.world);const p=G.findPath(l,s,x,y);if(!p)throw Error(`无路 ${l.id} ${x},${y}`);for(const d of p)G.act(l,s,'move',d);}
export function push(l,s,seq){for(const d of seq)G.act(l,s,'push',d==='L'?'left':'right');}
export function portal(l,s,x,y){walk(l,s,x,y);if(!G.act(l,s,'teleport'))throw Error('无法穿门');}
export function solve(l,s){
 if(l.id==='G1'){bind(l,s,'A');push(l,s,'RRR');walk(l,s,8,4);}
 if(l.id==='G2'){bind(l,s,'A');push(l,s,'RR');G.act(l,s,'unlink');portal(l,s,3,3);portal(l,s,9,3);walk(l,s,10,3);}
 if(l.id==='G3'){bind(l,s,'B');portal(l,s,3,3);portal(l,s,11,3);walk(l,s,12,3);}
 if(l.id==='G4'){bind(l,s,'B');portal(l,s,9,2);portal(l,s,12,4);bind(l,s,'C');walk(l,s,18,4);}
 if(l.id==='G5'){bind(l,s,'A');push(l,s,'LLRRR');bind(l,s,'B');portal(l,s,9,3);portal(l,s,12,3);bind(l,s,'C');walk(l,s,15,3);}
 return s;
}

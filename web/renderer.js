import * as Game from './engine.js';
export function renderMap(level,s,world,mini=false){
 const rows=level.grids[world],size=40;let out=`<svg viewBox="-14 -22 ${rows[0].length*size+28} ${rows.length*size+38}" aria-label="${world==='night'?'夜':'白'}世界地图" class="map ${world}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="hatch-${world}-${mini}" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="currentColor" opacity=".3"/></pattern></defs>`;
 for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++){
  const tile=rows[y][x],support=Game.support(level,s,world,x,y),bridge=level.bridges.find(b=>x>=b.x[0]&&x<=b.x[1]&&y>=b.y[0]&&y<=b.y[1]),ghost=support?.startsWith('ghost'),real=support?.startsWith('real'),preview=bridge&&s.preview?.id===bridge.id&&world!==bridge.world&&s.mapping!==bridge.id,vanish=ghost&&s.preview&&s.preview.id!==s.mapping;
  let kind=tile==='#'?'wall':tile==='='?'glass':support?'floor':'void';if('At-'.includes(tile))kind='track';if(tile==='D')kind=Game.doorOpen(level,s,world)?'door open':'door';if(real||ghost)kind=ghost?'bridge ghost':'bridge real';
  out+=`<g data-cell="${x},${y}" ${mini?'':`data-x="${x}" data-y="${y}"`} class="cell ${kind}${vanish?' vanish':''}"><rect x="${x*size+1}" y="${y*size+1}" width="38" height="38" rx="3"/>`;
  if(world==='day'&&kind==='floor')out+=`<path class="daygrain" d="M${x*size+16} ${y*size+20}h8M${x*size+20} ${y*size+16}v8"/>`;
  if(preview)out+=`<rect class="preview" x="${x*size+3}" y="${y*size+3}" width="34" height="34" rx="2"/>`;
  if(vanish)out+=`<rect fill="url(#hatch-${world}-${mini})" x="${x*size+1}" y="${y*size+1}" width="38" height="38"/>`;
  if(real||ghost||preview)out+=`<text x="${x*size+20}" y="${y*size+25}" class="bridge-label">${bridge.id}${ghost?'′':''}</text>`;
  if('12'.includes(tile))out+=`<circle class="portal" cx="${x*size+20}" cy="${y*size+20}" r="15"/><text x="${x*size+20}" y="${y*size+25}">P${tile}</text>`;
  if(tile==='D')out+=`<text x="${x*size+20}" y="${y*size+25}">${Game.doorOpen(level,s,world)?'开':'门'}</text>`;
  if(kind==='track')out+=`<text class="tick" x="${x*size+20}" y="${y*size+35}">${x}</text>`;
  if(level.track?.targets[world]===x&&level.track.y===y)out+=`<circle class="target ${s.boxes[world]===x?'lit':''}" cx="${x*size+20}" cy="${y*size+18}" r="16"/>`;
  if(world==='night'&&level.exit.some(([a,b])=>a===x&&b===y))out+=`<circle class="exit" cx="${x*size+20}" cy="${y*size+20}" r="17"/><text x="${x*size+20}" y="${y*size+25}">E</text>`;
  out+='</g>';
 }
 if(level.track){const x=s.boxes[world]*size,y=level.track.y*size;out+=`<g class="box ${s.feedback?.[world]?.blocked?'blocked':''}" ${mini?'':`data-object="A"`}><rect x="${x+7}" y="${y+5}" width="26" height="26" rx="4"/><text x="${x+20}" y="${y+24}">A</text></g>`;}
 if(s.body.world===world){const x=s.body.x*size+20,y=s.body.y*size+20;out+=`<g class="player ${s.failed?'fallen':''}" aria-label="身体 ${s.body.x},${s.body.y}"><path d="M${x-10} ${y+11}L${x-8} ${y-7}Q${x} ${y-18} ${x+8} ${y-7}L${x+10} ${y+11}L${x+3} ${y+7}L${x} ${y+12}L${x-3} ${y+7}Z"/><path class="eyes" d="M${x-4} ${y-2}v3M${x+4} ${y-2}v3"/></g>`;}
 for(let x=0;x<rows[0].length;x++)out+=`<text class="axis" x="${x*size+20}" y="-7">${x}</text>`;
 for(let y=0;y<rows.length;y++)out+=`<text class="axis" x="-7" y="${y*size+25}">${y}</text>`;
 return out+'</svg>';
}

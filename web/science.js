import { entitiesIn, entitySpec, hasCell } from './entities.js';
// Pure teaching rules. Signals and light stay within the configured world.
export function evaluateCircuit(node, signals, depth = 0) {
  if (depth > 32) throw new Error('Circuit nesting exceeds 32');
  if (node.signal) {
    if (typeof signals[node.signal] !== 'boolean') throw new Error('Unknown signal: ' + node.signal);
    return signals[node.signal];
  }
  if (node.op === 'not' && node.args?.length === 1) return !evaluateCircuit(node.args[0], signals, depth + 1);
  if (!['and', 'or', 'xor', 'nand'].includes(node.op) || !node.args?.length) throw new Error('Invalid logic gate');
  const values = node.args.map(child => evaluateCircuit(child, signals, depth + 1));
  if (node.op === 'nand') return !values.every(Boolean);
  if (node.op === 'xor') return values.filter(Boolean).length % 2 === 1;
  return node.op === 'and' ? values.every(Boolean) : values.some(Boolean);
}

// Grid y points down. Each mirror lies at 45 degrees; these are exact planar
// reflections of a cardinal direction, not a destination-to-destination shortcut.
export function reflect(direction, orientation) {
  const [dx, dy] = direction;
  if (Math.abs(dx) + Math.abs(dy) !== 1) throw new Error('Cardinal light direction required');
  if (!['/', '\\'].includes(orientation)) throw new Error('Unknown mirror orientation');
  return (orientation === '/' ? [-dy, -dx] : [dy, dx]).map(n => n || 0);
}

export function traceLight(grid, emitters = [], mirrors = [], sensors = [], blockers = []) {
  const segments = [], bounces = [], hits = new Set(), ends = [];
  for (const emitter of emitters) {
    let [x, y] = emitter.cell, [dx, dy] = emitter.direction, start = [x, y];
    if (Math.abs(dx) + Math.abs(dy) !== 1) throw new Error('Cardinal emitter direction required');
    const visited = new Set();
    const segment = end => {
      if (start[0] !== end[0] || start[1] !== end[1]) segments.push({ from: start, to: end, emitter: emitter.id });
      start = end;
    };
    while (true) {
      const key = [x, y, dx, dy].join(',');
      if (visited.has(key)) { segment([x, y]); ends.push({ emitter: emitter.id, reason: 'cycle' }); break; }
      visited.add(key);
      x += dx; y += dy;
      const tile = grid[y]?.[x];
      if (!tile || '#D'.includes(tile)) {
        segment([x - dx / 2, y - dy / 2]);
        ends.push({ emitter: emitter.id, reason: tile ? 'wall' : 'bounds' }); break;
      }
      const blocker=blockers.find(item => hasCell(item.cells || [item.cell], x, y));
      if (blocker) {
        const half=blocker.halfExtents||[.5,.5];segment([x - dx * half[0], y - dy * half[1]]);
        ends.push({ emitter: emitter.id, reason: 'entity' }); break;
      }
      const sensor = sensors.find(item => item.cell[0] === x && item.cell[1] === y);
      if (sensor) { segment([x, y]); hits.add(sensor.id); ends.push({ emitter: emitter.id, reason: 'sensor', sensor: sensor.id }); break; }
      const mirror = mirrors.find(item => item.cell[0] === x && item.cell[1] === y);
      if (mirror) {
        segment([x, y]);
        const outgoing = reflect([dx, dy], mirror.orientation);
        bounces.push({ id: mirror.id, cell: [x, y], incoming: [dx, dy], outgoing, incidenceDeg: 45, reflectionDeg: 45 });
        [dx, dy] = outgoing;
      }
    }
  }
  return { segments, bounces, hits: [...hits].sort(), ends };
}

export function initialScience(level) {
  if (!level.science) return null;
  if(level.schemaVersion===2)return {switches:{},mirrors:Object.fromEntries(Object.values(level.science.optics).flatMap(o=>o.mirrors).map(m=>[m.id,m.orientation]))};
  return {
    switches: Object.fromEntries(level.science.inputs.filter(i => i.type === 'switch').map(i => [i.id, !!i.initial])),
    mirrors: Object.fromEntries((level.science.mirrors || []).map(m => [m.id, m.orientation])),
  };
}

export function scienceResult(level, state) {
  const config = level.science;
  if (!config) return null;
  if(level.schemaVersion===2)return multiScience(level,state);
  const optics = traceLight(level.grids[config.world], config.emitters,
    (config.mirrors || []).map(m => ({ ...m, orientation: state.science.mirrors[m.id] })), config.sensors);
  const signals = {};
  for (const input of config.inputs) {
    const inputWorld = input.world || config.world;
    if (config.scope !== 'assessment' && inputWorld !== config.world) throw new Error('Door circuits require local inputs');
    if (input.type === 'plate') signals[input.id] = state.boxes?.[inputWorld] === input.x;
    else if (input.type === 'switch') signals[input.id] = state.science.switches[input.id];
    else if (input.type === 'sensor') signals[input.id] = optics.hits.includes(input.sensor);
    else throw new Error('Unknown science input');
  }
  const doors=Object.fromEntries((config.doors||[]).map(door=>[door.id,evaluateCircuit(door.circuit,signals)]));
  return { world: config.world, signals, output: evaluateCircuit(config.circuit, signals), lessonOutput: evaluateCircuit(config.lessonCircuit || config.circuit, signals), doors, optics };
}

export function instrumentAt(level, world, x, y) {
  const config = level.science;
  if(level.schemaVersion===2){const o=config?.optics[world];return o?[...o.mirrors,...o.emitters,...o.sensors].find(i=>i.groundBlocking&&hasCell([i.cell],x,y))||null:null;}
  if (!config || config.world !== world) return null;
  const instruments = [
    ...config.inputs.filter(i => i.type === 'switch'),
    ...(config.mirrors || []), ...(config.emitters || []), ...(config.sensors || []),
  ];
  return instruments.find(item => item.cell?.[0] === x && item.cell?.[1] === y) || null;
}

function multiScience(level,state) {
 const opticsByWorld={},signals={},circuits=[];
 for(const world of ['night','day']){
  const o=level.science.optics[world];
  if(!o){opticsByWorld[world]={segments:[],bounces:[],hits:[],ends:[]};continue;}
  const grid=Array.from({length:9},()=>Array(13).fill('.'));
  const blockers=[...(o.absorbers||[]).map(cell=>({cell,halfExtents:[.275,.04]})),...entitiesIn(level,state,world).filter(e=>e.height>=o.height).map(e=>({cell:e.cell,halfExtents:e.opticalHalfExtents}))];
  opticsByWorld[world]=traceLight(grid.map(r=>r.join('')),o.emitters,o.mirrors.map(m=>({...m,orientation:state.science.mirrors[m.id]})),o.sensors,blockers);
 }
 for(const c of level.science.circuits){
  const local={};
  for(const i of c.inputs){
   const world=i.world||entitySpec(level,i.entity)?.world||c.world;
   if(world!==c.world&&!c.crossWorld?.inputs.includes(i.id))throw new Error('Door circuits require local inputs');
   if(i.type==='target')local[i.id]=!!state.entities[i.entity]&&hasCell([i.cell],...state.entities[i.entity]);
   else if(i.type==='contact')local[i.id]=entitiesIn(level,state,world).some(e=>hasCell(i.cells,...e.cell))||(state.body.world===world&&hasCell(i.cells,state.body.x,state.body.y));
   else if(i.type==='sensor')local[i.id]=opticsByWorld[world].hits.includes(i.sensor);
   else throw new Error('Unknown science input');
  }
  const pending=new Map(c.nodes.map(n=>[n.id,n])),visiting=new Set();
  function resolve(id){
   if(typeof local[id]==='boolean')return local[id];
   if(visiting.has(id)||!pending.has(id))throw new Error('Invalid circuit dependency: '+id);
   visiting.add(id);const n=pending.get(id);for(const a of n.args)resolve(a.signal);
   local[id]=evaluateCircuit(n,local);visiting.delete(id);return local[id];
  }
  for(const n of c.nodes)resolve(n.id);
  Object.assign(signals,local);circuits.push({id:c.id,world:c.world,signals:local,output:resolve(c.output)});
 }
 const doors=Object.fromEntries(level.doors.map(d=>[d.id,signals[d.signal]])),output=circuits.at(-1)?.output||false;
 return {world:level.science.world,signals,output,lessonOutput:output,doors,circuits,opticsByWorld,optics:opticsByWorld[level.science.world]};
}

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

export function traceLight(grid, emitters = [], mirrors = [], sensors = []) {
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
  return {
    switches: Object.fromEntries(level.science.inputs.filter(i => i.type === 'switch').map(i => [i.id, !!i.initial])),
    mirrors: Object.fromEntries((level.science.mirrors || []).map(m => [m.id, m.orientation])),
  };
}

export function scienceResult(level, state) {
  const config = level.science;
  if (!config) return null;
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
  if (!config || config.world !== world) return null;
  const instruments = [
    ...config.inputs.filter(i => i.type === 'switch'),
    ...(config.mirrors || []), ...(config.emitters || []), ...(config.sensors || []),
  ];
  return instruments.find(item => item.cell?.[0] === x && item.cell?.[1] === y) || null;
}

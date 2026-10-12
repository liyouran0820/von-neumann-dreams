export const DIRECTIONS = ['北', '东', '南', '西'];

export function createState(level) {
  return {
    node: level.start, facing: level.facing ?? 1, memory: 0,
    bindings: Object.fromEntries(level.devices.map(d => [d.id, d.source])),
    steps: 0, status: 'ready', reason: '', lastRule: null,
  };
}

export function nameOf(level, id) {
  if (id === 'memory') return '记忆符印';
  return [...level.sources, ...level.devices, ...level.nodes].find(o => o.id === id)?.name ?? id;
}

export function signalsFor(level, state) {
  const values = { memory: state.memory };
  for (const source of level.sources) values[source.id] = Number(state.node === source.node);
  const visiting = new Set();
  function read(id) {
    if (Object.hasOwn(values, id)) return values[id];
    const device = level.devices.find(d => d.id === id);
    if (!device) throw new Error(`找不到来源「${id}」`);
    if (visiting.has(id)) throw new Error('这条连接形成了循环依赖');
    visiting.add(id);
    values[id] = Number(read(state.bindings[id]) === device.activeWhen);
    visiting.delete(id);
    return values[id];
  }
  for (const device of level.devices) read(device.id);
  return values;
}

export function directionBetween(level, from, to) {
  const a = level.nodes.find(n => n.id === from);
  const b = level.nodes.find(n => n.id === to);
  if (a.x === b.x) return b.y > a.y ? 2 : 0;
  if (a.y === b.y) return b.x > a.x ? 1 : 3;
  throw new Error('道路必须沿网格轴连接');
}

export function forwardEdge(level, state) {
  return level.edges.find(e => {
    if (!e.ends.includes(state.node)) return false;
    const other = e.ends.find(n => n !== state.node);
    return directionBetween(level, state.node, other) === state.facing;
  });
}

export function canMove(level, state, signals = signalsFor(level, state)) {
  const edge = forwardEdge(level, state);
  return Boolean(edge && (!edge.gate || signals[edge.gate] === 1));
}

export function evaluateCondition(expression, level, state, signals = signalsFor(level, state)) {
  switch (expression.type) {
    case 'always': return true;
    case 'ahead': return canMove(level, state, signals);
    case 'at': return state.node === expression.node;
    case 'facing': return state.facing === expression.value;
    case 'memory': return state.memory === expression.value;
    case 'signal': return signals[expression.source] === expression.value;
    case 'binding': return state.bindings[expression.target] === expression.source;
    case 'all': return expression.items.every(e => evaluateCondition(e, level, state, signals));
    case 'not': return !evaluateCondition(expression.item, level, state, signals);
    default: throw new Error('未知条件');
  }
}

export function actionsFor(level) {
  const sources = [{ id: 'memory', name: '记忆符印' }, ...level.sources, ...level.devices];
  return [
    { id: 'move', label: '往前走' },
    { id: 'turn-left', label: '向左转' },
    { id: 'turn-right', label: '向右转' },
    ...sources.filter(s => s.id !== 'memory').map(s => ({ id: `sample:${s.id}`, label: `记住${s.name}的状态` })),
    ...level.devices.flatMap(d => sources.filter(s => s.id !== d.id).map(s => ({
      id: `link:${d.id}:${s.id}`, label: `${d.name}跟随${s.name}`,
    }))),
  ];
}

export function isComplete(level, state, signals = signalsFor(level, state)) {
  return state.node === level.goal && (level.goalDevices ?? []).every(id => signals[id] === 1);
}

export function fingerprint(state) {
  return JSON.stringify([state.node, state.facing, state.memory, Object.entries(state.bindings).sort()]);
}

export function stepProgram(level, state, program) {
  if (state.status === 'success') return { state, event: { kind: 'success', message: '本章已完成。' } };
  const before = signalsFor(level, state);
  if (isComplete(level, state, before)) {
    return { state: { ...state, status: 'success' }, event: { kind: 'success', message: '协议生效，纸灵抵达出口。' } };
  }
  const index = program.findIndex(rule => {
    if (rule.enabled === false) return false;
    const condition = level.conditions.find(c => c.id === rule.condition);
    return condition && evaluateCondition(condition.expression, level, state, before);
  });
  if (index < 0) {
    const blocked = { ...state, status: 'blocked', reason: '没有规则匹配。检查位置、来源状态与前方道路。', lastRule: null };
    return { state: blocked, event: { kind: 'blocked', message: blocked.reason, ruleIndex: null } };
  }
  const rule = program[index];
  const next = { ...state, bindings: { ...state.bindings }, steps: state.steps + 1, status: 'ready', reason: '', lastRule: index };
  const [verb, a, b] = rule.action.split(':');
  let message = '';
  try {
    if (!actionsFor(level).some(action => action.id === rule.action)) throw new Error('这条行动不可用');
    if (verb === 'move') {
      if (!canMove(level, state, before)) throw new Error('前方道路尚未接通');
      next.node = forwardEdge(level, state).ends.find(n => n !== state.node);
      message = `前进至${nameOf(level, next.node)}`;
    } else if (verb === 'turn-left' || verb === 'turn-right') {
      next.facing = (state.facing + (verb === 'turn-left' ? 3 : 1)) % 4;
      message = `转向${DIRECTIONS[next.facing]}`;
    } else if (verb === 'sample') {
      next.memory = before[a];
      message = `记住${nameOf(level, a)}此刻的${next.memory ? '亮' : '暗'}`;
    } else if (verb === 'link') {
      next.bindings[a] = b;
      signalsFor(level, next);
      message = `${nameOf(level, a)}改为跟随${nameOf(level, b)}`;
    }
    const after = signalsFor(level, next);
    const changes = Object.keys(after).filter(id => after[id] !== before[id]).map(id => ({ id, before: before[id], after: after[id] }));
    if (isComplete(level, next, after)) next.status = 'success';
    return { state: next, event: { kind: next.status === 'success' ? 'success' : 'action', message, ruleIndex: index, action: rule.action, changes, from: state.node, to: next.node } };
  } catch (error) {
    const blocked = { ...state, bindings: { ...state.bindings }, status: 'blocked', reason: error.message, lastRule: index };
    return { state: blocked, event: { kind: 'blocked', message: error.message, ruleIndex: index, changes: [] } };
  }
}

export function runProgram(level, program, limit = 128) {
  let state = createState(level);
  const seen = new Set([fingerprint(state)]);
  const events = [];
  for (let i = 0; i < limit; i++) {
    const result = stepProgram(level, state, program);
    state = result.state;
    events.push(result.event);
    if (['success', 'blocked'].includes(state.status)) return { state, events };
    const key = fingerprint(state);
    if (seen.has(key)) return { state: { ...state, status: 'blocked', reason: '完整状态重复，程序进入循环。' }, events };
    seen.add(key);
  }
  return { state: { ...state, status: 'blocked', reason: '超过 128 步运行预算。' }, events };
}

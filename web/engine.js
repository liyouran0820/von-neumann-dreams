export const CODES = ['F', 'T', 'S'];
export const DIRECTIONS = ['北', '东', '南', '西'];
export const MAX_STEPS = 256;
export const INSTRUCTIONS = {
  F: { name: '前进', description: '沿纸灵当前朝向走一格。' },
  T: { name: '右转', description: '原地顺时针转四分之一圈。' },
  S: { name: '交换', description: '把脚下符文与下一格程序对调。' },
};

export function validProgram(program, level) {
  return Array.isArray(program) && program.length === level.slots && program.every(code => CODES.includes(code));
}

export function createState(level, program = level.initialProgram) {
  if (!validProgram(program, level)) throw new Error('程序长度或指令不正确');
  const floor = Object.fromEntries(level.cells.map(cell => [cell.x + ',' + cell.y, cell.code]));
  if (!Object.hasOwn(floor, level.start) || !Object.hasOwn(floor, level.goal)) throw new Error('起点和出口必须有地面');
  if (Object.values(floor).some(code => !CODES.includes(code))) throw new Error('地面包含未知符文');
  return {
    cell: level.start, facing: level.facing ?? 1, pc: 0,
    program: [...program], floor, steps: 0, status: 'ready',
    reason: '', lastSlot: null, lastSwap: null,
  };
}

export function cloneState(state) {
  return { ...state, program: [...state.program], floor: { ...state.floor }, lastSwap: state.lastSwap ? { ...state.lastSwap } : null };
}

export function fingerprint(state) {
  return JSON.stringify([state.cell, state.facing, state.pc, state.program, Object.entries(state.floor).sort()]);
}

export function symbolCounts(state) {
  const values = [...state.program, ...Object.values(state.floor)];
  return Object.fromEntries(CODES.map(code => [code, values.filter(value => value === code).length]));
}

export function isComplete(level, state) { return state.cell === level.goal; }

export function stepProgram(level, state) {
  if (state.status !== 'ready') return { state, event: { kind: 'idle', message: state.reason || '本轮已结束。' } };
  if (isComplete(level, state)) return { state: { ...state, status: 'success' }, event: { kind: 'success', message: '纸灵抵达出口。' } };
  const slot = state.pc, action = state.program[slot], target = (slot + 1) % state.program.length;
  const next = cloneState(state);
  next.lastSlot = slot; next.lastSwap = null; next.reason = '';
  let message;
  if (action === 'F') {
    const [x, y] = state.cell.split(',').map(Number);
    const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][state.facing];
    const destination = (x + dx) + ',' + (y + dy);
    if (!Object.hasOwn(state.floor, destination)) {
      return { state: { ...next, status: 'blocked', reason: '前方没有地面。换一条指令再试试。' }, event: { kind: 'blocked', action, slot, message: '前方没有地面，纸灵停住了。', from: state.cell, to: destination } };
    }
    next.cell = destination;
    message = '前进到 ' + destination;
  } else if (action === 'T') {
    next.facing = (state.facing + 1) % 4;
    message = '右转，现在朝' + DIRECTIONS[next.facing];
  } else if (action === 'S') {
    const incoming = state.floor[state.cell], outgoing = state.program[target];
    next.program[target] = incoming; next.floor[state.cell] = outgoing;
    next.lastSwap = { cell: state.cell, slot: target, incoming, outgoing };
    message = '地面的“' + INSTRUCTIONS[incoming].name + '”进入第 ' + (target + 1) + ' 格；“' + INSTRUCTIONS[outgoing].name + '”留在地面。';
  } else throw new Error('未知指令');
  next.steps++; next.pc = target;
  if (isComplete(level, next)) next.status = 'success';
  return { state: next, event: { kind: action === 'S' ? 'swap' : action === 'T' ? 'turn' : 'move', action, slot, message, from: state.cell, to: next.cell, swap: next.lastSwap ? { ...next.lastSwap } : null } };
}

export function createSession(level, program = level.initialProgram) {
  return { state: createState(level, program), history: [], events: [] };
}

export function stepSession(level, session, limit = MAX_STEPS) {
  if (session.state.status !== 'ready') return session;
  const history = [...session.history, { state: cloneState(session.state), eventCount: session.events.length }];
  const result = stepProgram(level, session.state);
  let state = result.state, event = { ...result.event, step: state.steps };
  if (state.status === 'ready') {
    const key = fingerprint(state);
    if (history.some(frame => fingerprint(frame.state) === key)) {
      state = { ...state, status: 'blocked', reason: '整个世界回到了相同状态，程序会一直重复。' };
      event = { ...event, kind: 'cycle', message: state.reason };
    } else if (state.steps >= limit) {
      state = { ...state, status: 'blocked', reason: '已经运行 ' + limit + ' 步。暂停下来检查程序。' };
      event = { ...event, kind: 'budget', message: state.reason };
    }
  }
  return { state, history, events: [...session.events, event] };
}

export function undoSession(session) {
  if (!session.history.length) return session;
  const frame = session.history.at(-1);
  return { state: cloneState(frame.state), history: session.history.slice(0, -1), events: session.events.slice(0, frame.eventCount) };
}

export function runProgram(level, program, limit = MAX_STEPS) {
  let session = createSession(level, program);
  while (session.state.status === 'ready') session = stepSession(level, session, limit);
  return session;
}

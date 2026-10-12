export const EPS = 1e-7;
const copy = value => structuredClone(value);
const entity = (level, id) => level.objects.find(object => object.id === id);
const edgeKey = (a, b) => [a, b].sort().join(':');

export function worldPositions(level, state) {
  const result = {}, visiting = new Set();
  function read(id) {
    if (result[id]) return result[id];
    const object = entity(level, id);
    if (!object) throw new Error('找不到刻轨物件：' + id);
    if (visiting.has(id)) throw new Error('承载关系不能成环');
    visiting.add(id);
    const parent = object.parent ? read(object.parent) : [0, 0];
    const point = object.origin.map((value, axis) => parent[axis] + value + object.axis[axis] * state.q[id]);
    visiting.delete(id); result[id] = point; return point;
  }
  level.objects.forEach(object => read(object.id));
  return result;
}

export function groupOf(state, id) {
  const found = new Set([id]), pending = [id];
  while (pending.length) {
    const current = pending.pop();
    for (const [a, b] of state.links) {
      const other = a === current ? b : b === current ? a : null;
      if (other != null && !found.has(other)) { found.add(other); pending.push(other); }
    }
  }
  return [...found].sort();
}

export function linked(state, a, b) { return state.links.some(edge => edgeKey(...edge) === edgeKey(a, b)); }
export function gripPosition(level, state, id) {
  const object = entity(level, id);
  if (!object?.grip) return null;
  const position = worldPositions(level, state)[id];
  return object.grip.map((offset, axis) => position[axis] + offset);
}
export function canGrab(level, state, id) {
  const grip = gripPosition(level, state, id);
  return grip && Math.abs(grip[0] - state.player.pos[0]) + Math.abs(grip[1] - state.player.pos[1]) <= 1 + EPS;
}

function worldRect(position, rect) {
  return { x: position[0] + rect.x - .5, y: position[1] + rect.y - .5, w: rect.w, h: rect.h };
}
function contains(rect, point) {
  return point[0] >= rect.x - EPS && point[0] <= rect.x + rect.w - 1 + EPS &&
    point[1] >= rect.y - EPS && point[1] <= rect.y + rect.h - 1 + EPS;
}
export function floorRegions(level, state) {
  const positions = worldPositions(level, state);
  return [
    ...level.floors.map(rect => ({ ...rect, owner: null, carry: false, priority: 0 })),
    ...level.objects.filter(object => object.floor).map(object => ({
      ...object.floor, x: positions[object.id][0] + object.floor.x, y: positions[object.id][1] + object.floor.y,
      owner: object.id, priority: object.floor.priority ?? 1,
    })),
  ];
}
function floorAt(level, state, position) {
  return floorRegions(level, state).filter(rect => contains(rect, position)).sort((a, b) => b.priority - a.priority)[0] ?? null;
}

function linearWindow(start, end, lo, hi) {
  const velocity = end - start;
  if (Math.abs(velocity) < EPS) return start > lo && start < hi ? [0, 1] : null;
  const a = (lo - start) / velocity, b = (hi - start) / velocity;
  const interval = [Math.max(0, Math.min(a, b)), Math.min(1, Math.max(a, b))];
  return interval[0] < interval[1] - EPS ? interval : null;
}
function sweptOverlap(a, endA, b, endB) {
  let entry = 0, exit = 1;
  for (const axis of ['x', 'y']) {
    const length = axis === 'x' ? 'w' : 'h';
    const relative = a[axis] + a[length] / 2 - b[axis] - b[length] / 2;
    const velocity = (endA[axis] - a[axis]) - (endB[axis] - b[axis]);
    const extent = (a[length] + b[length]) / 2 - EPS;
    const interval = linearWindow(relative, relative + velocity, -extent, extent);
    if (!interval) return false;
    entry = Math.max(entry, interval[0]); exit = Math.min(exit, interval[1]);
    if (entry >= exit - EPS) return false;
  }
  return true;
}
function bodyBoxes(level, state) {
  const positions = worldPositions(level, state);
  return level.objects.flatMap(object => [...(object.solid ? [object.solid] : []), ...(object.colliders ?? [])].map(rect => ({ id: object.id, rect: worldRect(positions[object.id], rect) })));
}
function avatarBox(position) { return { x: position[0] - .22, y: position[1] - .22, w: .44, h: .44 }; }

function mechanicalBlock(level, before, candidate, members) {
  for (const id of members) {
    const object = entity(level, id), q = candidate.q[id];
    if (q < object.min - EPS || q > object.max + EPS) return {
      type: 'endpoint', body: id, message: object.name + '抵住了刻轨的' + (q < object.min ? '起点' : '尽头') + '，整组停住。',
    };
  }
  const old = worldPositions(level, before), next = worldPositions(level, candidate);
  for (const guide of level.guides ?? []) {
    const axis = guide.axis ?? 0, from = old[guide.body][axis], to = next[guide.body][axis];
    if (Math.min(from, to) < guide.value - EPS || Math.max(from, to) > guide.value + EPS) return {
      type: 'guide', body: guide.body, message: entity(level, guide.body).name + '的细轴抵住了' + guide.name + '，整组停住。',
    };
  }
  const a = bodyBoxes(level, before), b = bodyBoxes(level, candidate);
  for (let i = 0; i < a.length; i++) {
    for (let j = i + 1; j < a.length; j++) {
      if (a[i].id === a[j].id) continue;
      if (sweptOverlap(a[i].rect, b[i].rect, a[j].rect, b[j].rect)) return {
        type: 'collision', body: a[i].id, message: entity(level, a[i].id).name + '与' + entity(level, a[j].id).name + '相抵，整组停住。',
      };
    }
    for (const obstacle of level.obstacles ?? []) {
      if (obstacle.avatarOnly) continue;
      const box = worldRect([0, 0], obstacle);
      if (sweptOverlap(a[i].rect, b[i].rect, box, box)) return {
        type: 'collision', body: a[i].id, message: entity(level, a[i].id).name + '抵住了' + obstacle.name + '，整组停住。',
      };
    }
  }
  return null;
}

function dangerAlong(level, before, candidate) {
  for (const support of level.supports ?? []) {
    const object = entity(level, support.body);
    const exposed = linearWindow(before.q[object.id], candidate.q[object.id], object.min + EPS, object.max - EPS);
    const absent = linearWindow(before.q[support.bridge], candidate.q[support.bridge], -Infinity, support.at - EPS);
    if (exposed && absent && Math.max(exposed[0], absent[0]) < Math.min(exposed[1], absent[1]) - EPS) return {
      type: 'support', body: support.bridge, message: entity(level, support.bridge).name + '撤走了支撑。可以撤回这一步。',
    };
  }
  if (!floorAt(level, candidate, candidate.player.pos)) return {
    type: 'fall', body: null, message: '脚下失去支撑。可以撤回这一步。',
  };
  const old = bodyBoxes(level, before), next = bodyBoxes(level, candidate);
  const avatarBefore = avatarBox(before.player.pos), avatarAfter = avatarBox(candidate.player.pos);
  for (let i = 0; i < old.length; i++) {
    if (sweptOverlap(avatarBefore, avatarAfter, old[i].rect, next[i].rect)) return {
      type: 'contact', body: old[i].id, message: entity(level, old[i].id).name + '碰到了你。可以撤回这一步。',
    };
  }
  return null;
}

export function tryMove(level, state, id, direction) {
  if (!entity(level, id) || ![-1, 1].includes(direction)) throw new Error('无效的刻轨运动');
  const members = groupOf(state, id), candidate = copy(state), positions = worldPositions(level, state);
  for (const member of members) candidate.q[member] += direction;
  const block = mechanicalBlock(level, state, candidate, members);
  if (block) return { state: { ...copy(state), blocked: block, message: block.message }, moved: false };
  const nextPositions = worldPositions(level, candidate);
  if (state.held) {
    const oldGrip = gripPosition(level, state, state.held), newGrip = gripPosition(level, candidate, state.held);
    candidate.player.pos = state.player.pos.map((value, axis) => value + newGrip[axis] - oldGrip[axis]);
  } else if (state.player.carrier) {
    const carrier = state.player.carrier;
    candidate.player.pos = state.player.pos.map((value, axis) => value + nextPositions[carrier][axis] - positions[carrier][axis]);
  }
  const floor = floorAt(level, candidate, candidate.player.pos);
  candidate.player.carrier = floor?.carry ? floor.owner : null;
  candidate.blocked = null;
  candidate.lastMoved = level.objects.filter(object => positions[object.id].some((value, axis) => Math.abs(value - nextPositions[object.id][axis]) > EPS)).map(object => object.id);
  candidate.message = members.map(member => entity(level, member).name).join('、') + '沿各自刻轨' + (direction > 0 ? '前进' : '后退') + '一格。';
  const danger = dangerAlong(level, state, candidate);
  if (danger) { candidate.status = 'failed'; candidate.blocked = danger; candidate.message = danger.message; }
  return { state: candidate, moved: true };
}

export function settle(level, state) {
  let current = copy(state);
  if (current.editing || current.status === 'failed') return current;
  const visited = new Set();
  for (let pass = 0; pass < 128; pass++) {
    let moved = false;
    for (const object of level.objects.filter(item => item.spring)) {
      if (object.spring < 0 && current.q[object.id] <= object.min + EPS || object.spring > 0 && current.q[object.id] >= object.max - EPS) continue;
      const members = groupOf(current, object.id);
      if (current.held && members.includes(current.held)) continue;
      const signature = JSON.stringify([current.q, members]);
      if (visited.has(signature)) continue;
      visited.add(signature);
      const result = tryMove(level, current, object.id, object.spring);
      if (result.moved) { current = result.state; moved = true; }
      else if (!current.blocked) {
        current.blocked = result.state.blocked;
        current.message = current.lastMoved.length ? current.message + ' ' + result.state.message : result.state.message;
      }
      if (current.status === 'failed') return current;
    }
    if (!moved) return current;
  }
  throw new Error('回位未能稳定');
}

export function canWalk(level, state, destination) {
  if (!floorAt(level, state, destination)) return false;
  const avatar = avatarBox(destination);
  for (const body of bodyBoxes(level, state)) if (sweptOverlap(avatar, avatar, body.rect, body.rect)) return false;
  for (const obstacle of level.obstacles ?? []) {
    const box = worldRect([0, 0], obstacle);
    if (sweptOverlap(avatar, avatar, box, box)) return false;
  }
  return true;
}

export function canStep(level, state, from, destination) {
  if (Math.abs(from[0] - destination[0]) + Math.abs(from[1] - destination[1]) !== 1 || !canWalk(level, state, destination)) return false;
  const before = avatarBox(from), after = avatarBox(destination);
  for (const body of bodyBoxes(level, state)) if (sweptOverlap(before, after, body.rect, body.rect)) return false;
  for (const obstacle of level.obstacles ?? []) {
    const box = worldRect([0, 0], obstacle);
    if (sweptOverlap(before, after, box, box)) return false;
  }
  return true;
}

export function routeTo(level, state, destination) {
  const start = state.player.pos.join(','), goal = destination.join(',');
  if (!canWalk(level, state, destination)) return null;
  const pending = [state.player.pos], previous = new Map([[start, null]]);
  for (let at = 0; at < pending.length && pending.length < 1200; at++) {
    const here = pending[at];
    if (here.join(',') === goal) {
      const route = []; let key = goal;
      while (previous.get(key) != null) { route.unshift(key.split(',').map(Number)); key = previous.get(key); }
      return route;
    }
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const next = [here[0] + dx, here[1] + dy], key = next.join(',');
      if (!previous.has(key) && canStep(level, state, here, next)) { previous.set(key, here.join(',')); pending.push(next); }
    }
  }
  return null;
}

export function isComplete(level, state) {
  if (!level.goal || state.status === 'failed' || state.editing || state.held) return false;
  if (!contains(level.goal.exit, state.player.pos)) return false;
  for (const target of level.goal.positions ?? []) if (Math.abs(state.q[target.id] - target.at) > EPS) return false;
  const world = worldPositions(level, state);
  for (const target of level.goal.receivers ?? []) if (world[target.id].some((value, axis) => Math.abs(value - target.at[axis]) > EPS)) return false;
  for (const object of level.objects.filter(item => item.spring)) if (tryMove(level, state, object.id, object.spring).moved) return false;
  return true;
}

export function createState(level) {
  const state = {
    q: Object.fromEntries(level.objects.map(object => [object.id, object.initial ?? object.min])),
    links: [], player: { pos: [...level.start], carrier: null }, held: null,
    editing: false, status: 'ready', blocked: null, lastMoved: [], message: '走近推拉处，或进入映射连接两个纹章。',
  };
  for (const object of level.objects) {
    if (object.min > object.max || state.q[object.id] < object.min || state.q[object.id] > object.max || Math.hypot(...object.axis) !== 1) throw new Error('刻轨数据无效');
  }
  worldPositions(level, state);
  const floor = floorAt(level, state, state.player.pos);
  if (!floor || !canWalk(level, state, state.player.pos)) throw new Error('玩家起点不可站立');
  state.player.carrier = floor.carry ? floor.owner : null;
  return state;
}

export function createSession(level) { return { state: createState(level), history: [], events: [] }; }

export function act(level, session, command) {
  if (session.state.status === 'failed') return session;
  let next = copy(session.state), accepted = true;
  next.blocked = null; next.lastMoved = []; next.status = 'ready';
  const id = command.id, object = entity(level, id);
  if (command.type === 'edit') {
    next.editing = !next.editing;
    next.message = next.editing ? '点两个纹章连接；点已有连线解除。' : '映射结束，回位装置先稳定下来。';
  } else if (command.type === 'link') {
    if (!next.editing || !entity(level, command.a) || !entity(level, command.b)) accepted = false;
    else if (linked(next, command.a, command.b)) next.message = '这条映射已经存在。';
    else {
      next.links.push([command.a, command.b].sort());
      next.message = command.a === command.b ? '自己与自己相连，运动仍然只有一次。' : '已连接' + entity(level, command.a).name + '与' + entity(level, command.b).name + '。';
    }
  } else if (command.type === 'unlink') {
    if (!next.editing) accepted = false;
    else { next.links = next.links.filter(edge => edgeKey(...edge) !== edgeKey(command.a, command.b)); next.message = '映射已解除，位置保留。'; }
  } else if (command.type === 'grab') {
    if (next.editing || !object?.grip) accepted = false;
    else {
      next.held = null; next = settle(level, next);
      if (next.status !== 'failed' && canGrab(level, next, id)) { next.held = id; next.message = '抓住了' + object.name + '。'; }
      else { next.message = next.status === 'failed' ? next.message : '先走到' + object.name + '的推拉处。'; }
    }
  } else if (command.type === 'release') {
    next.held = null; next.message = '已经松手。';
  } else if (command.type === 'push') {
    if (next.editing || !next.held) accepted = false;
    else next = tryMove(level, next, next.held, command.direction).state;
  } else if (command.type === 'walk') {
    if (next.editing || next.held) accepted = false;
    else {
      next = settle(level, next);
      const destination = next.player.pos.map((value, axis) => value + command.delta[axis]);
      if (next.status !== 'failed' && canStep(level, next, next.player.pos, destination)) {
        next.player.pos = destination;
        const floor = floorAt(level, next, destination); next.player.carrier = floor.carry ? floor.owner : null;
        next.message = '走到了新的落脚处。';
      } else if (next.status !== 'failed') next.message = '这边目前走不通。';
    }
  } else throw new Error('未知操作');
  if (!accepted) return { ...session, state: { ...copy(session.state), message: session.state.editing ? '映射编辑时先调整关系，结束后再移动。' : '先抓住够得着的推拉处。' } };
  if (!next.editing) next = settle(level, next);
  if (isComplete(level, next)) { next.status = 'success'; next.message = '通道恢复了，学院记下了你的发现。'; }
  return {
    state: next,
    history: [...session.history, { state: copy(session.state), eventCount: session.events.length }],
    events: [...session.events, { command: copy(command), message: next.message, q: copy(next.q), player: [...next.player.pos], status: next.status }],
  };
}

export function undoSession(session) {
  if (!session.history.length) return session;
  const frame = session.history.at(-1);
  return { state: copy(frame.state), history: session.history.slice(0, -1), events: session.events.slice(0, frame.eventCount) };
}

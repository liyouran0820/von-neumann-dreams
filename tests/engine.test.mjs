import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../web/engine.js';
import { LEVELS } from '../web/levels.js';
import { harness, solveReference } from './helpers/walkthroughs.mjs';

const level = id => LEVELS.find(current => current.id === id);
const physical = state => ({ q: state.q, links: state.links, player: state.player, held: state.held, editing: state.editing, status: state.status });
for (const room of LEVELS) {
  test(room.name + '：可站立起点与合法承载树', () => {
    const state = G.createState(room);
    assert.ok(G.canWalk(room, state, state.player.pos));
    assert.equal(Object.keys(G.worldPositions(room, state)).length, room.objects.length);
  });
  if (!room.lab) test(room.name + '：原稿参考解包含真实行走并到达出口', () => {
    const result = solveReference(room);
    assert.equal(result.state.status, 'success');
    assert.equal(result.state.held, null);
    assert.ok(G.isComplete(room, result.state));
    assert.ok(result.events.some(event => event.command.type === 'walk'));
    assert.notEqual(G.createState(room).status, 'success');
  });
}

test('连接不跳位置，推拉保持连接时建立的刻度差', () => {
  const room = level('long-door'), h = harness(room);
  h.session.state.q.D = 2;
  h.grab('H'); h.edit(() => h.link('H', 'D'));
  assert.deepEqual(h.session.state.q, { H: 0, D: 2 });
  h.push(1);
  assert.deepEqual(h.session.state.q, { H: 1, D: 3 });
});

test('短行程累积完全来自断接与位置保留', () => {
  const room = level('long-door'), h = harness(room);
  h.grab('H');
  for (const expected of [2, 4, 6]) {
    h.edit(() => h.link('H', 'D')); h.push(2);
    assert.equal(h.session.state.q.D, expected);
    if (expected < 6) { h.edit(() => h.unlink('H', 'D')); h.push(2, -1); assert.equal(h.session.state.q.D, expected); }
  }
});

test('一横一竖的等长变化，双向驱动均沿自己的箭头', () => {
  const room = level('lab-tracks'), h = harness(room);
  h.grab('A'); h.edit(() => h.link('A', 'B')); h.push(2);
  assert.deepEqual(h.session.state.q, { A: 2, B: 2 });
  const world = G.worldPositions(room, h.session.state);
  assert.deepEqual(world.A, [5, 3]); assert.deepEqual(world.B, [9, 4]);
  h.release(); h.grab('B'); h.push(1, -1);
  assert.deepEqual(h.session.state.q, { A: 1, B: 1 });
});

test('长短刻轨共享长度，不按轨道百分比缩放', () => {
  const room = level('long-door'), h = harness(room);
  h.grab('H'); h.edit(() => h.link('H', 'D')); h.push(2);
  assert.equal(h.session.state.q.H, 2); assert.equal(h.session.state.q.D, 2);
});

test('远处轨道尽头阻止整组，失败不积欠位移', () => {
  const room = level('borrow-stop'), h = harness(room);
  h.grab('H'); h.edit(() => { h.link('H', 'G'); h.link('G', 'B'); });
  h.push(1); const before = structuredClone(h.session.state.q); h.push(1);
  assert.deepEqual(h.session.state.q, before);
  assert.equal(h.session.state.blocked.body, 'B');
  h.edit(() => h.unlink('G', 'B')); h.push(1);
  assert.equal(h.session.state.q.G, 2);
});

test('重复线、自连和闭环不会倍增位移', () => {
  const room = level('borrow-stop'), h = harness(room);
  h.grab('H'); h.edit(() => { h.link('H', 'H'); h.link('H', 'G'); h.link('G', 'B'); h.link('B', 'H'); h.link('H', 'G'); });
  assert.equal(h.session.state.links.length, 4);
  h.push(1);
  assert.deepEqual(h.session.state.q, { H: 1, G: 1, B: 1 });
});

test('普通把手不会自锁，松手后回位带动相连把手', () => {
  const room = level('borrow-stop'), h = harness(room);
  h.grab('H'); h.edit(() => h.link('H', 'G')); h.push(3); h.release();
  assert.equal(h.session.state.q.H, 0); assert.equal(h.session.state.q.G, 0);
});

test('编辑暂停保留持握，退出后已与手断开的桥立即回位', () => {
  const room = level('borrow-stop'), h = harness(room);
  h.grab('H'); h.edit(() => h.link('H', 'G')); h.push(3);
  h.command({ type: 'edit' }); h.unlink('H', 'G');
  assert.equal(h.session.state.q.G, 3);
  h.command({ type: 'edit' });
  assert.equal(h.session.state.held, 'H');
  assert.equal(h.session.state.q.G, 0);
});

test('连接至正确端点固定桥，保留把手冗余连接也是合法解', () => {
  assert.equal(solveReference(level('borrow-stop'), true).state.status, 'success');
});

test('错误端点只能固定在错误位置，不能被当作完全接合', () => {
  const room = level('borrow-stop'), h = harness(room);
  h.grab('H'); h.edit(() => { h.link('H', 'B'); }); h.push(1);
  h.edit(() => h.unlink('H', 'B')); h.push(1, -1);
  h.edit(() => h.link('H', 'G')); h.push(3);
  assert.equal(h.session.state.q.G, 3);
  h.edit(() => { h.link('G', 'B'); h.unlink('H', 'G'); }); h.release();
  assert.equal(h.session.state.q.G, 2); assert.equal(h.session.state.q.B, 0);
  assert.equal(G.isComplete(room, h.session.state), false);
});

test('承载树与映射图独立，合法父子映射不会被拒绝', () => {
  const room = level('still-orbit'), h = harness(room);
  h.grab('C'); h.edit(() => h.link('C', 'S')); h.push(1);
  assert.deepEqual(h.session.state.q, { C: 1, S: 1 });
  assert.deepEqual(G.worldPositions(room, h.session.state).S, [7, 4]);
});

test('单推房间与天球均撞导环，检查未映射的后代', () => {
  const room = level('still-orbit');
  for (const id of ['C', 'S']) {
    const state = G.createState(room), result = G.tryMove(room, state, id, 1);
    assert.equal(result.moved, false); assert.deepEqual(result.state.q, state.q);
    assert.equal(result.state.blocked.type, 'guide'); assert.equal(result.state.blocked.body, 'S');
  }
});

test('共同抵消在整条线性路径成立，而非先撞墙再纠正', () => {
  const room = level('still-orbit'), h = harness(room);
  h.grab('C'); h.edit(() => h.link('C', 'S'));
  for (let step = 0; step < 3; step++) {
    const before = h.session.state; h.push(1); const after = h.session.state;
    for (const t of [0, .1, .5, .9, 1]) {
      const midpoint = { ...after, q: Object.fromEntries(Object.keys(after.q).map(id => [id, before.q[id] + t * (after.q[id] - before.q[id])])) };
      assert.deepEqual(G.worldPositions(room, midpoint).S, [7, 4]);
    }
  }
});

test('从天球端驱动观测室，同样可行且能实际离开房间', () => {
  assert.equal(solveReference(level('still-orbit'), true).state.status, 'success');
});

test('移动承载物时，固定滑座的本地刻度和外部桥都不改变', () => {
  const room = level('carry-fixed'), h = harness(room);
  h.grab('G'); h.push(2); h.edit(() => h.link('G', 'S')); h.release(); h.grab('C');
  for (let i = 1; i <= 4; i++) {
    h.push(1);
    assert.equal(h.session.state.q.S, 0); assert.equal(h.session.state.q.G, 2);
    assert.deepEqual(G.worldPositions(room, h.session.state).S, [5 + i, 4]);
  }
});

test('把桥映射到车厢可以制动，却会阻止后续运输', () => {
  const room = level('carry-fixed'), h = harness(room);
  h.grab('G'); h.push(2); h.edit(() => h.link('G', 'C')); h.release(); h.grab('C'); h.push(1);
  assert.equal(h.session.state.q.C, 0); assert.equal(h.session.state.blocked.body, 'G');
});

test('换手必须释放旧持握，不能一人远距离扶桥并推车', () => {
  const room = level('carry-fixed'), h = harness(room);
  h.grab('G'); h.push(2);
  const result = G.act(room, h.session, { type: 'grab', id: 'C' });
  assert.equal(result.state.q.G, 0);
  assert.ok(result.state.held === 'C' || result.state.held === null);
  assert.notEqual(result.state.held, 'G');
});

test('桥抽走支撑导致危险，不能因房间会掉落而锁住桥', () => {
  const room = level('carry-fixed'), h = harness(room);
  h.grab('G'); h.push(2); h.edit(() => h.link('G', 'S')); h.release(); h.grab('C'); h.push(2); h.release();
  h.command({ type: 'edit' }); h.unlink('G', 'S');
  const result = G.act(room, h.session, { type: 'edit' });
  assert.equal(result.state.status, 'failed'); assert.equal(result.state.q.G, 1);
  assert.equal(result.state.q.C, 2); assert.equal(result.state.blocked.type, 'support');
  const undone = G.undoSession(result);
  assert.equal(undone.state.editing, true); assert.equal(undone.state.q.G, 2);
});

test('桥尚未完全展开时不能抢一格运输，包括共同运动中间态', () => {
  const room = level('carry-fixed'), state = G.createState(room);
  state.q.G = 1; state.links = [['C', 'G']];
  const result = G.tryMove(room, state, 'C', 1);
  assert.equal(result.state.q.C, 1); assert.equal(result.state.q.G, 2);
  assert.equal(result.state.status, 'failed'); assert.equal(result.state.blocked.type, 'support');
});

test('终局三次推进与把手回程保留两个独立关系组', () => {
  const result = solveReference(level('academy'));
  const resets = result.events.filter(event => event.command.type === 'push' && event.command.direction === -1);
  assert.ok(resets.some(event => event.q.C === 2 && event.q.S === 2 && event.q.G === 2 && event.q.B === 0));
  assert.ok(resets.some(event => event.q.C === 4 && event.q.S === 4 && event.q.G === 2 && event.q.B === 0));
  assert.deepEqual(result.state.q, { H: 2, C: 6, S: 6, B: 0, G: 2 });
});

test('终局替代链形、冗余映射和一格推进全部接受', () => {
  const result = solveReference(level('academy'), true, 1);
  assert.equal(result.state.status, 'success');
  assert.equal(result.state.q.C, 6); assert.equal(result.state.q.S, 6);
});

test('终局全连接仍受桥的正向端点阻挡，不增加力量', () => {
  const room = level('academy'), h = harness(room);
  h.grab('H'); h.edit(() => h.link('H', 'G')); h.push(2);
  h.edit(() => { h.link('G', 'B'); h.link('H', 'C'); h.link('C', 'S'); });
  const before = structuredClone(h.session.state.q); h.push(1);
  assert.deepEqual(h.session.state.q, before); assert.equal(h.session.state.blocked.body, 'G');
});

test('编辑期间不能移动，结束编辑先稳定回位再继续走', () => {
  const room = level('borrow-stop'), h = harness(room);
  h.grab('H'); h.edit(() => h.link('H', 'G')); h.push(3); h.command({ type: 'edit' });
  const before = structuredClone(h.session.state.q); h.command({ type: 'push', direction: 1 });
  assert.deepEqual(h.session.state.q, before);
  h.unlink('H', 'G'); h.command({ type: 'release' }); assert.equal(h.session.state.q.G, 3);
  h.command({ type: 'edit' }); assert.equal(h.session.state.q.G, 0);
});

test('身体不会充当回位装置的刹车，被机械碰到进入可撤销危险', () => {
  const room = structuredClone(level('lab-tracks'));
  room.objects[0].spring = -1;
  const state = G.createState(room); state.q.A = 2; state.player.pos = [4, 3];
  const result = G.settle(room, state);
  assert.equal(result.q.A, 1); assert.equal(result.status, 'failed');
});

test('行走不能穿过薄障碍，寻路使用同样的路径碰撞', () => {
  const room = structuredClone(level('lab-tracks'));
  room.obstacles = [{ x: 5.99, y: 5, w: .1, h: 1, name: '薄壁' }];
  const state = G.createState(room); state.player.pos = [5, 5];
  assert.ok(G.canWalk(room, state, [6, 5]));
  assert.equal(G.canStep(room, state, [5, 5], [6, 5]), false);
});

test('撤销完整恢复连线、持握、编辑状态和回位结果', () => {
  const room = level('borrow-stop'), h = harness(room);
  h.grab('H'); h.edit(() => h.link('H', 'G')); h.push(3);
  const before = structuredClone(h.session);
  h.release(); const undone = G.undoSession(h.session);
  assert.deepEqual(physical(undone.state), physical(before.state));
  assert.deepEqual(undone.events, before.events);
});

test('只有到达实际出口且无人持握才成功，保持按住不算修复', () => {
  const room = level('borrow-stop'), state = G.createState(room);
  state.q.G = 3; state.q.H = 3; state.player.pos = [12, 4]; state.links = [['H', 'G']]; state.held = 'H';
  assert.equal(G.isComplete(room, state), false);
  state.held = null; assert.equal(G.isComplete(room, state), false);
  state.links.push(['G', 'B']); assert.equal(G.isComplete(room, state), true);
});

test('承载树自身成环才被拒绝，运行不污染房间原始数据', () => {
  const room = level('academy'), before = structuredClone(room);
  solveReference(room); assert.deepEqual(room, before);
  const invalid = structuredClone(room); invalid.objects.find(object => object.id === 'C').parent = 'S';
  assert.throws(() => G.createState(invalid), /承载关系/);
});

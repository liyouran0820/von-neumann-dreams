import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../web/engine.js';
import { LEVELS } from '../web/levels.js';

for (const [i, level] of LEVELS.entries()) {
  test(level.name + '：实际执行抵达出口', () => {
    const result = G.runProgram(level, level.solution);
    assert.equal(result.state.status, 'success');
    assert.equal(result.state.cell, level.goal);
    assert.equal(result.state.steps, [8, 16, 28][i]);
  });
  test(level.name + '：一直前进会在边界停止', () => {
    const result = G.runProgram(level, level.initialProgram);
    assert.equal(result.state.status, 'blocked');
    assert.match(result.state.reason, /地面/);
    assert.notEqual(result.state.cell, level.goal);
  });
  test(level.name + '：枚举程序的每一步保持符号数量与地面范围', () => {
    for (const a of G.CODES) for (const b of G.CODES) for (const c of G.CODES) {
      let session = G.createSession(level, [a, b, c]);
      const counts = G.symbolCounts(session.state), keys = Object.keys(session.state.floor).sort();
      while (session.state.status === 'ready') {
        session = G.stepSession(level, session);
        assert.deepEqual(G.symbolCounts(session.state), counts);
        assert.deepEqual(Object.keys(session.state.floor).sort(), keys);
        assert.ok(Object.hasOwn(session.state.floor, session.state.cell));
      }
    }
  });
}

test('第三槽交换第一槽，取用地面右转并留下前进', () => {
  const level = LEVELS[0];
  let session = G.createSession(level, ['F', 'F', 'S']);
  for (let i = 0; i < 3; i++) session = G.stepSession(level, session);
  assert.deepEqual(session.state.program, ['T', 'F', 'S']);
  assert.equal(session.state.floor['2,0'], 'F');
  assert.equal(session.state.cell, '2,0');
  assert.equal(session.state.pc, 0);
  const next = G.stepSession(level, session);
  assert.equal(next.events.at(-1).action, 'T');
  assert.equal(next.state.facing, 2);
});

test('换入的交换真的在下一拍执行', () => {
  const level = LEVELS[1];
  const session = G.runProgram(level, level.solution);
  const incoming = session.events.findIndex(event => event.swap?.incoming === 'S');
  assert.ok(incoming >= 0);
  assert.equal(session.events[incoming + 1].action, 'S');
  assert.equal(session.events[incoming + 1].slot, session.events[incoming].swap.slot);
  assert.equal(session.events[incoming + 1].kind, 'swap');
});

test('第三关必须物理返回，才能取回之前留下的交换符文', () => {
  const session = G.runProgram(LEVELS[2], LEVELS[2].solution);
  const deposited = {};
  let recovered = false;
  for (const event of session.events) {
    if (event.kind === 'move') for (const [cell, record] of Object.entries(deposited)) if (cell !== event.to) record.left = true;
    if (event.swap) {
      const swap = event.swap, old = deposited[swap.cell];
      if (old?.left && old.code === swap.incoming && swap.incoming === 'S' && swap.incoming !== swap.outgoing) recovered = true;
      deposited[swap.cell] = { code: swap.outgoing, left: false };
    }
  }
  assert.ok(recovered);
});

test('前一关程序不能原样完成后一关', () => {
  assert.equal(G.runProgram(LEVELS[1], LEVELS[0].solution).state.status, 'blocked');
  assert.equal(G.runProgram(LEVELS[2], LEVELS[0].solution).state.status, 'blocked');
  assert.equal(G.runProgram(LEVELS[2], LEVELS[1].solution).state.status, 'blocked');
});

test('初始程序中没有右转，也可取得右转并完成', () => {
  const level = LEVELS[0], program = ['F', 'F', 'S'];
  assert.ok(!program.includes('T'));
  const result = G.runProgram(level, program);
  assert.equal(result.state.status, 'success');
  assert.ok(result.events.some(event => event.action === 'T'));
});

test('第一关接受参考程序以外的完整合法解', () => {
  const result = G.runProgram(LEVELS[0], LEVELS[0].alternative);
  assert.equal(result.state.status, 'success');
  assert.equal(result.state.steps, 9);
});

test('相同符文交换仍推进执行槽位，不能提前判为循环', () => {
  let session = G.createSession(LEVELS[0], ['S', 'F', 'F']);
  session = G.stepSession(LEVELS[0], session);
  assert.equal(session.state.status, 'ready');
  assert.equal(session.state.pc, 1);
  assert.equal(session.state.cell, '0,0');
  assert.deepEqual(session.state.program, ['S', 'F', 'F']);
});

test('完整状态循环包含朝向与执行槽位，右转循环在12拍停止', () => {
  const result = G.runProgram(LEVELS[0], ['T', 'T', 'T']);
  assert.equal(result.state.status, 'blocked');
  assert.match(result.state.reason, /重复/);
  assert.equal(result.state.steps, 12);
});

test('循环指纹区分地面、程序与下一执行槽位', () => {
  const state = G.createState(LEVELS[0]);
  assert.notEqual(G.fingerprint(state), G.fingerprint({ ...state, pc: 1 }));
  assert.notEqual(G.fingerprint(state), G.fingerprint({ ...state, program: ['S', 'F', 'F'] }));
  assert.notEqual(G.fingerprint(state), G.fingerprint({ ...state, floor: { ...state.floor, '1,0': 'S' } }));
});

test('撤回交换恢复全部程序、地面与执行槽位，再做得到同一结果', () => {
  let session = G.createSession(LEVELS[0], ['F', 'F', 'S']);
  session = G.stepSession(LEVELS[0], G.stepSession(LEVELS[0], session));
  const before = G.cloneState(session.state);
  const after = G.stepSession(LEVELS[0], session);
  const undone = G.undoSession(after);
  assert.deepEqual(undone.state, before);
  assert.deepEqual(G.stepSession(LEVELS[0], undone).state, after.state);
  assert.equal(undone.events.length, 2);
});

test('撤回边界失败可恢复可继续执行的状态', () => {
  const result = G.runProgram(LEVELS[0], ['F', 'F', 'F']);
  const undone = G.undoSession(result);
  assert.equal(undone.state.status, 'ready');
  assert.equal(undone.state.cell, '2,0');
  assert.equal(undone.state.pc, 2);
});

test('碰壁不改变位置、程序、地面、朝向或执行槽位', () => {
  const level = LEVELS[0];
  const before = { ...G.createState(level), cell: '2,0' };
  const result = G.stepProgram(level, before);
  assert.equal(G.fingerprint(result.state), G.fingerprint(before));
  assert.equal(result.state.steps, before.steps);
});

test('运行预算停止，抵达出口后不再执行', () => {
  const limited = G.runProgram(LEVELS[0], ['T', 'T', 'T'], 4);
  assert.equal(limited.state.steps, 4);
  assert.match(limited.state.reason, /4 步/);
  const completed = G.runProgram(LEVELS[0], LEVELS[0].solution);
  assert.equal(G.stepSession(LEVELS[0], completed), completed);
});

test('每轮起点使用独立地面，运行不污染关卡与起始程序', () => {
  const level = LEVELS[0], original = structuredClone(level);
  const program = [...level.solution], originalProgram = [...program];
  G.runProgram(level, program);
  assert.deepEqual(level, original);
  assert.deepEqual(program, originalProgram);
  const a = G.createState(level), b = G.createState(level);
  a.floor['0,0'] = 'S';
  assert.equal(b.floor['0,0'], 'F');
});

test('非法程序在运行前拒绝', () => {
  assert.throws(() => G.createState(LEVELS[0], ['F']), /程序/);
  assert.throws(() => G.createState(LEVELS[0], ['F', 'T', '未知']), /程序/);
});

test('逐拍运行与连续运行结果相同', () => {
  const level = LEVELS[2];
  let session = G.createSession(level, level.solution);
  while (session.state.status === 'ready') session = G.stepSession(level, session);
  assert.equal(G.fingerprint(session.state), G.fingerprint(G.runProgram(level, level.solution).state));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, stepProgram, signalsFor, runProgram, fingerprint } from '../web/engine.js';
import { LEVELS } from '../web/levels.js';

for (const level of LEVELS) {
  test(`${level.name}：参考协议通过正常执行器完成`, () => {
    const result = runProgram(level, level.solution);
    assert.equal(result.state.status, 'success');
    assert.equal(result.state.node, level.goal);
    assert.ok(result.state.steps > 3);
  });
  test(`${level.name}：初始协议保留可观察的失败`, () => {
    const result = runProgram(level, level.initialProgram);
    assert.equal(result.state.status, 'blocked');
    assert.notEqual(result.state.node, level.goal);
  });
}

test('第一匹配优先级：先前进会错过取样', () => {
  const level = LEVELS[0];
  const result = stepProgram(level, createState(level), level.initialProgram);
  assert.equal(result.state.node, 'landing');
  assert.equal(result.state.memory, 0);
  assert.equal(result.event.ruleIndex, 0);
  assert.equal(signalsFor(level, result.state).pad, 0);
  assert.equal(signalsFor(level, result.state).bridge, 0);
});

test('快照在离开来源后保留，重试恢复初值', () => {
  const level = LEVELS[0];
  const result = runProgram(level, level.solution);
  const signals = signalsFor(level, result.state);
  assert.equal(signals.pad, 0);
  assert.equal(signals.memory, 1);
  assert.equal(signals.bridge, 1);
  assert.equal(createState(level).memory, 0);
  assert.equal(createState(level).bindings.bridge, 'pad');
});

test('共享符印覆盖：星桥关闭，月门开启', () => {
  const level = LEVELS[2];
  const state = { ...createState(level), node: 'checkpoint', memory: 1, bindings: { bridge: 'memory', moon: 'memory' } };
  assert.equal(signalsFor(level, state).bridge, 1);
  assert.equal(signalsFor(level, state).moon, 0);
  const result = stepProgram(level, state, [{ condition: 'overwrite', action: 'sample:pad' }]);
  assert.equal(result.state.memory, 0);
  assert.equal(signalsFor(level, result.state).bridge, 0);
  assert.equal(signalsFor(level, result.state).moon, 1);
  assert.ok(result.event.changes.some(c => c.id === 'bridge'));
  assert.ok(result.event.changes.some(c => c.id === 'moon'));
});

test('第三关认可两种有意义的解法', () => {
  const level = LEVELS[2];
  const a = runProgram(level, level.solution).state;
  const b = runProgram(level, level.alternative).state;
  assert.equal(a.status, 'success');
  assert.equal(b.status, 'success');
  assert.equal(a.memory, 0);
  assert.equal(b.memory, 1);
  assert.equal(a.bindings.moon, 'memory');
  assert.equal(b.bindings.moon, 'pad');
});

test('第二关：错误来源使纸灵停在月门前', () => {
  const level = LEVELS[1];
  const rules = level.solution.map(r => ({ ...r }));
  rules[2] = { condition: 'moon-not-memory', action: 'link:moon:memory', enabled: true };
  const result = runProgram(level, rules);
  assert.equal(result.state.status, 'blocked');
  assert.equal(result.state.node, 'court');
  assert.equal(signalsFor(level, result.state).moon, 0);
  assert.doesNotMatch(result.state.reason, /循环/);
});

test('第二关认可参考协议以外的解法：取样关闭的月门会开门', () => {
  const level = LEVELS[1];
  const rules = level.initialProgram.map(r => ({ ...r }));
  rules[2].action = 'sample:moon';
  const result = runProgram(level, rules);
  assert.equal(result.state.status, 'success');
  assert.equal(result.state.memory, 0);
  assert.equal(result.state.bindings.moon, 'memory');
  assert.equal(signalsFor(level, result.state).moon, 1);
  assert.equal(signalsFor(level, result.state).bridge, 0);
});

test('循环连接拒绝执行，原世界不变', () => {
  const level = LEVELS[1];
  const first = stepProgram(level, createState(level), [{ condition: 'always', action: 'link:bridge:moon' }]);
  const oldBindings = { ...first.state.bindings };
  const next = stepProgram(level, first.state, [{ condition: 'always', action: 'link:moon:bridge' }]);
  assert.equal(next.state.status, 'blocked');
  assert.match(next.state.reason, /循环/);
  assert.deepEqual(next.state.bindings, oldBindings);
  assert.equal(next.state.steps, first.state.steps);
});

test('关闭的道路不可穿越', () => {
  const level = LEVELS[0];
  const state = { ...createState(level), node: 'landing' };
  const result = stepProgram(level, state, [{ condition: 'always', action: 'move' }]);
  assert.equal(result.state.status, 'blocked');
  assert.equal(result.state.node, 'landing');
  assert.equal(result.state.steps, 0);
});

test('无效果的重复操作通过完整状态检测停止', () => {
  const result = runProgram(LEVELS[0], [{ condition: 'always', action: 'sample:pad' }]);
  assert.equal(result.state.status, 'blocked');
  assert.match(result.state.reason, /循环/);
});

test('暂停再单步与连续执行得到同一结果', () => {
  const level = LEVELS[1];
  let state = createState(level);
  for (let i = 0; i < 40 && state.status !== 'success'; i++) state = stepProgram(level, state, level.solution).state;
  assert.equal(fingerprint(state), fingerprint(runProgram(level, level.solution).state));
});

// Design-only grid replay, manually transcribed from 关卡设计v2.0.md.
// Reuses the current reflection/circuit functions, but does not run the game.
// Tall screens are obstacles on a separate optical plane. No continuous physics.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { traceLight, evaluateCircuit } from '../../web/science.js';

const hash = data => createHash('sha256').update(data).digest('hex');
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const signal = id => ({ signal: id });
const gate = (op, ...args) => ({ op, args });
const checks = [];
function check(name, run) {
  checks.push({ name, status: 'PASS', details: run() });
}

function beam(E, M, S, orientation, blockers = [], absorbers = []) {
  const grid = Array.from({ length: 9 }, () => Array(13).fill('.'));
  for (const [x, y] of [...blockers, ...absorbers]) grid[y][x] = '#';
  const optics = traceLight(grid.map(row => row.join('')),
    [{ id: 'E', cell: E, direction: [1, 0] }],
    [{ id: 'M', cell: M, orientation }], [{ id: 'S', cell: S }]);
  return { L: optics.hits.includes('S'), optics };
}
const nightLight = (level, g) => level === 6
  ? beam([2, 0], [5, 0], [5, 2], '\\', g === null ? [] : [[g, 1]])
  : beam([0, 0], [6, 0], [6, 2], '\\', g === null ? [] : [[g, 1]]);
const whiteLight = r => beam([0, 0], [3, 0], [3, 2], '\\', [[r, 1]]);

function shadowModel(level) {
  const s = { r: level === 6 ? 4 : 5, g: null, body: level === 6 ? [3, 1] : [4, 1] };
  const rangeN = level === 6 ? [4, 6] : [1, 8];
  const rangeW = level === 6 ? [4, 6] : [1, 5];
  const floor = (x, y) => level === 6
    ? (y === 1 && x >= 3 && x <= 7) || (x === 3 && y === 2) || (y === 3 && x >= 3 && x <= 8)
    : (x >= 0 && x <= 9 && y >= 0 && y <= 2) || (x === 5 && y === 3) || (y === 4 && x >= 5 && x <= 8);
  const supported = ([x, y]) => floor(x, y) &&
    !((x === 6 || x === 7) && y === (level === 6 ? 3 : 4) && nightLight(level, s.g).L);
  function push(d) {
    assert(s.g !== null);
    const gn = s.g + d, rn = s.r + d;
    if (gn >= rangeN[0] && gn <= rangeN[1] && !same(s.body, [gn, 1])) s.g = gn;
    if (rn >= rangeW[0] && rn <= rangeW[1]) s.r = rn;
  }
  function move(dx, dy) {
    const target = [s.body[0] + dx, s.body[1] + dy];
    if (s.g !== null && same(target, [s.g, 1])) {
      assert.equal(dy, 0);
      push(dx);
      assert(!same(target, [s.g, 1]), 'Shadow must move before body enters');
    }
    assert(supported(target), 'Body target must have support');
    s.body = target;
  }
  return { s, push, move, map() { s.g = s.r; }, supported };
}

check('06 固定反射段、光幕遮断及人物参考回放', () => {
  const initial = nightLight(6, null);
  assert(initial.L);
  assert.deepEqual(initial.optics.segments.map(x => [x.from, x.to]),
    [[[2, 0], [5, 0]], [[5, 0], [5, 2]]]);
  assert(nightLight(6, 4).L);
  assert(!nightLight(6, 5).L);
  assert(nightLight(6, 6).L);
  const m = shadowModel(6);
  m.map(); m.move(1, 0);
  assert.equal(m.s.g, 5);
  const snapshot = structuredClone(m.s);
  m.push(-1);
  assert.equal(m.s.g, 5); // Body at4 prevents the night shadow moving left.
  assert.equal(m.s.r, 4);
  m.move(-1, 0); m.move(0, 1); m.move(0, 1);
  for (let i = 0; i < 5; i++) m.move(1, 0);
  assert.deepEqual(m.s.body, [8, 3]);
  m.s.g = null;
  assert(nightLight(6, m.s.g).L);
  assert(!m.supported([6, 3]));
  return { reflected_path: initial.optics.segments, pushed_state: snapshot,
    final: m.s, unmap_effect: 'L=1、Y=0，H失去支撑' };
});

check('07 双侧真实反射、40种轨位及两条参考回放', () => {
  const dark = [];
  for (let r = 1; r <= 5; r++) for (let g = 1; g <= 8; g++) {
    if (!nightLight(7, g).L && !whiteLight(r).L) dark.push([r, g]);
  }
  assert.deepEqual(dark, [[3, 6]]);
  const finals = [];
  for (const route of ['body-stop', 'track-stop']) {
    const m = shadowModel(7); m.map();
    if (route === 'body-stop') { m.move(1, 0); m.push(-1); m.push(-1); }
    else { for (let i = 0; i < 3; i++) m.push(1); m.push(-1); m.push(-1); m.move(1, 0); }
    assert.equal(m.s.r, 3); assert.equal(m.s.g, 6);
    for (let i = 0; i < 3; i++) m.move(0, 1);
    for (let i = 0; i < 3; i++) m.move(1, 0);
    assert.deepEqual(m.s.body, [8, 4]);
    finals.push({ route, state: m.s, LN: nightLight(7, m.s.g).L, LW: whiteLight(m.s.r).L });
  }
  return { enumerated_positions: 40, both_dark_positions_r_g: dark, finals };
});

check('12 两面镜子四种光路与NAND实算', () => {
  const results = [];
  for (const M1 of ['/', '\\']) for (const M2 of ['/', '\\']) {
    const a = beam([1, 1], [2, 1], [2, 4], M1, [], [[2, 0]]).L;
    const b = beam([3, 1], [4, 1], [4, 4], M2, [], [[4, 0]]).L;
    assert.equal(a, M1 === '\\'); assert.equal(b, M2 === '\\');
    const Y = evaluateCircuit(gate('nand', signal('a'), signal('b')), { a, b });
    assert.equal(Y, !(a && b));
    results.push({ M1, M2, a: Number(a), b: Number(b), Y: Number(Y) });
  }
  assert.deepEqual(results.map(s => [s.a, s.b, s.Y]), [[0, 0, 1], [0, 1, 1], [1, 0, 1], [1, 1, 0]]);
  return results;
});

const light13 = M => beam([0, 1], [2, 1], [2, 4], M, [], [[2, 0]]).L;
function circuit13(p, L, b) {
  const a = evaluateCircuit(gate('and', signal('p'), signal('L')), { p, L });
  const C = evaluateCircuit(gate('nand', signal('a'), signal('b')), { a, b });
  const Y = evaluateCircuit(gate('nand', signal('C'), signal('C')), { C });
  return { p, L, a, b, C, Y };
}
function finalModel() {
  const s = { A: [1, 1], K: [3, 1], M: '/', active: null, body: [3, 0], failed: false };
  const signals = () => circuit13(s.A[0] === 2, light13(s.M), same(s.K, [3, 2]) || same(s.body, [3, 2]));
  function supported([x, y]) {
    if ((x >= 1 && x <= 3 && y >= 0 && y <= 5) || (x >= 11 && x <= 12 && y >= 2 && y <= 4) || same([x, y], [6, 3])) return true;
    if (y !== 3) return false;
    if (x === 4 || x === 5) return signals().C;
    if (x === 7 || x === 8) return signals().Y;
    return (x === 9 || x === 10) && s.active === 'B';
  }
  const recalc = () => { s.failed = !supported(s.body); };
  function move(dx, dy) {
    assert(!s.failed);
    const target = [s.body[0] + dx, s.body[1] + dy];
    assert(supported(target), 'Body cannot enter a retracted bridge');
    if (same(target, s.K)) {
      const nextK = [s.K[0] + dx, s.K[1] + dy];
      assert(supported(nextK)); s.K = nextK;
    }
    s.body = target; recalc(); assert(!s.failed);
  }
  function align() { assert.equal(s.active, 'A'); s.A = s.A.map(x => Math.min(3, x + 1)); recalc(); }
  return { s, signals, supported, move, align,
    map(id) { s.active = id; recalc(); }, rotate() { s.M = s.M === '/' ? '\\' : '/'; recalc(); },
    restore(snapshot) { Object.assign(s, structuredClone(snapshot)); recalc(); } };
}
const reachCourtyard = m => {
  m.move(-1, 0); m.move(0, 1); m.move(0, 1); m.move(1, 0);
  for (let i = 0; i < 3; i++) m.move(1, 0);
  assert.deepEqual(m.s.body, [6, 3]);
};

check('13 轨靶/反射受光/压板八种组合及两级输出', () => {
  const results = [];
  for (const p of [false, true]) for (const M of ['/', '\\']) for (const b of [false, true]) {
    const row = circuit13(p, light13(M), b);
    assert.equal(row.Y, row.p && row.L && row.b);
    assert.equal(row.C, !row.Y);
    results.push(Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v)])));
  }
  return results;
});

for (const route of ['先校准，后转镜', '先转镜，后校准']) {
  check('13 完整参考回放：' + route, () => {
    const m = finalModel(); const states = [];
    m.move(0, 1); // Push K from3,1 to P3,2; body at3,1.
    m.map('A');
    if (route === '先校准，后转镜') m.align(); else m.rotate();
    assert(m.signals().C); assert(!m.signals().Y);
    states.push({ stage: '左岸准备', state: structuredClone(m.s), signals: m.signals() });
    reachCourtyard(m);
    if (route === '先校准，后转镜') m.rotate(); else m.align();
    assert(!m.signals().C); assert(m.signals().Y); assert(!m.s.failed);
    states.push({ stage: '中庭补齐条件', state: structuredClone(m.s), signals: m.signals() });
    m.map('B'); assert.equal(m.s.A[0], 2); assert.deepEqual(m.s.K, [3, 2]); assert.equal(m.s.M, '\\');
    for (let i = 0; i < 5; i++) m.move(1, 0);
    assert.deepEqual(m.s.body, [11, 3]);
    states.push({ stage: '换B并抵达出口', state: m.s, signals: m.signals() });
    return states;
  });
}

check('13 提前补齐受阻、桥上转走光失支撑及模型快照恢复', () => {
  const early = finalModel(); early.move(0, 1); early.map('A'); early.align(); early.rotate();
  assert(!early.supported([4, 3])); // Preparing all three conditions prevents reaching courtyard.
  const m = finalModel(); m.move(0, 1); m.map('A'); m.align(); reachCourtyard(m); m.rotate(); m.map('B'); m.move(1, 0);
  const snapshot = structuredClone(m.s);
  m.rotate(); assert(m.s.failed); assert(!m.signals().Y); assert.equal(m.s.active, 'B');
  m.restore(snapshot); assert(!m.s.failed); assert(m.signals().Y); assert.equal(m.s.M, '\\');
  m.s.A[0] = 1; assert(!m.signals().Y); // Light alone cannot maintain rear bridge.
  return { early_front_bridge: 'C=0，不能跨越', rear_rotate_failure: 'EXPECTED_SUPPORT_LOSS',
    model_snapshot_restore: 'PASS', absent_track_target: 'Y=0', note: '不是游戏撤销或灰盒验收' };
});

const document = readFileSync(new URL('../../关卡设计v2.0.md', import.meta.url));
const output = {
  date: '2026-10-14', scope: '手工录入的独立格点模型，复用网页反射/逻辑函数；不驱动游戏、不验证连续体积或十三关全量',
  document_sha256: hash(document), model_sha256: hash(readFileSync(fileURLToPath(import.meta.url))),
  science_sha256: hash(readFileSync(new URL('../../web/science.js', import.meta.url))),
  checks,
};
writeFileSync(new URL('./关卡设计v2.0_mirror_checks.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ groups: checks.length, status: 'PASS', document_sha256: output.document_sha256, model_sha256: output.model_sha256 }));

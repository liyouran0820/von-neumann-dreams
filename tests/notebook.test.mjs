import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGS } from '../web/level-catalog.js';
import { createNotebook } from '../web/notebook.js';
import { createState, scienceResult } from '../web/engine.js';

const current = CATALOGS.academy;
const observation = { gate: false, door: false };
function storageFor(value, catalog = current) {
  const values = new Map(value === undefined ? [] : [[catalog.notesKey, JSON.stringify(value)]]);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('损坏JSON、数组和错误顶层类型不阻止新观察持久化', () => {
  for (const raw of ['{', 'null', 'false', '42', '"invalid"', '[]']) {
    const storage = storageFor();
    storage.setItem(current.notesKey, raw);
    const notebook = createNotebook(current, () => storage);
    assert.equal(notebook.observation('G1', '00'), undefined);
    notebook.observe('G1', '00', observation);
    assert.deepEqual(createNotebook(current, () => storage).observation('G1', '00'), observation);
  }
});

test('损坏行与错误位数不算已观察，其他合法旧记录仍保留', () => {
  const storage = storageFor({ G1: { '00': null, '01': observation, '10': [], '11': { gate: true, door: '1' }, '000': true, bad: true }, G2: [], G3: { '0': false }, missing: { '00': true } });
  const notebook = createNotebook(current, () => storage);
  for (const [id, key] of [['G1', '00'], ['G1', '10'], ['G1', '11'], ['G1', '000'], ['G1', 'bad'], ['G2', '00'], ['missing', '00']]) assert.equal(notebook.observation(id, key), undefined);
  assert.deepEqual(notebook.observation('G1', '01'), observation);
  assert.deepEqual(notebook.observation('G3', '0'), observation);
  notebook.observe('G2', '00', observation);
  assert.deepEqual(createNotebook(current, () => storage).observation('G2', '00'), observation);
});

test('布尔札记、双门front和与非中间值保持兼容，读取不改写旧档', () => {
  const saved = { G1: { '00': false }, G4: { '01': { gate: true, door: true, front: false } }, G5: { '00': { gate: true, door: false } } };
  const storage = storageFor(saved), notebook = createNotebook(current, () => storage);
  assert.deepEqual(notebook.observation('G1', '00'), observation);
  assert.deepEqual(notebook.observation('G4', '01'), saved.G4['01']);
  assert.deepEqual(notebook.observation('G5', '00'), saved.G5['00']);
  assert.equal(storage.getItem(current.notesKey), JSON.stringify(saved));
  notebook.observation('G4', '01').front = true;
  assert.equal(notebook.observation('G4', '01').front, false);
});

test('十三关实际电路信号可按既有封装完整保存并重载', () => {
  const storage = storageFor(undefined, CATALOGS.v2), notebook = createNotebook(CATALOGS.v2, () => storage);
  const expected = [];
  for (const level of CATALOGS.v2.levels) {
    const result = scienceResult(level, createState(level));
    for (const circuit of level.science.circuits) {
      const signals = result.circuits.find(c => c.id === circuit.id).signals;
      const key = circuit.inputs.map(input => signals[input.id] ? '1' : '0').join('');
      notebook.observe(level.id, key, signals, circuit.id);
      expected.push([level.id, key, signals, circuit.id]);
    }
  }
  const saved = JSON.parse(storage.getItem(CATALOGS.v2.notesKey));
  assert.equal(saved.format, 1);
  assert.equal(saved.catalog, 'v2');
  const restored = createNotebook(CATALOGS.v2, () => storage);
  for (const [id, key, signals, circuit] of expected) assert.deepEqual(restored.observation(id, key, circuit), signals);
});

test('十三关拒绝未知封装、数组嵌套和缺失节点，合法电路不受损坏行影响', () => {
  const level = CATALOGS.v2.levels[0], circuit = level.science.circuits[0];
  const valid = { A: false, B: false, Y: false };
  const validRow = { A: true, B: false, Y: false };
  for (const source of [[], null, { [level.id]: [] }, { [level.id]: { [circuit.id]: [] } }, { [level.id]: { [circuit.id]: { '00': null, '01': { A: false, B: true }, '10': validRow } } }]) {
    const storage = storageFor({ format: 1, catalog: 'v2', levels: source }, CATALOGS.v2);
    const notebook = createNotebook(CATALOGS.v2, () => storage);
    assert.equal(notebook.observation(level.id, '00', circuit.id), undefined);
    assert.equal(notebook.observation(level.id, '01', circuit.id), undefined);
    if (source?.[level.id]?.[circuit.id]?.['10']) assert.deepEqual(notebook.observation(level.id, '10', circuit.id), validRow);
    notebook.observe(level.id, '00', valid, circuit.id);
    assert.deepEqual(createNotebook(CATALOGS.v2, () => storage).observation(level.id, '00', circuit.id), valid);
  }
  const validLevels = { [level.id]: { [circuit.id]: { '00': valid } } };
  for (const saved of [{ format: 2, catalog: 'v2', levels: validLevels }, { format: 1, catalog: 'academy', levels: validLevels }]) {
    const notebook = createNotebook(CATALOGS.v2, () => storageFor(saved, CATALOGS.v2));
    assert.equal(notebook.observation(level.id, '00', circuit.id), undefined);
  }
});

test('同关不同世界的电路按ID隔离，重复输入记录不会串行', () => {
  const level = CATALOGS.v2.levels[6], [night, day] = level.science.circuits;
  const notebook = createNotebook(CATALOGS.v2, () => storageFor());
  notebook.observe(level.id, '0', { LN: false, YN: true }, night.id);
  notebook.observe(level.id, '0', { LW: false, YW: true }, day.id);
  assert.deepEqual(notebook.observation(level.id, '0', night.id), { LN: false, YN: true });
  assert.deepEqual(notebook.observation(level.id, '0', day.id), { LW: false, YW: true });
  assert.equal(notebook.observation(level.id, '0', 'missing'), undefined);
});

test('清除只移除当前札记，保留各版本通关、其他札记及无关键', () => {
  const storage = storageFor();
  for (const catalog of Object.values(CATALOGS)) {
    storage.setItem(catalog.progressKey, 'keep progress');
    if (catalog.notesKey) storage.setItem(catalog.notesKey, 'keep notes');
  }
  storage.setItem('unrelated', 'keep');
  createNotebook(CATALOGS.v2, () => storage).clear();
  assert.equal(storage.getItem(CATALOGS.v2.notesKey), null);
  for (const catalog of Object.values(CATALOGS)) {
    assert.equal(storage.getItem(catalog.progressKey), 'keep progress');
    if (catalog.notesKey && catalog.id !== 'v2') assert.equal(storage.getItem(catalog.notesKey), 'keep notes');
  }
  assert.equal(storage.getItem('unrelated'), 'keep');
});

test('存储访问或写入被拒时可继续记录和清除内存札记', () => {
  const blocked = () => { throw new Error('Storage unavailable'); };
  for (const getStorage of [blocked, () => undefined, () => ({ getItem: blocked, setItem: blocked, removeItem: blocked }), () => ({ getItem: () => null, setItem: blocked, removeItem: blocked })]) {
    const notebook = createNotebook(current, getStorage);
    notebook.observe('G1', '00', observation);
    assert.deepEqual(notebook.observation('G1', '00'), observation);
    notebook.clear();
    assert.equal(notebook.observation('G1', '00'), undefined);
  }
});

test('重复观察不重复写存储，无效记录不覆盖已有观察', () => {
  const storage = storageFor(), notebook = createNotebook(current, () => storage);
  notebook.observe('G1', '00', observation);
  let writes = 0;
  storage.setItem = () => { writes++; };
  notebook.observe('G1', '00', { ...observation });
  notebook.observe('G1', '00', { gate: false, door: null });
  notebook.observe('G1', '000', observation);
  notebook.observe('missing', '00', observation);
  assert.equal(writes, 0);
  assert.deepEqual(notebook.observation('G1', '00'), observation);
});

test('原版映射没有札记存储，不创建无关记录', () => {
  const storage = storageFor(), notebook = createNotebook(CATALOGS.original, () => storage);
  notebook.observe('G1', '00', observation);
  assert.equal(notebook.observation('G1', '00'), undefined);
  assert.equal(storage.getItem(null), null);
});

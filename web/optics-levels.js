import { LEVELS } from './levels.js';

// New course metadata and explicit science amendments; source layouts remain
// available as LEVELS for comparison and the original regression suite.
export const OPTICS_LEVELS = structuredClone(LEVELS);
const courses = [
  ['双界校准', '对应 · 约束', '让两侧校准箱入槽，前往回廊。', '同样的推动，在不同障碍下可以产生不同位移。'],
  ['逻辑回廊', '对应 · 数字逻辑', '让白侧 A 亮、B 灭，穿过回廊。', '与门要求所有输入为 1；非门把 0 变成 1。这里的门由 A 与 非 B 控制。'],
  ['反射与支撑', '约束 · 光学', '借桥，再将光反射到白侧 A 感应器。', '平面镜的入射角等于反射角，两者都相对法线测量。转动镜面会改变光路。'],
  ['有限名额', '统筹', '安排两座虚影桥，穿过双院。', '真实位置会留下；临时支撑需要维持。站稳后，同一个名额可以继续使用。'],
  ['联合实验', '逻辑 · 光学 · 统筹', '双箱归位，接通白侧光路，穿过入学验收环。', '感应器把光转换成信号，逻辑电路组合这些信号。已留下的状态与临时支撑共同完成路线。'],
];
OPTICS_LEVELS.forEach((level, i) => {
  const [title, schools, goal, note] = courses[i];
  level.academy = { title, schools, note, completion: i === 4 ? '入学试炼完成，欢迎成为午夜学院的一员。' : title + '通过' };
  level.goal = goal;
});

const signal = id => ({ signal: id });
const not = id => ({ op: 'not', args: [signal(id)] });
const and = (...args) => ({ op: 'and', args });
OPTICS_LEVELS[1].science = {
  world: 'day', kind: 'logic', formula: 'A ∧ ¬B',
  inputs: [
    { id: 'A', type: 'plate', x: 4, label: '箱子压住踏板' },
    { id: 'B', type: 'switch', initial: true, cell: [2, 2], label: '实验开关' },
  ], circuit: and(signal('A'), not('B')),
};
OPTICS_LEVELS[1].hints = [
  '观察白侧线路：B 先经过“非”，再和 A 一起进入“与”。',
  '与门需要两路都亮。A 来自踏板，另一条线路来自非 B；B 灭时，非 B 才亮。',
  '绑定箱 A，向右推两次；切到白侧，关闭 B 开关。回到身体视角，经 P1 → 白门 → P2 抵达夜出口。',
];

// A visible local light gate across the white corridor; the source bridge,
// chasm, portals and exit coordinates are untouched.
for (let y = 1; y <= 5; y++) {
  const row = OPTICS_LEVELS[2].grids.day[y];
  OPTICS_LEVELS[2].grids.day[y] = row.slice(0, 10) + (y === 2 || y === 3 ? 'D' : '#') + row.slice(11);
}
OPTICS_LEVELS[2].science = {
  world: 'day', kind: 'optics', formula: '光 → A → 门',
  emitters: [{ id: 'light', cell: [1, 2], direction: [1, 0] }],
  mirrors: [{ id: 'M', cell: [4, 2], orientation: '/' }],
  sensors: [{ id: 'light-A', cell: [4, 4], label: 'A' }],
  inputs: [{ id: 'A', type: 'sensor', sensor: 'light-A', label: '受光感应器' }],
  circuit: signal('A'),
};
OPTICS_LEVELS[2].hints = [
  '白侧镜面的虚线是法线。看看反射光目前照到哪里。',
  '光照到 A 感应器才会开门。镜面有两个 45° 朝向；点一下镜面即可转向。',
  '在白侧转动 M，让光向下照到 A。映射夜桥 B，经 P1 → 白桥 → 光门 → P2 到夜出口。',
];

OPTICS_LEVELS[4].science = {
  world: 'day', kind: 'combined', formula: 'P ∧ A ∧ ¬B',
  emitters: [{ id: 'light', cell: [1, 2], direction: [1, 0] }],
  mirrors: [{ id: 'M', cell: [3, 2], orientation: '\\' }],
  sensors: [{ id: 'light-A', cell: [3, 1], label: 'A' }, { id: 'light-B', cell: [3, 4], label: 'B' }],
  inputs: [
    { id: 'P', type: 'plate', x: 4, label: '白箱踏板' },
    { id: 'A', type: 'sensor', sensor: 'light-A', label: 'A 受光' },
    { id: 'B', type: 'sensor', sensor: 'light-B', label: 'B 受光' },
  ], circuit: and(signal('P'), signal('A'), not('B')),
};
OPTICS_LEVELS[4].hints = [
  '白门需要三条输入：踏板 P、感应器 A、非 B。光和箱子各负责其中一部分。',
  '先用止挡制造位差；白箱压住 P 后，还要让光照到 A，避开 B。真实箱位会保留。',
  '箱子先左两次、右三次，到夜 6 / 白 4。在白侧转一次 M，让 A 亮、B 灭。借 B 到岛，经 P1 → 白门 → P2，再借 C 走入验收环。',
];

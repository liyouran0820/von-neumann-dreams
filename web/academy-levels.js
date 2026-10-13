import { LEVELS } from './levels.js';

// Five successive logic lessons. Mirrors remain signal-generating play objects.
export const ACADEMY_LEVELS = structuredClone(LEVELS);
const signal = id => ({ signal: id });
const gate = (op, ...args) => ({ op, args });
const school = '午夜学院 · 数字逻辑';
const courses = [
  ['与门 AND', '让夜槽 A、白槽 B 同时亮起，走到验收环。', '与门：只有全部输入都是1，输出才是1。两侧校准槽是本关的两个输入。'],
  ['或门 OR', '接通白侧任意一路输入，穿过回廊。', '或门：至少一个输入为1，输出就是1。A亮、B亮、两路都亮，都能开门。'],
  ['非门 NOT', '让白侧感应器 A 熄灭，打开非门并借桥通过。', '非门翻转输入：输入1得到0，输入0得到1。光门只是输入来源，镜面用来改变亮与灭。'],
  ['异或门 XOR', '安排双桥，穿过两道联动门，抵达出口。', '两个开关共同产生异或信号Y。相同时Y=0，前门开、后门关；不同时Y=1，前门关、后门开。任意一个开关都能同时改变两道门。'],
  ['与非门 NAND', '双箱归位、点亮白侧 B，用两个与非门打开通路。', '与非门把“与”的结果取反。第一门 C = A NAND B；第二门的两端都接 C，得到 C NAND C = 非C，组合后等价于与门。'],
];
ACADEMY_LEVELS.forEach((level, i) => {
  const [title, goal, note] = courses[i];
  level.academy = { title, schools: school, note, completion: i === 4 ? '入学试炼完成，欢迎成为午夜学院的一员。' : title + '课程通过' };
  level.goal = goal;
});

ACADEMY_LEVELS[0].science = {
  world: 'night', scope: 'assessment', kind: 'logic', lessonGate: 'and', formula: 'Y = A ∧ B',
  inputs: [
    { id: 'A', type: 'plate', world: 'night', x: 3, label: '夜侧校准槽' },
    { id: 'B', type: 'plate', world: 'day', x: 5, label: '白侧校准槽' },
  ], circuit: gate('and', signal('A'), signal('B')),
};
ACADEMY_LEVELS[0].hints = ['先让一个槽亮起，观察与门输出。','与门需要两路同时为1。夜箱到止挡后，白箱仍能继续移动。','映射箱A，向右推三次，到夜3、白5。两个输入都为1后走到夜出口。'];

ACADEMY_LEVELS[1].science = {
  world: 'day', kind: 'logic', lessonGate: 'or', formula: 'Y = A ∨ B',
  inputs: [
    { id: 'A', type: 'plate', x: 4, label: '白箱踏板' },
    { id: 'B', type: 'switch', initial: false, cell: [2, 2], label: 'B 实验开关' },
  ], circuit: gate('or', signal('A'), signal('B')),
};
ACADEMY_LEVELS[1].hints = ['白门前的或门接受两路输入。试试只接通其中一路。','A来自白箱踏板，B来自开关。任意一路为1就开门，两路同时亮也可以。','可以映射箱A向右两次，或切到白侧打开B开关。再经P1 → 白门 → P2到夜出口。'];

// The light gate is a physical route constraint, not a separate optics lesson.
for (let y = 1; y <= 5; y++) {
  const row = ACADEMY_LEVELS[2].grids.day[y];
  ACADEMY_LEVELS[2].grids.day[y] = row.slice(0, 10) + (y === 2 || y === 3 ? 'D' : '#') + row.slice(11);
}
ACADEMY_LEVELS[2].science = {
  world: 'day', kind: 'light-input', lessonGate: 'not', formula: 'Y = ¬A',
  emitters: [{ id: 'light', cell: [1, 2], direction: [1, 0] }],
  mirrors: [{ id: 'M', cell: [4, 2], orientation: '\\' }],
  sensors: [{ id: 'light-A', cell: [4, 4], label: 'A' }],
  inputs: [{ id: 'A', type: 'sensor', sensor: 'light-A', label: '白侧受光感应器' }],
  circuit: gate('not', signal('A')),
};
ACADEMY_LEVELS[2].hints = ['现在A亮着，非门输出却是0。怎样改变这个输入？','非门的输入和输出总是相反。转动镜面，让光不再照到A。','切到白侧转一次M，让A=0、门=1。映射夜桥B，经P1 → 白桥 → 光门 → P2抵达夜出口。'];

for (let y = 1; y <= 5; y++) {
  const row = ACADEMY_LEVELS[3].grids.night[y];
  const cells=[...row];cells[5]=y===1||y===2?'D':'#';cells[17]=y===4||y===5?'D':'#';
  ACADEMY_LEVELS[3].grids.night[y] = cells.join('');
}
const xorSignal=gate('xor',signal('A'),signal('B'));
ACADEMY_LEVELS[3].science = {
  world: 'night', kind: 'logic', lessonGate: 'xor', formula: 'Y = A ⊕ B',
  inputs: [
    { id: 'A', type: 'switch', initial: true, cell: [8, 1], label: 'A 实验开关' },
    { id: 'B', type: 'switch', initial: true, cell: [12, 5], label: 'B 实验开关' },
  ], circuit: xorSignal,
  doors: [
    {id:'front',label:'前门',cells:[[5,1],[5,2]],circuit:gate('not',xorSignal)},
    {id:'back',label:'后门',cells:[[17,4],[17,5]],circuit:xorSignal},
  ],
};
ACADEMY_LEVELS[3].hints = ['只改变一个开关，观察两道门是否都会回应。','开关相同时前门开，不同时后门开。可以先穿过前门，再在岛上改变任意一个输入。','保持初始双亮，借B通过前门到岛。关闭A或B，经P1/P2绕墙，在安全地面换C，通过后门到出口。'];

const intermediate = gate('nand', signal('A'), signal('B'));
ACADEMY_LEVELS[4].science = {
  world: 'day', kind: 'light-input', lessonGate: 'nand', formula: 'C=¬(A∧B) · Y=¬C',
  emitters: [{ id: 'light', cell: [1, 2], direction: [1, 0] }],
  mirrors: [{ id: 'M', cell: [3, 2], orientation: '/' }],
  sensors: [{ id: 'light-B', cell: [3, 4], label: 'B' }],
  inputs: [
    { id: 'A', type: 'plate', x: 4, label: '白箱踏板' },
    { id: 'B', type: 'sensor', sensor: 'light-B', label: '白侧受光感应器' },
  ], lessonCircuit: intermediate, circuit: gate('nand', intermediate, intermediate),
};
ACADEMY_LEVELS[4].hints = ['先看第一门的C，再看C进入第二门后发生什么。','与非门只有在两路都是1时输出0。把同一输出接到第二门两端，就能再取反一次。','箱子左两次、右三次到夜6/白4；在白侧转一次M让B亮。此时A=B=1，C=0、门Y=1。再借B、穿门、换C，走入验收环。'];

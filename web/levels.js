const knob = { x: .15, y: .15, w: .7, h: .7 };
function object(id, name, max, origin, axis = [1, 0], extra = {}) {
  return { id, name, min: 0, max, initial: 0, origin, axis, solid: knob, seal: [0, -1.3], railOffset: [0, 0], ...extra };
}
function room(id, name, max, origin, floor, extra = {}) {
  return object(id, name, max, origin, [1, 0], {
    kind: 'room', solid: null, floor: { ...floor, carry: true, priority: 10 },
    seal: [floor.x + 1, floor.y - 1.25], railOffset: [0, floor.y + floor.h + .8],
    colliders: [
      { x: floor.x + .375, y: floor.y + .375, w: .25, h: .25 },
      { x: floor.x + floor.w - .625, y: floor.y + .375, w: .25, h: .25 },
    ],
    ...extra,
  });
}
const rect = (x, y, w, h) => ({ x, y, w, h });
const bridge = (max, origin, width, extra = {}) => object('G', '抽板桥', max, origin, [0, -1], {
  kind: 'bridge', solid: null, spring: -1,
  floor: { x: 0, y: 0, w: width, h: 1, carry: false, priority: 1 },
  seal: [-1.2, -.35], ...extra,
});
const bank = [rect(0, 0, 5, 9), rect(10, 0, 5, 9), rect(5, 4, 1, 1), rect(9, 4, 1, 1)];
export const LEVELS = [
  {
    id: 'lab-tracks', lab: true, number: '00', name: '横竖刻轨', place: '入门实验台',
    goalText: '试着连接两个纹章，再从任意一端推拉。',
    start: [3, 4], view: { x: -1, y: -1, w: 16, h: 12 },
    floors: [rect(0, 0, 14, 10)],
    objects: [
      object('A', '横向滑块', 3, [3, 3], [1, 0], { grip: [0, 1], kind: 'slider' }),
      object('B', '纵向滑块', 3, [9, 2], [0, 1], { grip: [1, 0], kind: 'slider', seal: [-1.3, 0] }),
    ],
    hints: ['同一个纹章可以从两端驱动。', '看看刻轨尽头会对另一端产生什么影响。'],
  },
  {
    id: 'lab-cart', lab: true, number: '00', name: '车厢里的刻轨', place: '入门实验台',
    goalText: '分别移动滑座与整辆车，观察刻轨属于哪里。',
    start: [4, 5], view: { x: -1, y: -1, w: 16, h: 12 },
    floors: [rect(0, 0, 14, 10)],
    objects: [
      room('C', '实验车厢', 3, [6, 4], rect(-2, -1, 5, 3), { grip: [-1, 1] }),
      object('S', '车内滑座', 2, [0, 0], [1, 0], { parent: 'C', grip: [0, 1], kind: 'slider' }),
    ],
    hints: ['车内刻痕固定在车厢里。', '移动整辆车时，滑座在车内的刻度变了吗？'],
  },
  {
    id: 'long-door', number: '01', name: '短尺开长门', place: '测绘学馆',
    goalText: '让厚石门完全露出通口，走进学馆。',
    start: [3, 9], view: { x: -1, y: -1, w: 21, h: 13 },
    floors: [rect(0, 5, 19, 6), rect(11, 3, 1, 2), rect(0, 0, 19, 3)],
    objects: [
      object('H', '量尺把手', 2, [3, 8], [1, 0], { kind: 'handle', grip: [0, 1] }),
      object('D', '厚石门', 6, [6, 3], [1, 0], { kind: 'door', solid: rect(0, 0, 6, 2), seal: [2, -1.2], railOffset: [0, -1], glass: true }),
    ],
    goal: { exit: rect(10, 0, 3, 2), positions: [{ id: 'D', at: 6 }] }, exitPoint: [11, 1],
    hints: ['把手回来时，门为什么也回来了？', '哪一段动作需要共享，哪一段不需要？', '门前进后，先断开，再把把手拉回。'],
    insight: '相同的变化，不要求相同的起点。',
  },
  {
    id: 'borrow-stop', number: '02', name: '借来的轨道尽头', place: '建筑学馆',
    goalText: '松手后仍让桥保持接合，再走到对岸。',
    start: [1, 8], view: { x: -1, y: -1, w: 17, h: 12 },
    floors: bank,
    objects: [
      object('H', '手推把手', 3, [1, 7], [1, 0], { kind: 'handle', grip: [0, 1] }),
      bridge(3, [6, 7], 3, { glass: true }),
      object('B', '铜滑块', 1, [2, 1], [1, 0], { kind: 'slider', glass: true }),
    ],
    obstacles: [{ ...rect(1, 0, 3, 3), name: '玻璃壁龛', avatarOnly: true }],
    goal: { exit: rect(12, 3, 2, 3), positions: [{ id: 'G', at: 3 }] }, exitPoint: [12, 4],
    hints: ['铜滑块到了轨道尽头时，另一端还能继续走吗？', '桥想往回走时，能否让另一端没有同样的退路？', '先把桥推出去，再连到仍在起点的铜滑块。'],
    insight: '不能移动，也是一种能传递的限制。',
  },
  {
    id: 'still-orbit', number: '03', name: '移动的房间，不动的天球', place: '天文学馆',
    goalText: '让观测室接上对岸，天球始终留在导环中。',
    start: [5, 5], view: { x: -1, y: -1, w: 20, h: 11 },
    floors: [rect(0, 2, 4, 5), rect(13, 3, 5, 3)],
    objects: [
      room('C', '观测室', 3, [7, 4], rect(-3, -2, 6, 4), { grip: [-2, 1] }),
      object('S', '天球滑座', 3, [0, 0], [-1, 0], { parent: 'C', kind: 'orb', grip: [0, 1], seal: [0, -1.25] }),
    ],
    guides: [{ body: 'S', axis: 0, value: 7, at: [7, 4], name: '固定导环' }],
    goal: { exit: rect(15, 3, 2, 3), positions: [{ id: 'C', at: 3 }], receivers: [{ id: 'S', at: [7, 4] }] }, exitPoint: [15, 4],
    hints: ['天球的刻痕画在哪个物体上？', '房间向右一格，天球又在房间里向左一格，它相对导环在哪里？', '连接房间和天球滑座，让它们同时沿各自箭头前进。'],
    insight: '说一个东西没有动之前，要先说清它相对于什么。',
  },
  {
    id: 'carry-fixed', number: '04', name: '已经固定的东西，仍然能运走', place: '自然史馆',
    goalText: '让标本随车到达接收架，桥保持接合。',
    start: [3, 7], view: { x: -1, y: -1, w: 20, h: 12 },
    floors: [rect(0, 0, 4, 9), rect(12, 2, 6, 5)],
    objects: [
      room('C', '运输车厢', 4, [5, 4], rect(-1, -1, 4, 3), { grip: [-1, 1] }),
      object('S', '标本滑座', 2, [0, 0], [1, 0], { parent: 'C', kind: 'specimen', glass: true }),
      bridge(2, [4, 7], 8, { grip: [-1, 0] }),
    ],
    supports: [{ body: 'C', bridge: 'G', at: 2 }],
    goal: { exit: rect(14, 3, 2, 3), positions: [{ id: 'C', at: 4 }, { id: 'S', at: 0 }, { id: 'G', at: 2 }], receivers: [{ id: 'S', at: [9, 4] }] }, exitPoint: [14, 4],
    receiverMarks: [{ at: [9, 4], name: '标本接收架' }],
    hints: ['被固定的是标本在哪条轨道上的位置？', '车厢前进时，标本在车厢里的刻度改变了吗？', '让标本继续连接桥，只推动车厢。'],
    insight: '本地位置不变，仍然可以随整个房间抵达彼岸。',
  },
  {
    id: 'academy', number: '05', name: '把整间学院搬过去', place: '中央大礼堂',
    goalText: '礼堂和档案到岸，天球留在原处，桥松手后仍接合。',
    start: [2, 10], view: { x: -2, y: -1, w: 23, h: 14 },
    floors: [rect(0, 7, 5, 5), rect(15, 3, 4, 3)],
    objects: [
      object('H', '短行程把手', 2, [2, 9], [1, 0], { kind: 'handle', grip: [0, 1] }),
      room('C', '大礼堂', 6, [6, 4], rect(-6, -2, 9, 5), { glass: true }),
      object('S', '天球滑座', 6, [0, 0], [-1, 0], { parent: 'C', kind: 'orb', seal: [0, -.9], glass: true }),
      object('B', '档案滑座', 1, [1, -1], [1, 0], { parent: 'C', kind: 'archive', seal: [0, -1.3], glass: true }),
      bridge(2, [0, 8], 15, { seal: [1.1, -1] }),
    ],
    guides: [{ body: 'S', axis: 0, value: 6, at: [6, 4], name: '固定导环' }],
    supports: [{ body: 'C', bridge: 'G', at: 2 }],
    goal: { exit: rect(16, 3, 2, 3), positions: [{ id: 'C', at: 6 }, { id: 'B', at: 0 }, { id: 'G', at: 2 }], receivers: [{ id: 'S', at: [6, 4] }, { id: 'B', at: [13, 3] }] }, exitPoint: [16, 4],
    receiverMarks: [{ at: [13, 3], name: '档案接收架' }],
    hints: ['房间运动时，哪些物件的刻度要变，哪些要保持？', '档案在房间里的刻度不变，还能抵达对岸吗？', '让桥与档案形成一组；把手、房间、天球形成另一组。回程只断开把手。'],
    insight: '让该动的东西一起动，让需要保持的关系独立存在。',
  },
];

export const HUB = [
  { id: 'lab-tracks', name: '刻轨实验台', detail: '先试一次连接', x: 130, y: 300 },
  { id: 'lab-cart', name: '车厢实验台', detail: '观察移动的刻痕', x: 280, y: 460 },
  { id: 'long-door', name: '测绘学馆', detail: '短尺开长门', x: 320, y: 220 },
  { id: 'borrow-stop', name: '建筑学馆', detail: '借来的轨道尽头', x: 500, y: 160 },
  { id: 'still-orbit', name: '天文学馆', detail: '房间与天球', x: 680, y: 220 },
  { id: 'carry-fixed', name: '自然史馆', detail: '运走固定的物件', x: 720, y: 420 },
  { id: 'academy', name: '中央大礼堂', detail: '把整间学院搬过去', x: 485, y: 380 },
];

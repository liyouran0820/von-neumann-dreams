const all = (...items) => ({ type: 'all', items });
const at = node => ({ type: 'at', node });
const memory = value => ({ type: 'memory', value });
const binding = (target, source) => ({ type: 'binding', target, source });
const not = item => ({ type: 'not', item });
const condition = (id, label, expression) => ({ id, label, expression });
const rule = (condition, action) => ({ condition, action, enabled: true });
const common = [
  condition('capture', '在压力台上，且符印暗', all(at('start'), memory(0))),
  condition('link-bridge', '桥跟随压力台，且符印亮', all(binding('bridge', 'pad'), memory(1))),
  condition('ahead', '前方道路可通行', { type: 'ahead' }),
  condition('blocked-ahead', '前方道路不可通行', not({ type: 'ahead' })),
  condition('memory-bright', '符印亮', memory(1)),
  condition('memory-dark', '符印暗', memory(0)),
  condition('always', '始终', { type: 'always' }),
];

export const LEVELS = [
  {
    id: 'remember', number: '01', name: '留下这一刻', subtitle: '记忆与实时状态',
    mission: '离开压力台后，仍让星桥接通。',
    start: 'start', goal: 'exit', facing: 1,
    nodes: [
      { id: 'start', name: '压力台', x: 0, y: 1 },
      { id: 'landing', name: '前庭', x: 1, y: 1 },
      { id: 'far', name: '星桥彼端', x: 3, y: 1 },
      { id: 'exit', name: '出口', x: 4, y: 1 },
    ],
    edges: [{ ends: ['start', 'landing'] }, { ends: ['landing', 'far'], gate: 'bridge' }, { ends: ['far', 'exit'] }],
    sources: [{ id: 'pad', name: '压力台', node: 'start' }],
    devices: [{ id: 'bridge', name: '星桥', source: 'pad', activeWhen: 1, edge: ['landing', 'far'] }],
    conditions: common,
    initialProgram: [rule('ahead', 'move'), rule('capture', 'sample:pad'), rule('link-bridge', 'link:bridge:memory')],
    solution: [rule('capture', 'sample:pad'), rule('link-bridge', 'link:bridge:memory'), rule('ahead', 'move')],
    hints: ['纸灵离开压力台时，压力台会变暗。', '符印保存的是取样那一刻的值。', '先取样，再让星桥跟随符印；检查前进规则的优先级。'],
    insight: '来源变化了，记忆仍然保留。',
  },
  {
    id: 'diverge', number: '02', name: '同源异命', subtitle: '共享与依赖',
    mission: '穿过星桥和月门，走到发光的出口。',
    start: 'start', goal: 'exit', facing: 1, goalDevices: ['moon'],
    nodes: [
      { id: 'start', name: '压力台', x: 0, y: 0 },
      { id: 'landing', name: '桥前', x: 1, y: 0 },
      { id: 'corner', name: '转角', x: 3, y: 0 },
      { id: 'court', name: '月庭', x: 3, y: 1 },
      { id: 'last', name: '门后', x: 3, y: 3 },
      { id: 'exit', name: '出口', x: 4, y: 3 },
    ],
    edges: [{ ends: ['start', 'landing'] }, { ends: ['landing', 'corner'], gate: 'bridge' }, { ends: ['corner', 'court'] }, { ends: ['court', 'last'], gate: 'moon' }, { ends: ['last', 'exit'] }],
    sources: [{ id: 'pad', name: '压力台', node: 'start' }],
    devices: [
      { id: 'bridge', name: '星桥', source: 'pad', activeWhen: 1, edge: ['landing', 'corner'] },
      { id: 'moon', name: '月门', source: 'memory', activeWhen: 0, edge: ['court', 'last'] },
    ],
    conditions: [...common,
      condition('link-moon', '月门没有跟随压力台', not(binding('moon', 'pad'))),
      condition('moon-not-memory', '月门没有跟随符印', not(binding('moon', 'memory'))),
      condition('moon-closed-ahead', '在月庭，且月门关闭', all(at('court'), { type: 'signal', source: 'moon', value: 0 })),
      condition('corner-east', '在转角，且朝东', all(at('corner'), { type: 'facing', value: 1 })),
      condition('last-south', '在门后，且朝南', all(at('last'), { type: 'facing', value: 2 })),
    ],
    initialProgram: [rule('capture', 'sample:pad'), rule('link-bridge', 'link:bridge:memory'), rule('moon-closed-ahead', 'link:moon:memory'), rule('ahead', 'move'), rule('corner-east', 'turn-right'), rule('last-south', 'turn-left')],
    solution: [rule('capture', 'sample:pad'), rule('link-bridge', 'link:bridge:memory'), rule('link-moon', 'link:moon:pad'), rule('ahead', 'move'), rule('corner-east', 'turn-right'), rule('last-south', 'turn-left')],
    hints: ['星型装置在输入亮时开启，月型装置在输入暗时开启。', '同一个符印无法同时保存亮和暗。', '离开压力台以后，它的实时值正好是暗。试着给月门换一个来源。'],
    insight: '装置可以换来源，也可以随共享记忆一起变化。',
  },
  {
    id: 'rewrite', number: '03', name: '重写契约', subtitle: '覆盖与连锁变化',
    mission: '通过星桥，再打开前方的月门。',
    start: 'start', goal: 'exit', facing: 1, goalDevices: ['moon'],
    nodes: [
      { id: 'start', name: '压力台', x: 0, y: 0 },
      { id: 'landing', name: '桥前', x: 1, y: 0 },
      { id: 'far', name: '星桥彼端', x: 3, y: 0 },
      { id: 'checkpoint', name: '交汇台', x: 4, y: 0 },
      { id: 'doorstep', name: '门后', x: 4, y: 2 },
      { id: 'exit', name: '出口', x: 4, y: 3 },
    ],
    edges: [{ ends: ['start', 'landing'] }, { ends: ['landing', 'far'], gate: 'bridge' }, { ends: ['far', 'checkpoint'] }, { ends: ['checkpoint', 'doorstep'], gate: 'moon' }, { ends: ['doorstep', 'exit'] }],
    sources: [{ id: 'pad', name: '压力台', node: 'start' }],
    devices: [
      { id: 'bridge', name: '星桥', source: 'pad', activeWhen: 1, edge: ['landing', 'far'] },
      { id: 'moon', name: '月门', source: 'memory', activeWhen: 0, edge: ['checkpoint', 'doorstep'] },
    ],
    conditions: [...common,
      condition('overwrite', '在交汇台，且符印亮', all(at('checkpoint'), memory(1))),
      condition('checkpoint-east', '在交汇台，且朝东', all(at('checkpoint'), { type: 'facing', value: 1 })),
      condition('link-moon', '月门没有跟随压力台', not(binding('moon', 'pad'))),
    ],
    initialProgram: [rule('capture', 'sample:pad'), rule('link-bridge', 'link:bridge:memory'), rule('ahead', 'move'), rule('checkpoint-east', 'turn-right')],
    solution: [rule('capture', 'sample:pad'), rule('link-bridge', 'link:bridge:memory'), rule('overwrite', 'sample:pad'), rule('ahead', 'move'), rule('checkpoint-east', 'turn-right')],
    alternative: [rule('capture', 'sample:pad'), rule('link-bridge', 'link:bridge:memory'), rule('link-moon', 'link:moon:pad'), rule('ahead', 'move'), rule('checkpoint-east', 'turn-right')],
    hints: ['星桥与月门都在读取符印。', '已经走过的桥可以关闭；前方的门却需要暗。', '可以在交汇台再次取样，也可以改变月门的依赖。两种有效协议都能通关。'],
    insight: '控制取样时机与连接，决定机关如何响应。',
  },
];

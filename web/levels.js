function cells(rows) {
  return rows.flatMap((row, y) => [...row].flatMap((code, x) => code === '.' ? [] : [{ x, y, code }]));
}
export const LEVELS = [
  {
    id: 'borrow', number: '01', name: '借一个转弯', subtitle: '指令也在世界里',
    slots: 3, start: '0,0', goal: '2,3', facing: 1,
    cells: cells(['FFT', 'FFF', 'FFF', 'FFF']),
    initialProgram: ['F', 'F', 'F'], solution: ['F', 'F', 'S'],
    alternative: ['S', 'T', 'F'],
    hints: ['地面符文不会自己执行，换进程序才会生效。', '第三格的“下一格”是第一格。', '可以先走到转向符文上，再把它带进程序。'],
    insight: '一条转弯指令，可以从世界里取得，再留回世界。',
  },
  {
    id: 'bring-swap', number: '02', name: '把交换带走', subtitle: '操作可以作用于操作',
    slots: 3, start: '0,0', goal: '2,3', facing: 1,
    cells: cells(['TFT', 'STS', 'FFF', 'FSF']),
    initialProgram: ['F', 'F', 'F'], solution: ['F', 'T', 'S'],
    hints: ['“交换”也能被换进程序。', '换进去的交换指令，下一拍就会执行。', '同一格可以先收到右转，再把它换到另一个程序槽位。'],
    insight: '换来的交换也能执行。同一条规则可以继续作用于自己。',
  },
  {
    id: 'return', number: '03', name: '回来取走它', subtitle: '留下的指令仍然存在',
    slots: 3, start: '0,0', goal: '2,3', facing: 1,
    cells: cells(['SST', 'TFS', 'SSF', 'STS']),
    initialProgram: ['F', 'F', 'F'], solution: ['F', 'S', 'F'],
    hints: ['被换出的指令会留在地面。', '再次经过同一个格，它可能已经变了。', '可以在转角留下交换指令，绕回来时再把它取走。'],
    insight: '回来时读到的，是你之前留下的世界。',
  },
];

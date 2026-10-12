import assert from 'node:assert/strict';
import { LEVELS } from '../web/levels.js';
import { solveReference } from '../tests/helpers/walkthroughs.mjs';

for (const level of LEVELS.filter(item => !item.lab)) {
  const session = solveReference(level);
  assert.equal(session.state.status, 'success');
  assert.equal(session.state.held, null);
  console.log(`${level.name}：参考路线通过，${session.events.length} 次操作，抵达 ${session.state.player.pos}。`);
}
console.log('此检查验证规则与可达性，不代表玩家体验或唯一解证明。');

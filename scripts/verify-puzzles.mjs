import assert from 'node:assert/strict';
import {LEVELS} from '../web/levels.js';import * as G from '../web/engine.js';import {solve} from '../tests/helpers/walkthroughs.mjs';
for(const l of LEVELS){const s=solve(l,G.createState(l));assert(s.won&&!s.failed);console.log(`${l.id} 参考路线通过：${s.history.length} 次操作；身体 ${s.body.world} (${s.body.x},${s.body.y})；映射 ${s.mapping||'无'}`);}
console.log('五关真实行走 / 穿门路线通过。机制删除反事实搜索未在本脚本复现。');

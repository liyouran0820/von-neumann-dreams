import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCircuit, reflect, traceLight, scienceResult } from '../web/science.js';
import { ACADEMY_LEVELS } from '../web/academy-levels.js';
import { LEVELS } from '../web/levels.js';
import * as G from '../web/engine.js';
import { bind, walk, push, portal, solve } from './helpers/walkthroughs.mjs';

const expr = ACADEMY_LEVELS[1].science.circuit;
test('与非组合的全部真值：只有 A=1 B=0 输出1', () => {
  for (const [A,B,want] of [[false,false,false],[false,true,false],[true,false,true],[true,true,false]])
    assert.equal(evaluateCircuit(expr,{A,B}),want);
  assert.throws(()=>evaluateCircuit(expr,{A:true}),/Unknown signal/);
});
test('OR 与 NOT 的定义及德摩根等价，不把输入顺序当线路', () => {
  for (const A of [false,true]) for (const B of [false,true]) {
    const or={op:'or',args:[{signal:'A'},{signal:'B'}]};
    assert.equal(evaluateCircuit(or,{A,B}),A||B);
    const neither={op:'and',args:[{op:'not',args:[{signal:'A'}]},{op:'not',args:[{signal:'B'}]}]};
    assert.equal(evaluateCircuit(neither,{A,B}),!evaluateCircuit(or,{A,B}));
  }
});
test('两个45度朝向的八种入射方向符合反射且可逆', () => {
  const expected=[[[1,0],[0,-1],[0,1]], [[-1,0],[0,1],[0,-1]], [[0,1],[-1,0],[1,0]], [[0,-1],[1,0],[-1,0]]];
  for (const [incoming,slash,backslash] of expected) {
    assert.deepEqual(reflect(incoming,'/'),slash);assert.deepEqual(reflect(incoming,'\\'),backslash);
    for (const orientation of ['/','\\']) assert.deepEqual(reflect(reflect(incoming,orientation),orientation),incoming);
  }
});
const grid=['#######','#.....#','#.....#','#.....#','#.....#','#.....#','#######'];
test('光路按实际镜面转折，感应器吸收光，墙面遮挡', () => {
  const emitters=[{id:'L',cell:[1,2],direction:[1,0]}], sensors=[{id:'A',cell:[4,4]}];
  const mirrors=[{id:'M',cell:[4,2],orientation:'\\'}];
  const lit=traceLight(grid,emitters,mirrors,sensors);
  assert.deepEqual(lit.hits,['A']);assert.deepEqual(lit.segments.map(s=>[s.from,s.to]),[[[1,2],[4,2]],[[4,2],[4,4]]]);
  assert.equal(lit.bounces[0].incidenceDeg,lit.bounces[0].reflectionDeg);
  assert.deepEqual(traceLight(grid,emitters,[{...mirrors[0],orientation:'/'}],sensors).hits,[]);
  const blocked=[...grid];blocked[2]='#.#...#';assert.deepEqual(traceLight(blocked,emitters,mirrors,sensors).hits,[]);
  assert.deepEqual(traceLight(grid,emitters,[],[{id:'first',cell:[3,2]},{id:'behind',cell:[5,2]}]).hits,['first']);
});
test('多次反射构成环路时明确终止，不挂起游戏', () => {
  const mirrors=[{id:'a',cell:[2,2],orientation:'/'},{id:'b',cell:[2,4],orientation:'\\'},{id:'c',cell:[4,4],orientation:'/'},{id:'d',cell:[4,2],orientation:'\\'}];
  const result=traceLight(grid,[{id:'L',cell:[3,2],direction:[-1,0]}],mirrors);
  assert.equal(result.ends[0].reason,'cycle');assert(result.segments.length<10);
});
test('五关主线和旧版关卡保持独立，光门是明确新增布局', () => {
  assert.equal(ACADEMY_LEVELS.length,5);
  for(const i of [0,1,3,4]) assert.deepEqual(ACADEMY_LEVELS[i].grids,LEVELS[i].grids);
  assert.equal(LEVELS[2].grids.day[3][10],'.');assert.equal(ACADEMY_LEVELS[2].grids.day[3][10],'D');
});
test('G2 白侧局部 A 与非 B 真正控制门，观察不生成跨世界信号', () => {
  const l=ACADEMY_LEVELS[1],s=G.createState(l);
  assert.equal(G.act(l,s,'switch','B'),false);
  bind(l,s,'A');push(l,s,'RR');assert(!G.doorOpen(l,s,'day'));
  const boxes=structuredClone(s.boxes);G.act(l,s,'view',{world:'day',recordHistory:false});
  assert(G.act(l,s,'switch','B'));assert(G.doorOpen(l,s,'day'));assert(!G.doorOpen(l,s,'night'));assert.deepEqual(s.boxes,boxes);
  G.act(l,s,'undo');assert(!G.doorOpen(l,s,'day'));assert.equal(s.science.switches.B,true);
  G.act(l,s,'switch','B');G.act(l,s,'unlink');assert(G.doorOpen(l,s,'day'));
});
test('逻辑关门时允许当前占用者离开，拒绝新进入', () => {
  const l=ACADEMY_LEVELS[1],s=G.createState(l);bind(l,s,'A');push(l,s,'RR');
  G.act(l,s,'view','day');G.act(l,s,'switch','B');portal(l,s,3,3);walk(l,s,6,3);
  G.act(l,s,'switch','B');assert(!s.failed);assert(!G.doorOpen(l,s,'day'));
  assert(G.act(l,s,'move',[1,0]));assert(!G.act(l,s,'move',[-1,0]));
});
test('G3 光门要求真实反射；撤销恢复光路和门', () => {
  const l=ACADEMY_LEVELS[2],s=G.createState(l);assert(!G.doorOpen(l,s,'day'));
  G.act(l,s,'view','day');G.act(l,s,'mirror','M');assert(G.doorOpen(l,s,'day'));assert.deepEqual(scienceResult(l,s).optics.hits,['light-A']);
  G.act(l,s,'undo');assert(!G.doorOpen(l,s,'day'));assert.equal(s.science.mirrors.M,'/');
});
test('G5 踏板和光路分别必要，开关观察无助于满足电路', () => {
  const l=ACADEMY_LEVELS[4],s=G.createState(l);bind(l,s,'A');push(l,s,'LLRRR');assert(!G.doorOpen(l,s,'day'));
  G.act(l,s,'view','day');assert(!G.doorOpen(l,s,'day'));G.act(l,s,'mirror','M');assert(G.doorOpen(l,s,'day'));
  assert.deepEqual(scienceResult(l,s).signals,{P:true,A:true,B:false});push(l,s,'R');assert(!G.doorOpen(l,s,'day'));
});
for (const l of ACADEMY_LEVELS) test(l.id+' Academy 正常走路、实验、映射及传送通关',()=>{
  const s=G.createState(l);
  if(l.science){G.act(l,s,'view','day');G.act(l,s,l.science.kind==='logic'?'switch':'mirror',l.science.kind==='logic'?'B':'M');G.act(l,s,'view','night');}
  solve(l,s);assert(s.won);assert(!s.failed);
});

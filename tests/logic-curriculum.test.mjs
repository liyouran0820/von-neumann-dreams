import test from 'node:test';
import assert from 'node:assert/strict';
import { ACADEMY_LEVELS } from '../web/academy-levels.js';
import { evaluateCircuit, scienceResult, instrumentAt } from '../web/science.js';
import * as G from '../web/engine.js';
import { bind, walk, push, portal, solve } from './helpers/walkthroughs.mjs';

test('课程按AND、OR、NOT、XOR、NAND递进，光路不作为学习目标',()=>{
  assert.deepEqual(ACADEMY_LEVELS.map(l=>l.science.lessonGate),['and','or','not','xor','nand']);
  assert(ACADEMY_LEVELS.every(l=>!l.academy.note.includes('反射角')));
  assert(ACADEMY_LEVELS[2].science.mirrors.length && ACADEMY_LEVELS[4].science.mirrors.length);
});
test('异或和与非全部真值，重复接入同一信号等价于取反',()=>{
  for(const [A,B,xor,nand] of [[false,false,false,true],[false,true,true,true],[true,false,true,true],[true,true,false,false]]){
    assert.equal(evaluateCircuit({op:'xor',args:[{signal:'A'},{signal:'B'}]},{A,B}),xor);
    assert.equal(evaluateCircuit({op:'nand',args:[{signal:'A'},{signal:'B'}]},{A,B}),nand);
    assert.equal(evaluateCircuit(ACADEMY_LEVELS[4].science.circuit,{A,B}),A&&B);
  }
});
test('器材实体占位：键盘不穿开关，寻路绕行，目标占位拒绝',()=>{
  const l=ACADEMY_LEVELS[1],s=G.createState(l);portal(l,s,3,3);walk(l,s,2,3);
  const before=structuredClone(s.body),history=s.history.length;
  assert(instrumentAt(l,'day',2,2));assert(!G.act(l,s,'move',[0,-1]));
  assert.deepEqual(s.body,before);assert.equal(s.history.length,history);assert.match(s.message,/器材/);
  assert.equal(G.findPath(l,s,2,2),null);
  const path=G.findPath(l,s,2,1);assert(path);let point={...s.body};
  for(const [dx,dy] of path){point.x+=dx;point.y+=dy;assert(!(point.x===2&&point.y===2));}
  walk(l,s,2,1);assert.deepEqual([s.body.x,s.body.y],[2,1]);
});
test('镜面、光源、感应器也有实体阻挡，并按世界隔离',()=>{
  const l=ACADEMY_LEVELS[2],s=G.createState(l);
  for(const [x,y] of [[1,2],[4,2],[4,4]])assert.equal(G.support(l,s,'day',x,y),null);
  assert.equal(G.support(l,s,'night',4,2),'floor');
});
test('OR可仅用开关开门，也允许两个输入同时为1',()=>{
  const l=ACADEMY_LEVELS[1],s=G.createState(l);
  G.act(l,s,'view','day');G.act(l,s,'switch','B');assert(G.doorOpen(l,s,'day'));assert.equal(s.boxes.day,2);
  bind(l,s,'A');push(l,s,'RR');assert.deepEqual(scienceResult(l,s).signals,{A:true,B:true});assert(G.doorOpen(l,s,'day'));
  G.act(l,s,'switch','B');assert(G.doorOpen(l,s,'day'));
});
test('NOT光门初始受光关闭，熄灭输入后打开，撤销可恢复',()=>{
  const l=ACADEMY_LEVELS[2],s=G.createState(l);assert.equal(scienceResult(l,s).signals.A,true);assert(!G.doorOpen(l,s,'day'));
  G.act(l,s,'view','day');G.act(l,s,'mirror','M');assert.equal(scienceResult(l,s).signals.A,false);assert(G.doorOpen(l,s,'day'));
  G.act(l,s,'undo');assert(!G.doorOpen(l,s,'day'));
});
test('XOR两道门联动：输入相同前门开，输入不同后门开',()=>{
  const l=ACADEMY_LEVELS[3],s=G.createState(l);
  const check=(front,back)=>{
    assert.deepEqual(scienceResult(l,s).doors,{front,back});
    for(const y of [1,2])assert.equal(G.doorOpen(l,s,'night',5,y),front);
    for(const y of [4,5])assert.equal(G.doorOpen(l,s,'night',17,y),back);
    assert.equal(G.doorOpen(l,s,'night'),back);
  };
  check(true,false);
  for(const [id,front,back] of [['A',false,true],['B',true,false],['A',false,true],['B',true,false]]){
    assert(G.act(l,s,'switch',id));check(front,back);
  }
});
test('XOR提前改变开关会关闭前门，不能绕过屏障，撤销恢复通路',()=>{
  const l=ACADEMY_LEVELS[3],s=G.createState(l);bind(l,s,'B');
  assert(G.findPath(l,s,9,2));assert(G.act(l,s,'switch','A'));
  assert.equal(G.findPath(l,s,9,2),null);
  assert.equal(G.support(l,s,'night',5,1),null);assert.equal(G.support(l,s,'night',5,2),null);
  assert(G.act(l,s,'undo'));assert(G.findPath(l,s,9,2));
});
test('XOR门内关闭允许离开，但不能重新进入，撤销保留完整状态',()=>{
  const l=ACADEMY_LEVELS[3],s=G.createState(l);bind(l,s,'B');walk(l,s,5,2);
  assert(G.act(l,s,'switch','A'));assert.equal(G.support(l,s,'night',5,2),'floor');
  assert.equal(G.support(l,s,'night',5,1),null);
  assert(G.act(l,s,'move',[-1,0]));assert(!G.act(l,s,'move',[1,0]));
  assert.deepEqual([s.body.x,s.body.y],[4,2]);
  assert(G.act(l,s,'undo'));assert.deepEqual([s.body.x,s.body.y],[5,2]);
  assert.deepEqual(scienceResult(l,s).doors,{front:false,back:true});
  assert(G.act(l,s,'undo'));assert.deepEqual(scienceResult(l,s).doors,{front:true,back:false});
});
test('与非组合中间C与最终门Y分别正确，光门仍参与通行',()=>{
  const l=ACADEMY_LEVELS[4],s=G.createState(l);bind(l,s,'A');push(l,s,'LLRRR');
  assert.deepEqual([scienceResult(l,s).lessonOutput,scienceResult(l,s).output],[true,false]);
  G.act(l,s,'view','day');G.act(l,s,'mirror','M');
  assert.deepEqual([scienceResult(l,s).lessonOutput,scienceResult(l,s).output],[false,true]);
});
test('教学目标可组合两世界，实际门拒绝接收外世界输入',()=>{
  const l=ACADEMY_LEVELS[0],s=G.createState(l);bind(l,s,'A');push(l,s,'RRR');assert(scienceResult(l,s).output);
  const invalid=structuredClone(ACADEMY_LEVELS[1]);invalid.science.inputs[0].world='night';
  assert.throws(()=>scienceResult(invalid,G.createState(invalid)),/local inputs/);
});
for(const l of ACADEMY_LEVELS)test(l.id+' 全逻辑课程真实行走通关',()=>{
  const s=G.createState(l);
  if(l.id==='G3'||l.id==='G5'){G.act(l,s,'view','day');G.act(l,s,'mirror','M');G.act(l,s,'view','night');}
  if(l.id==='G4'){
    bind(l,s,'B');walk(l,s,9,2);G.act(l,s,'switch','A');
    portal(l,s,9,2);portal(l,s,12,4);bind(l,s,'C');walk(l,s,18,4);
  }else solve(l,s);
  assert(s.won);assert(!s.failed);
});
test('OR课程只使用B开关的替代解通关，不强制箱子路线',()=>{
  const l=ACADEMY_LEVELS[1],s=G.createState(l);G.act(l,s,'view','day');G.act(l,s,'switch','B');
  portal(l,s,3,3);portal(l,s,9,3);walk(l,s,10,3);assert(s.won);assert.equal(s.mapping,null);assert.equal(s.boxes.day,2);
});

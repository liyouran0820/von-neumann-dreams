import test from 'node:test';
import assert from 'node:assert/strict';
import { STOP_IMPACT_MS, stopImpactPose, VOID_FALL_MS, voidFallPose } from '../web/motion.js';
import * as G from '../web/engine.js';
import { ACADEMY_LEVELS } from '../web/academy-levels.js';
import { bind, push, portal, walk } from './helpers/walkthroughs.mjs';

test('止挡方向、压缩、回弹与精确结束符合动作标准',()=>{
 const compression=stopImpactPose(STOP_IMPACT_MS*.18,'right'),rebound=stopImpactPose(STOP_IMPACT_MS*.45,'right');
 assert(compression.x>0&&compression.scaleX<.9&&compression.flash>0);
 assert(rebound.x<0&&rebound.scaleX>1);
 for(let ms=0;ms<=STOP_IMPACT_MS;ms+=10){const r=stopImpactPose(ms,'right'),l=stopImpactPose(ms,'left');assert.equal(l.x+r.x,0);assert.equal(l.rotation+r.rotation,0);assert(Math.abs(r.x)<=.071);assert(r.scaleX>0&&r.scaleY>0);}
 const done=stopImpactPose(STOP_IMPACT_MS,'right');assert.deepEqual([done.active,done.x,done.rotation,done.scaleX,done.scaleY,done.flash],[false,0,0,1,1,0]);
});
test('虚空动作先失衡后加速下降、淡出且900ms内隐藏',()=>{
 const start=voidFallPose(0),balance=voidFallPose(140),early=voidFallPose(300),middle=voidFallPose(500),late=voidFallPose(700),done=voidFallPose(VOID_FALL_MS);
 assert.equal(start.y,0);assert.equal(start.opacity,1);assert(balance.roll>.15&&balance.armLift>.9&&Math.abs(balance.y)<.03);
 assert(early.y>middle.y&&middle.y>late.y);assert(middle.y-late.y>early.y-middle.y);assert(late.opacity<middle.opacity);
 assert(done.y<-5&&!done.active&&!done.visible&&done.opacity===0);
 const reduced=voidFallPose(0,true);assert(!reduced.active&&!reduced.visible&&reduced.opacity===0);
});
test('掉落是即时失败而非动画延迟，完整撤销恢复，预览与拒绝移动不掉落',()=>{
 const l=ACADEMY_LEVELS[2],s=G.createState(l);bind(l,s,'B');portal(l,s,3,3);walk(l,s,6,3);
 const before=structuredClone(s);assert(G.act(l,s,'unlink'));assert(s.failed&&!s.won);
 for(const [type,arg] of [['move',[1,0]],['push','right'],['teleport'],['activate']])assert.equal(G.act(l,s,type,arg),false);
 assert(G.act(l,s,'undo'));assert.deepEqual(s,before);
 assert(G.act(l,s,'unlink'));const cp=structuredClone(s.checkpoint);assert(G.act(l,s,'recover'));assert(!s.failed);assert.deepEqual(s.body,cp.body);assert.equal(s.mapping,cp.mapping);
 const safe=G.createState(l);portal(l,safe,3,3);walk(l,safe,5,3);assert(!G.act(l,safe,'move',[1,0]));assert(!safe.failed);G.select(l,safe,'B','night');assert(!safe.failed);bind(l,safe,'B');assert(G.act(l,safe,'unlink'));assert(!safe.failed);
});
test('减少动态只有静态提示，无位移旋转缩放',()=>{
 for(const direction of ['left','right'])for(const ms of [0,60,179]){const p=stopImpactPose(ms,direction,true);assert.deepEqual([p.active,p.x,p.rotation,p.scaleX,p.scaleY,p.flash,p.spread],[true,0,0,1,1,1,1]);}
 assert.equal(stopImpactPose(180,'right',true).active,false);
});
test('有效推动两侧独立受阻，非法方向不添加历史或复用撞击',()=>{
 const l=ACADEMY_LEVELS[0],s=G.createState(l);bind(l,s,'A');push(l,s,'R');assert(!s.feedback.night.blocked&&!s.feedback.day.blocked);
 push(l,s,'R');assert(s.feedback.night.blocked&&!s.feedback.day.blocked);
 push(l,s,'RRRR');assert(s.feedback.night.blocked&&s.feedback.day.blocked);
 push(l,s,'LLLLLL');assert(s.feedback.night.blocked&&s.feedback.day.blocked);
 // Independent valid rail positions also cover the opposite endpoint constraint.
 s.boxes={night:3,day:2};push(l,s,'L');assert(!s.feedback.night.blocked&&s.feedback.day.blocked);
 const history=s.history.length,boxes=structuredClone(s.boxes);
 for(const direction of ['up','down',undefined])assert.equal(G.act(l,s,'push',direction),false);
 assert.equal(s.history.length,history);assert.deepEqual(s.boxes,boxes);
 assert(G.act(l,s,'undo'));assert.deepEqual(s.boxes,{night:3,day:2});
});
test('单次推动到止挡即记录接触，已靠住也反馈，blocked仍只表示没有移动',()=>{
 const l=ACADEMY_LEVELS[0],s=G.createState(l);bind(l,s,'A');const history=s.history.length;
 assert(G.act(l,s,'push','right'));assert.equal(s.history.length,history+1);
 assert.deepEqual(s.feedback.night,{from:2,to:3,blocked:false,hitStop:true});assert.deepEqual(s.feedback.day,{from:2,to:3,blocked:false,hitStop:false});
 assert(G.act(l,s,'push','right'));assert(s.feedback.night.blocked&&s.feedback.night.hitStop);assert(!s.feedback.day.hitStop);
 s.boxes={night:3,day:3};assert(G.act(l,s,'push','left'));for(const w of ['night','day'])assert(s.feedback[w].hitStop&&!s.feedback[w].blocked);
 assert(G.act(l,s,'push','left'));for(const w of ['night','day'])assert(s.feedback[w].hitStop&&s.feedback[w].blocked);
 s.boxes={night:3,day:7};assert(G.act(l,s,'push','left'));assert(s.feedback.night.hitStop);assert(!s.feedback.day.hitStop&&!s.feedback.day.blocked);
});

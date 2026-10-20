import test from 'node:test';
import assert from 'node:assert/strict';
import { MIRROR_TURN_MS, mirrorTurnPose, mirrorBubbleYaw } from '../web/motion.js';

const left=-Math.PI/4,right=Math.PI/4;
test('镜面90度过渡有中间帧、无越界并在320ms精确结束',()=>{
 assert.equal(MIRROR_TURN_MS,320);
 for(const [from,to] of [[left,right],[right,left]]){
  assert.equal(mirrorTurnPose(0,from,to).angle,from);
  assert.equal(mirrorTurnPose(160,from,to).angle,0);
  let previous=from;
  for(let ms=0;ms<=320;ms+=8){const pose=mirrorTurnPose(ms,from,to);assert(pose.angle>=left&&pose.angle<=right);assert((pose.angle-previous)*(to-from)>=0);previous=pose.angle;}
  assert.deepEqual(mirrorTurnPose(320,from,to),{active:false,angle:to});
 }
});
test('从当前中间姿态反向过渡连续，减少动态立即到位',()=>{
 const current=mirrorTurnPose(96,left,right).angle;
 assert.equal(mirrorTurnPose(0,current,left).angle,current);
 assert.equal(mirrorTurnPose(320,current,left).angle,left);
 assert.deepEqual(mirrorTurnPose(0,current,right,true),{active:false,angle:right});
 assert.equal(mirrorTurnPose(0,left,left).active,false);
});
test('气泡同步转90度，整个弧线文字正面朝向等距镜头',()=>{
 assert(Math.abs(mirrorBubbleYaw(right)-mirrorBubbleYaw(left)-Math.PI/2)<1e-12);
 for(let ms=0;ms<=320;ms++){
  const panel=mirrorTurnPose(ms,left,right).angle,yaw=mirrorBubbleYaw(panel);
  // Rotating around world Y keeps text upright; positive normal dot means the
  // camera sees the texture front, without a UV flip or negative mesh scale.
  assert(-18*Math.sin(yaw)+28*Math.cos(yaw)>0);
  assert(yaw>=-Math.PI/2&&yaw<=0);
 }
});

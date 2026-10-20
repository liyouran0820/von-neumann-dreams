// Presentation only: these poses never change logical coordinates or history.
export const STOP_IMPACT_MS = 360;
export const VOID_FALL_MS = 900;
export const SCENE_TRANSITION_MS = 190;
export const MIRROR_TURN_MS = SCENE_TRANSITION_MS;
const clamp = value => Math.max(0, Math.min(1, value));
export function mirrorTurnPose(elapsed, from, to, reduced=false) {
 const t=reduced?1:clamp(elapsed/MIRROR_TURN_MS),e=1-Math.pow(1-t,3);
 return {active:!reduced&&from!==to&&elapsed>=0&&elapsed<MIRROR_TURN_MS,angle:from+(to-from)*e};
}
// Follow the panel's turn with a fixed offset. Both endpoints and the full arc
// face the isometric camera (-18,27,28), with upright, unmirrored texture UVs.
export const mirrorBubbleYaw = panelYaw => panelYaw-Math.PI/4;
function keyframe(t, points) {
 for (let i=1;i<points.length;i++) {
  const [end,b]=points[i], [start,a]=points[i-1];
  if(t<=end){const u=clamp((t-start)/(end-start)),e=u*u*(3-2*u);return a+(b-a)*e;}
 }
 return points.at(-1)[1];
}
export function stopImpactPose(elapsed,direction,reduced=false) {
 const duration=reduced?180:STOP_IMPACT_MS,t=clamp(elapsed/duration),active=elapsed>=0&&elapsed<duration;
 const neutral={active,x:0,rotation:0,scaleX:1,scaleY:1,flash:0,spread:1};
 if(!active)return neutral;
 if(reduced)return {...neutral,flash:1};
 const sign=direction==='left'?-1:1;
 const x=keyframe(t,[[0,0],[.18,.07],[.45,-.055],[.72,.017],[1,0]]);
 const scaleX=keyframe(t,[[0,1],[.18,.82],[.45,1.06],[.72,.97],[1,1]]);
 return {active,x:sign*x,rotation:-sign*x*1.3,scaleX,scaleY:1/Math.sqrt(scaleX),flash:1-t,spread:1+t*.8};
}
export function voidFallPose(elapsed,reduced=false) {
 const t=clamp(elapsed/VOID_FALL_MS),drop=clamp((elapsed-140)/(VOID_FALL_MS-140));
 const fade=clamp((t-.45)/.47),opacity=1-fade*fade*(3-2*fade);
 if(reduced)return {active:false,visible:false,y:-5.5,roll:0,pitch:0,scaleX:1,scaleY:1,armLift:0,opacity:0};
 return {active:elapsed<VOID_FALL_MS,visible:elapsed<VOID_FALL_MS&&opacity>.002,
  y:elapsed<=0?0:-.025*clamp(elapsed/140)-5.5*drop*drop,
  roll:keyframe(t,[[0,0],[.16,.2],[.5,-.25],[1,-.48]]),pitch:drop*.3,
  scaleX:1-drop*.1,scaleY:1+drop*.18,
  armLift:keyframe(t,[[0,0],[.16,1],[.6,.8],[1,.2]]),opacity};
}

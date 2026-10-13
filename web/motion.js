// Presentation only: these poses never change logical coordinates or history.
export const STOP_IMPACT_MS = 360;
const clamp = value => Math.max(0, Math.min(1, value));
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

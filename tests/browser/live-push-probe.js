import * as THREE from 'three';

// Capture the real app's render frames after actual button clicks, without
// replacing its clock, input handlers or animation scheduler.
const scenes={};let record=null,input=0;
function crateIn(world){return scenes[world]?.children.find(c=>c.type==='Group')?.children.find(c=>c.userData.pick?.kind==='object'&&c.userData.pick.id==='A');}
THREE.Scene.prototype.onBeforeRender=function(renderer){
 const world=renderer.domElement.parentElement.id==='day-scene'?'day':'night';scenes[world]=this;
 if(!record||record.world!==world)return;
 const crate=crateIn(world);if(!crate)return;const [rig,contact]=crate.children;
 record.samples.push({ms:performance.now()-record.start,x:crate.position.x,offset:rig.position.x,scaleX:rig.scale.x,contact:contact.visible});
};
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-push]');if(!button||button.disabled)return;
 const world=document.getElementById('day-world').classList.contains('is-focused')?'day':'night';
 const current={input:++input,world,direction:button.dataset.push,start:performance.now(),from:crateIn(world).position.x,samples:[]};record=current;
 document.getElementById('push-probe').textContent='采集本次单击的实际动画帧…';
 setTimeout(()=>{
  if(record!==current)return;record=null;
  const end=current.samples.at(-1),to=end.x,moved=Math.abs(to-current.from)>.001;
  const maxOffset=Math.max(...current.samples.map(s=>Math.abs(s.offset))),minScale=Math.min(...current.samples.map(s=>s.scaleX));
  const contact=current.samples.some(s=>s.contact),restored=!end.contact&&end.offset===0&&end.scaleX===1;
  const pass=moved?!contact&&maxOffset===0&&minScale===1:contact&&maxOffset>.05&&minScale<.9&&restored;
  const result={status:pass?'PASS':'FAIL',input:current.input,world,direction:current.direction,from:current.from,to,moved,contact,maxOffset,minScale,restored,frames:current.samples.length};
  document.getElementById('push-probe').textContent=JSON.stringify(result,null,2);
  document.getElementById('push-samples').textContent=JSON.stringify(current.samples);
 },650);
},true);
import('../../web/app.js');

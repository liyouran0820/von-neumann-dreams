// Observes actual production renders. No replacement of state, clocks or inputs.
import * as THREE from 'three';
const scenes={},renderers={},frames=[];let start=0,last=0,record=null;
THREE.Scene.prototype.onBeforeRender=function(renderer){const world=renderer.domElement.parentElement.id==='day-scene'?'day':'night';scenes[world]=this;renderers[world]=renderer;start=performance.now();};
THREE.Scene.prototype.onAfterRender=function(){const now=performance.now();frames.push({cpu:now-start,interval:last?now-last:0});last=now;if(record){const world=document.querySelector('.world.is-focused').id.startsWith('day')?'day':'night';const root=scenes[world]?.children.find(c=>c.type==='Group'),entity=root?.children.find(c=>c.userData.entityId===record.id);if(entity){const [rig,contact]=entity.children;record.frames.push({ms:now-record.at,x:entity.position.x,visible:entity.visible,offset:rig.position.x,scaleX:rig.scale.x,contact:contact.visible});}}if(frames.length>4096)frames.shift();};
const percentile=(values,p)=>{const a=values.filter(v=>v>0).sort((a,b)=>a-b);return a[Math.min(a.length-1,Math.floor(a.length*p))]||0;};
document.addEventListener('keydown',()=>{if(record&&!record.started){record.started=true;record.at=performance.now();}},true);
window.v2Probe={
 record(id){record={id,at:performance.now(),started:false,frames:[]};},finish(){const result=record;record=null;return result;},
 start(){frames.length=0;last=0;},
 summary(){const resources={};for(const world of Object.keys(scenes)){let objects=0;scenes[world].traverse(()=>objects++);resources[world]={objects,...renderers[world].info.memory,calls:renderers[world].info.render.calls};}return {frames:frames.length,cpuP95:percentile(frames.map(f=>f.cpu),.95),frameP95:percentile(frames.map(f=>f.interval),.95),resources};},
 poses(){const world=document.querySelector('.world.is-focused').id.startsWith('day')?'day':'night',result={};scenes[world]?.traverse(o=>{if(o.userData.entityId){const [rig,contact]=o.children;result[o.userData.entityId]={visible:o.visible,x:o.position.x,y:o.position.y,z:o.position.z,offset:rig.position.x,scaleX:rig.scale.x,contact:contact.visible};}if(o.userData.character)result.body={visible:o.visible,y:o.position.y,shadow:o.userData.shadow.visible};});return result;}
};
import('../../web/app.js');

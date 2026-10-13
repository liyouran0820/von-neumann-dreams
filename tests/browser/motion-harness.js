import * as THREE from 'three';
import { createDiorama } from '../../web/renderer.js';
import * as G from '../../web/engine.js';
import { ACADEMY_LEVELS } from '../../web/academy-levels.js';
import { verifyImpact } from './motion-checks.js';

// Test-only clock and scene capture; production exposes no debug state.
let now=0,id=0,frames=new Map(),level,state,view;
Object.defineProperty(performance,'now',{value:()=>now});
window.requestAnimationFrame=callback=>{frames.set(++id,callback);return id;};
window.cancelAnimationFrame=key=>frames.delete(key);
const scenes={};
THREE.Scene.prototype.onBeforeRender=function(renderer){scenes[renderer.domElement.parentElement.id]=this;};
const diorama=createDiorama({dayElement:document.getElementById('day'),nightElement:document.getElementById('night')});
function show(world){view=world;document.getElementById('day').hidden=world!=='day';document.getElementById('night').hidden=world!=='night';diorama.resize();diorama.setActiveWorld(world);}
function update(meta={}){diorama.update(state,meta);show(state.view);}
function step(ms){now+=ms;const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(now);}
function dispatch(type,arg){const accepted=G.act(level,state,type,arg);update({type:accepted?type:undefined,direction:arg});return accepted;}
function load(index=0,reduced=false){level=ACADEMY_LEVELS[index];state=G.createState(level);diorama.setReducedMotion(reduced);diorama.setLevel(level,state);show(state.view);step(0);}
function bind(id){const world=id==='A'?state.view:level.bridges.find(b=>b.id===id).world;G.select(level,state,id,world);update({type:'select'});return dispatch('activate');}
function walk(x,y){dispatch('view',{world:state.body.world,recordHistory:false});const path=G.findPath(level,state,x,y);if(!path)throw Error('No path');for(const move of path){dispatch('move',move);step(200);}}
function metrics(world=view){
 if(!scenes[world]){diorama.setActiveWorld(world);diorama.setActiveWorld(view);}
 const root=scenes[world]?.children.find(c=>c.type==='Group'),crate=root?.children.find(c=>c.userData.pick?.id==='A');
 const visual=crate?.children[0],contact=crate?.children[1];
 const player=root?.children.find(c=>c.userData.character);
 return {boxes:{...state.boxes},body:{...state.body},failed:state.failed,won:state.won,mapping:state.mapping,history:state.history.length,pendingFrames:frames.size,
  crate:crate&&{x:crate.position.x,offset:visual.position.x,rotation:visual.rotation.z,scale:visual.scale.toArray(),contact:contact.visible,contactX:contact.position.x,flash:contact.children[0].material.opacity},
  player:player&&{visible:player.visible,position:player.position.toArray(),rotation:player.rotation.toArray(),scale:player.scale.toArray(),opacity:player.userData.opacity??1,shadow:player.userData.shadow.visible}};
}
window.motionTest={load,dispatch,bind,walk,step,metrics,show,update,zoom:delta=>diorama.zoom(delta),boxes(value){state.boxes={...value};update({instant:true});},state:()=>structuredClone(state),reduce(value){diorama.setReducedMotion(value);}};
load();
document.getElementById('verify-impact').onclick=async()=>{const result=await verifyImpact(window.motionTest);document.getElementById('report').textContent=JSON.stringify(result,null,2);};
document.getElementById('case').onchange=event=>{
 const kind=event.target.value;load(0,kind==='reduced');bind('A');window.motionTest.boxes(kind==='day-left'?{night:3,day:2}:{night:3,day:7});
 dispatch('push',kind==='day-left'?'left':'right');step(kind==='rebound'?162:kind==='finish'?360:65);show(kind==='day-left'?'day':'night');
 document.getElementById('report').textContent=JSON.stringify(metrics(),null,2);
};

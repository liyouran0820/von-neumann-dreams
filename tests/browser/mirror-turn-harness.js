import * as THREE from 'three';
import { createDiorama } from '../../web/renderer.js';
import * as G from '../../web/engine.js';
import { V2_LEVELS } from '../../web/levels-v2.js';
import { OPTICS_LEVELS } from '../../web/optics-levels.js';

// Test-only deterministic clock. Production scenes, commands and renderer are
// used unchanged; the report reads rendered transforms, UVs and projected targets.
let now=0,serial=0,frames=new Map(),level,state;
const scenes={},cameras={},renderers={},anchors={};
Object.defineProperty(performance,'now',{value:()=>now});
window.requestAnimationFrame=callback=>{frames.set(++serial,callback);return serial;};
window.cancelAnimationFrame=id=>frames.delete(id);
THREE.Scene.prototype.onBeforeRender=function(renderer,scene,camera){const world=renderer.domElement.parentElement.id;scenes[world]=this;cameras[world]=camera;renderers[world]=renderer;};
const diorama=createDiorama({dayElement:document.getElementById('day'),nightElement:document.getElementById('night'),onProject:(world,items)=>anchors[world]=items});
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const near=(a,b)=>Math.abs(a-b)<1e-8;
function step(ms){now+=ms;const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(now);}
function load(legacy=false,reduced=false){level=legacy?OPTICS_LEVELS.find(l=>l.science?.mirrors?.length):V2_LEVELS[11];state=G.createState(level);diorama.setReducedMotion(reduced);diorama.setLevel(level,state);step(0);return snapshot();}
function act(type,arg){assert(G.act(level,state,type,arg),'command rejected: '+type);diorama.update(state,{type,direction:arg,instant:type==='view'});diorama.setActiveWorld(state.view);return snapshot();}
function snapshot(){
 const result={time:now,pending:frames.size,logical:structuredClone(state.science.mirrors),signals:G.scienceResult(level,state).signals,worlds:{}};
 for(const world of ['day','night']){
  diorama.setActiveWorld(world);const scene=scenes[world],camera=cameras[world],panels=[],bubbles=[];
  scene.traverse(o=>{
   if(o.type==='Group'&&o.userData.pick?.kind==='mirror')panels.push({id:o.userData.pick.id,yaw:o.rotation.y});
   if(o.userData.worldLabel?.kind==='mirror'){
    const normal=new THREE.Vector3(0,0,1).transformDirection(o.matrixWorld),up=new THREE.Vector3(0,1,0).transformDirection(o.matrixWorld),center=o.getWorldPosition(new THREE.Vector3()).project(camera);
    const target=anchors[world].find(a=>a.kind==='mirror'&&a.id===o.userData.worldLabel.id).worldTarget;
    const rect=renderers[world].domElement.getBoundingClientRect();
    const p={x:(center.x+1)*rect.width/2,y:(1-center.y)*rect.height/2};
    bubbles.push({id:o.userData.worldLabel.id,yaw:o.rotation.y,front:normal.x*camera.position.x+normal.z*camera.position.z,up:up.toArray(),scale:o.scale.toArray(),uv:Array.from(o.geometry.attributes.uv.array),center:p,target});
   }
  });
  result.worlds[world]={panels,bubbles,memory:{...renderers[world].info.memory}};
 }
 diorama.setActiveWorld(state.view);return result;
}
function check(sample){
 for(const world of Object.values(sample.worlds))for(const bubble of world.bubbles){
  const panel=world.panels.find(p=>p.id===bubble.id);
  assert(near(panel.yaw-bubble.yaw,Math.PI/4),'bubble detached from panel turn');
  assert(bubble.front>0&&near(bubble.up[1],1)&&bubble.scale.every(v=>v>0),'backwards or inverted text');
  assert(bubble.uv.join(',')==='0,1,1,1,0,0,1,0','mirrored texture UV');
  assert(near(bubble.center.x,bubble.target.x)&&near(bubble.center.y,bubble.target.y),'click target detached');
  assert(bubble.target.width>=44&&bubble.target.height>=44,'small click target');
 }
}
const panel=(s,id,world='night')=>s.worlds[world].panels.find(p=>p.id===id).yaw;
function verify(){
 const report={status:'PASS',samples:{}};
 for(const legacy of [false,true]){
  const initial=load(legacy),world=legacy?level.science.world:'night',id=legacy?level.science.mirrors[0].id:'M1';
  if(state.view!==world)act('view',{world,recordHistory:false});
  const before=snapshot(),start=act('mirror',id),samples=[start];
  assert(near(panel(start,id,world),panel(before,id,world)),'mirror jumped at input');
  assert(start.logical[id]!==before.logical[id],'logical mirror did not update immediately');
  assert(JSON.stringify(start.signals)!==JSON.stringify(before.signals),'circuit waited for animation');
  for(const ms of [64,96,96,64]){step(ms);samples.push(snapshot());}
  samples.forEach(check);
  const end=samples.at(-1),target=state.science.mirrors[id]==='/'?Math.PI/4:-Math.PI/4;
  assert(near(panel(end,id,world),target),'wrong final orientation');
  assert(!near(panel(samples[2],id,world),target)&&!near(panel(samples[2],id,world),panel(before,id,world)),'missing middle frame');
  report.samples[legacy?'legacy':'v2']={initial,before,frames:samples};
 }
 load();act('mirror','M1');step(90);const a=snapshot(),b=act('mirror','M1');assert(near(panel(a,'M1'),panel(b,'M1')),'rapid reversal jumped');
 step(70);const c=snapshot(),d=act('mirror','M1');assert(near(panel(c,'M1'),panel(d,'M1')),'second reversal jumped');
 step(120);const e=snapshot(),f=act('undo');assert(near(panel(e,'M1'),panel(f,'M1')),'undo jumped');
 step(320);const undo=snapshot();check(undo);assert(near(panel(undo,'M1'),state.science.mirrors.M1==='/'?Math.PI/4:-Math.PI/4),'undo stuck mid-turn');
 report.samples.interrupt={a,b,c,d,e,f,undo};
 act('mirror','M1');step(60);act('view',{world:'day',recordHistory:false});diorama.zoom(.12);step(260);act('view',{world:'night',recordHistory:false});const observed=snapshot();check(observed);assert(near(panel(observed,'M1'),state.science.mirrors.M1==='/'?Math.PI/4:-Math.PI/4),'observation interrupted turn');
 act('mirror','M1');step(80);diorama.setReducedMotion(true);const reduced=snapshot();check(reduced);assert(near(panel(reduced,'M1'),state.science.mirrors.M1==='/'?Math.PI/4:-Math.PI/4),'reduced motion did not settle');
 act('mirror','M1');const reducedInput=snapshot();assert(near(panel(reducedInput,'M1'),state.science.mirrors.M1==='/'?Math.PI/4:-Math.PI/4),'reduced input animated');
 load();act('mirror','M1');step(60);const reloaded=load();check(reloaded);assert(reloaded.pending===0,'old animation survived load');
 report.samples.lifecycle={observed,reduced,reducedInput,reloaded};
 for(let i=0;i<4;i++){act('mirror','M1');step(320);}const warm=snapshot();
 for(let i=0;i<20;i++){act('mirror','M1');step(320);}const repeated=snapshot();
 for(const w of ['day','night'])assert(JSON.stringify(warm.worlds[w].memory)===JSON.stringify(repeated.worlds[w].memory),'rotation leaked GPU resources');
 report.samples.memory={warm,repeated};return report;
}
document.getElementById('verify-turn').onclick=()=>{try{document.getElementById('report').textContent=JSON.stringify(verify());}catch(error){document.getElementById('report').textContent=JSON.stringify({status:'FAIL',error:error.message,scene:snapshot()});}};
const cases={start:0,quarter:80,middle:160,finish:320};
document.getElementById('case').onchange=event=>{load();diorama.zoom(.65);act('mirror','M1');step(cases[event.target.value]);document.getElementById('report').textContent=JSON.stringify(snapshot());};
window.addEventListener('pagehide',()=>diorama.dispose());load();

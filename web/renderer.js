import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { doorOpen, bridgeActive } from './engine.js';
import { entitySpec, entityAt } from './entities.js';
import { scienceResult } from './science.js';
import { stopImpactPose, voidFallPose, VOID_FALL_MS } from './motion.js';
import { createSurfaceMarkings } from './surface-markings.js';

// Logical coordinates map directly to X/Z; the walkable surface is Y=0.
// White stone stays neutral under soft light; cooler edges separate walls and paths.
const PALETTE={day:{background:0xdde1df,stone:0xf5f4ef,edge:0xa4afb0,wall:0xd9dfdf,pit:0x596a73,ground:0xdde1df},night:{background:0x3d4a59,stone:0x647481,edge:0x465866,wall:0x71808b,pit:0x202e3a,ground:0x3d4a59}};
const CYAN=0x7bddf4,GOLD=0xf2cd61;
const inside=(x,y,b)=>x>=b.x[0]&&x<=b.x[1]&&y>=b.y[0]&&y<=b.y[1];
export function createDiorama({dayElement,nightElement,onPick=()=>{},onProject=()=>{},onError=()=>{}}){
 let level=null,state=null,activeWorld='night',reduced=false,zoomFactor=1,raf=0,animationStart=0,disposed=false,lastFailed=false;
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),scenes=[],geometries=new Map(),markings=createSurfaceMarkings();
 const geo=(x,y,z,r=.025)=>{const k=[x,y,z,r].join(':');if(!geometries.has(k))geometries.set(k,new RoundedBoxGeometry(x,y,z,2,Math.min(r,x/3,y/3,z/3)));return geometries.get(k);};
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.87,metalness:0,...extra});
 function box(parent,x,y,z,w,h,d,material,r=.025){const m=new THREE.Mesh(geo(w,h,d,r),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function ring(parent,x,y,z,r,color){const m=new THREE.Mesh(new THREE.TorusGeometry(r,.018,6,40),mat(color,{emissive:color,emissiveIntensity:.15}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);parent.add(m);return m;}
 function ownMaterials(group){const set=new Set();group.traverse(o=>{if(o.material)for(const m of [].concat(o.material))set.add(m);});return [...set];}
 function clean(group){group.traverse(o=>{if(o.geometry&&! [...geometries.values()].includes(o.geometry))o.geometry.dispose();});for(const m of ownMaterials(group))m.dispose();group.clear();}
 function pick(v,event){if(event.target.closest('button')||!level||disposed)return;const rect=v.host.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,v.camera);const hits=raycaster.intersectObjects(v.pickables,true);for(const hit of hits){let obj=hit.object;while(obj&&!obj.userData.pick)obj=obj.parent;if(obj?.userData.bridgeId&&state.mapping!==obj.userData.bridgeId)continue;if(obj?.userData.pick){const data=obj.userData.pick;onPick({world:v.world,...data});break;}}}
 try{
 for(const [world,host] of [['day',dayElement],['night',nightElement]]){
  const p=PALETTE[world],scene=new THREE.Scene();scene.background=null;
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=world==='day'?.9:.98;renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:manipulation';renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
  const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,160);camera.position.set(-18,27,28);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  scene.add(new THREE.HemisphereLight(world==='day'?0xfffefa:0xb6d5ff,world==='day'?0x879296:0x172439,world==='day'?1.25:1.4));
  const sun=new THREE.DirectionalLight(world==='day'?0xfffdf8:0xc7deff,world==='day'?1.7:1.5);sun.position.set(-8,18,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun);scene.add(sun.target);
  const bounce=new THREE.DirectionalLight(world==='day'?0xe7eff3:0x4a76bd,.35);bounce.position.set(10,6,-8);scene.add(bounce);
  const root=new THREE.Group();scene.add(root);const v={world,host,scene,renderer,camera,sun,root,pickables:[],dynamic:[],anchors:[],width:1,height:1,materials:[],player:null,crate:null,bridges:[],doors:[],targets:[],lastBody:null};
  v.click=e=>pick(v,e);host.addEventListener('click',v.click);scenes.push(v);
 }
 }catch(error){for(const v of scenes)v.renderer.dispose();onError(error);throw error;}
 function patch(v,obj,to){const from={x:obj.position.x,y:obj.position.y,z:obj.position.z,opacity:obj.userData.opacity??1};v.dynamic.push({obj,from,to});}
 function opacity(group,value){group.userData.opacity=value;group.visible=value>.002;group.traverse(o=>{if(o.material){o.material.transparent=value<.999||o.userData.glass===true||!!o.userData.surfaceMark;o.material.opacity=value*(o.userData.baseOpacity??1);}});}
 function crateMark(parent,label,{ghost=false,screen=false,height=.6}={}){
  const finish=ghost?'ghost':'stone';
  markings.stamp(parent,label,{position:[0,screen?1.05:height/2,screen?.082:.282],width:screen?.5:.44,height:screen?.5:.44,face:'front',finish});
  if(!screen)markings.stamp(parent,label,{position:[0,height+.002,0],width:.44,finish});
 }
 function recessedPlate(v,x,z,label,material,size=.7){
  const g=new THREE.Group(),rim=.08,well=size-2*rim;g.position.set(x,0,z);
  box(g,0,.017,0,size,.034,size,material,.012);
  for(const sign of [-1,1]){
   box(g,0,.047,sign*(size-rim)/2,size,.06,rim,material,.01);
   box(g,sign*(size-rim)/2,.047,0,rim,.06,well,material,.01);
  }
  markings.stamp(g,label,{position:[0,.035,0],width:well*.78,finish:'gold'});
  g.userData.recess={label,size,well,rim};v.root.add(g);return g;
 }
 function impactDecoration(v,parent){
  const g=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:v.world==='day'?0x996611:GOLD,transparent:true,opacity:0,depthWrite:false,depthTest:false});
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.28,.026,6,32),material);halo.rotation.y=Math.PI/2;halo.renderOrder=10;g.add(halo);
  for(let i=0;i<5;i++){const angle=i*Math.PI*2/5,spark=box(g,0,Math.cos(angle)*.42,Math.sin(angle)*.42,.028,.2,.028,material,.003);spark.rotation.x=angle;spark.castShadow=false;spark.renderOrder=10;}
  g.visible=false;parent.add(g);return g;
 }
 function applyImpact(v,now){
  if(!v.crateVisual)return false;
  const vertical=['up','down'].includes(v.impact?.direction),direction=v.impact?.direction==='up'?'left':v.impact?.direction==='down'?'right':v.impact?.direction;
  // RAF timestamps may precede an input received later in that same frame.
  // Keep a newly started impact alive until its first elapsed frame.
  const pose=stopImpactPose(v.impact?Math.max(0,now-v.impact.startedAt):-1,direction,reduced);
  v.crateVisual.position.set(vertical?0:pose.x,0,vertical?pose.x:0);v.crateVisual.rotation.set(vertical?-pose.rotation:0,0,vertical?0:pose.rotation);v.crateVisual.scale.set(vertical?1:pose.scaleX,pose.scaleY,vertical?pose.scaleX:1);
  v.impactDecoration.rotation.y=vertical?Math.PI/2:0;
  v.impactDecoration.position.set(vertical?0:direction==='left'?-.32:.32,.4,vertical?(direction==='left'?-.32:.32):0);
  v.impactDecoration.scale.setScalar(pose.spread);v.impactDecoration.visible=pose.active;
  for(const m of ownMaterials(v.impactDecoration))m.opacity=pose.flash;
  for(const spark of v.impactDecoration.children.slice(1))spark.visible=!reduced;
  if(!pose.active)v.impact=null;
  return pose.active;
 }
 function character(v){
  const g=new THREE.Group(),rig=new THREE.Group(),cream=mat(0xf0eee4),shade=mat(0xc2c6bf);g.add(rig);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.15,16,12),cream);head.position.y=.62;head.castShadow=true;rig.add(head);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.25,5,12),cream);body.position.y=.32;body.castShadow=true;rig.add(body);
  box(rig,-.065,.065,.01,.085,.13,.13,shade);box(rig,.065,.065,.01,.085,.13,.13,shade);
  const arms=[];for(const sign of [-1,1]){const pivot=new THREE.Group();pivot.position.set(sign*.15,.44,0);pivot.rotation.z=sign*.12;const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.04,.17,4,8),cream);arm.position.y=-.1;arm.castShadow=true;pivot.add(arm);rig.add(pivot);arms.push(pivot);}
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.21,24),new THREE.MeshBasicMaterial({color:0x101724,transparent:true,opacity:.2,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;shadow.userData.baseOpacity=.2;g.add(shadow);
  g.userData={character:true,rig,arms,shadow};v.root.add(g);return g;
 }
 function resetPlayer(v){
  const {rig,arms,shadow}=v.player.userData;rig.rotation.set(0,0,0);rig.scale.set(1,1,1);
  arms.forEach((arm,i)=>arm.rotation.z=(i===0?-1:1)*.12);opacity(v.player,1);shadow.visible=true;
 }
 function applyFall(v,now){
  if(!v.fall)return false;
  const pose=voidFallPose(v.fall.finished?VOID_FALL_MS:now-v.fall.startedAt,reduced),{rig,arms,shadow}=v.player.userData;
  v.player.position.set(v.fall.x,pose.y,v.fall.z);rig.rotation.set(pose.pitch,0,pose.roll);rig.scale.set(pose.scaleX,pose.scaleY,1);
  arms.forEach((arm,i)=>arm.rotation.z=(i===0?-1:1)*(.12+pose.armLift*1.15));
  opacity(v.player,pose.opacity);v.player.visible=state.body.world===v.world&&pose.visible;shadow.visible=false;
  if(!pose.active)v.fall.finished=true;
  return pose.active;
 }
 function bridgeGroup(v,b,ghost){const g=new THREE.Group(),p=PALETTE[v.world],w=b.x[1]-b.x[0]+1,d=b.y[1]-b.y[0]+1;g.position.set((b.x[0]+b.x[1])/2,0,(b.y[0]+b.y[1])/2);const surface=mat(ghost?0x65bcd3:p.stone,ghost?{emissive:0x267b99,emissiveIntensity:.35}:{});box(g,0,-.13,0,w-.035,.26,d-.035,surface,.035);const edge=mat(ghost?CYAN:p.edge,{emissive:ghost?CYAN:0,emissiveIntensity:ghost?.3:0});for(const z of [-d/2+.035,d/2-.035])box(g,0,.012,z,w-.06,.025,.025,edge,.006);if(b.label!==false)markings.stamp(g,b.label||b.id,{position:[0,.002,0],width:Math.min(.72,w-.2),height:Math.min(.58,d-.2),finish:ghost?'ghost':'stone'});if(!ghost)g.userData.pick={kind:'object',id:b.id,x:Math.round((b.x[0]+b.x[1])/2),y:Math.round((b.y[0]+b.y[1])/2)};v.root.add(g);if(!ghost)v.pickables.push(g);return g;}
 function previewBridge(v,b){const g=new THREE.Group(),color=new THREE.LineDashedMaterial({color:CYAN,dashSize:.13,gapSize:.1,transparent:true,opacity:.8});const x1=b.x[0]-.47,x2=b.x[1]+.47,z1=b.y[0]-.47,z2=b.y[1]+.47;const points=[new THREE.Vector3(x1,.035,z1),new THREE.Vector3(x2,.035,z1),new THREE.Vector3(x2,.035,z2),new THREE.Vector3(x1,.035,z2),new THREE.Vector3(x1,.035,z1)];const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),color);line.computeLineDistances();g.add(line);v.root.add(g);g.visible=false;return g;}
 function beam(parent,from,to,color,radius=.023,height=.65){
  const a=new THREE.Vector3(from[0],height,from[1]),b=new THREE.Vector3(to[0],height,to[1]);
  const d=b.clone().sub(a);if(d.length()<.001)return;
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,d.length(),8),new THREE.MeshBasicMaterial({color}));
  mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(mesh);
 }
 function buildScience(v){
  v.instruments=[];v.beams=null;v.scienceSignature='';
  const config=level.science;if(!config||config.world!==v.world)return;
  const stone=mat(PALETTE[v.world].edge);
  for(const door of config.doors||[]){
   const cell=[door.cells.reduce((n,c)=>n+c[0],0)/door.cells.length,door.cells.reduce((n,c)=>n+c[1],0)/door.cells.length];
   v.anchors.push({kind:'readout',id:'door-'+door.id,label:door.label,cell,height:1.2});
  }
  for(const emitter of config.emitters||[]){
   const [x,z]=emitter.cell;box(v.root,x,.22,z,.42,.44,.42,stone);
   box(v.root,x,.59,z,.58,.24,.28,mat(0xa88d59));ring(v.root,x,.73,z,.16,GOLD);
   v.anchors.push({kind:'readout',id:'light',label:'光源',cell:[x,z],height:1.05});
  }
  for(const mirror of config.mirrors||[]){
   const [x,z]=mirror.cell;box(v.root,x,.12,z,.58,.24,.58,stone,.05);box(v.root,x,.42,z,.1,.64,.1,stone);
   const face=new THREE.Group();face.position.set(x,.65,z);
   box(face,0,0,0,.86,.68,.08,mat(0xbadbe2,{roughness:.16,metalness:.5}),.02);
   box(face,0,.36,0,.94,.055,.12,mat(0x967b45),.009);box(face,0,-.36,0,.94,.055,.12,mat(0x967b45),.009);
   face.userData.pick={kind:'mirror',id:mirror.id};v.pickables.push(face);
   v.root.add(face);v.instruments.push({kind:'mirror',id:mirror.id,face,cell:mirror.cell});
   v.anchors.push({kind:'mirror',id:mirror.id,cell:mirror.cell,height:.98});
  }
  for(const sensor of config.sensors||[]){
   const [x,z]=sensor.cell;box(v.root,x,.16,z,.52,.32,.52,stone,.04);
   const lens=mat(0x6b8590,{emissive:0x14363d,emissiveIntensity:.15});box(v.root,x,.56,z,.28,.48,.28,lens,.07);
   v.instruments.push({kind:'sensor',id:sensor.id,lens});v.anchors.push({kind:'sensor',id:sensor.id,label:sensor.label,cell:sensor.cell,height:1.03});
  }
  for(const input of config.inputs.filter(i=>i.type==='switch')){
   const [x,z]=input.cell;box(v.root,x,.16,z,.48,.32,.48,stone,.04);
   const lens=mat(GOLD,{emissive:GOLD,emissiveIntensity:.2});const cap=box(v.root,x,.44,z,.26,.3,.26,lens,.06);
   cap.userData.pick={kind:'switch',id:input.id};v.pickables.push(cap);
   v.instruments.push({kind:'switch',id:input.id,lens});v.anchors.push({kind:'switch',id:input.id,cell:input.cell,height:.93});
  }
  v.beams=new THREE.Group();v.root.add(v.beams);
 }
 function updateScience(v){
  if(!v.beams)return;
  const result=scienceResult(level,state),signature=JSON.stringify([state.science,result.signals]);
  if(signature===v.scienceSignature)return;v.scienceSignature=signature;clean(v.beams);
  for(const item of v.instruments){
   if(item.kind==='mirror'){
    const slash=state.science.mirrors[item.id]==='/';item.face.rotation.y=slash?Math.PI/4:-Math.PI/4;
    if(!level.science.lessonGate){
     const [x,z]=item.cell,sign=slash?1:-1;
     const points=[new THREE.Vector3(x-.7,.66,z-.7*sign),new THREE.Vector3(x+.7,.66,z+.7*sign)];
     const normal=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:0x457b8c,dashSize:.08,gapSize:.055}));normal.computeLineDistances();v.beams.add(normal);
    }
   }else{
    const on=item.kind==='sensor'?result.optics.hits.includes(item.id):result.signals[item.id];
    item.lens.color.setHex(on?0x55c6c0:0x6b7883);item.lens.emissive.setHex(on?0x24adab:0x101d23);item.lens.emissiveIntensity=on?.7:.05;
   }
  }
  for(const line of result.optics.segments){beam(v.beams,line.from,line.to,0x99723d,.044);beam(v.beams,line.from,line.to,0xffd278,.022,.657);}
 }
 function build(v){
 clean(v.root);v.pickables=[];v.dynamic=[];v.anchors=[];v.bridges=[];v.doors=[];v.targets=[];v.player=null;v.fall=null;v.crate=null;v.crateVisual=null;v.impact=null;v.impactDecoration=null;
 v.newEntities=[];v.newSupports=[];v.newPlates=[];
 const p=PALETTE[v.world],rows=level.grids[v.world],W=rows[0].length,H=rows.length;v.root.position.set(-(W-1)/2,0,-(H-1)/2);
 const marker=v.world==='day'?0xa67c29:GOLD;
 const stone=mat(p.stone),edge=mat(p.edge),wall=mat(p.wall),pit=mat(p.pit),glass=mat(v.world==='day'?0x9dc8cd:0x719db7,{transparent:true,opacity:.4,roughness:.24,depthWrite:false}),gold=mat(marker,{emissive:marker,emissiveIntensity:.12}),track=mat(v.world==='day'?0xc3cdd0:0x303e55);
 // Background receives the cast shadow; it remains well below every pit.
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.ShadowMaterial({color:v.world==='day'?0x34484e:0x061629,opacity:v.world==='day'?.18:.3}));ground.rotation.x=-Math.PI/2;ground.position.set((W-1)/2,-1.65,(H-1)/2);ground.receiveShadow=true;v.root.add(ground);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const t=rows[y][x],b=level.bridges.find(b=>inside(x,y,b)),chasm=t==='~'||'bc'.includes(t)||(t==='E'&&level.id==='G5');
  if(level.schemaVersion===2&&t===' ')continue;
  if(chasm){box(v.root,x,-1.52,y,.998,.12,.998,pit,.005);}else{
   const floor=box(v.root,x,-.29,y,.996,.58,.996,stone,.014);floor.userData.pick={kind:'cell',x,y};v.pickables.push(floor);
   // One continuous dark lower course gives the diorama its substantial edge.
   box(v.root,x,-.82,y,.998,.49,.998,edge,.016);
  }
  if(t==='#'){
   const outer=x===0||y===0||x===W-1||y===H-1;
   // Boundary walls use narrow parapets instead of obscuring the entire edge cell.
   const w=level.schemaVersion===2?.15:outer&&(x===0||x===W-1)?.2:.96,d=outer&&(y===0||y===H-1)?.2:.96,h=outer?.55:1.04;
   const mesh=box(v.root,x,h/2,y,w,h,d,wall,.035);mesh.userData.pick={kind:'cell',x,y};v.pickables.push(mesh);
   if(outer&&((x===0||x===W-1)&&(y===0||y===H-1)))box(v.root,x,.37,y,.3,.74,.3,stone,.025);
  }
  if(t==='='){const m=box(v.root,x,.27,y,.995,.54,.06,glass,.008);m.userData.glass=true;m.castShadow=false;if(x===1||x===W-2||x%4===0)box(v.root,x,.29,y,.08,.58,.11,wall,.015);box(v.root,x,.56,y,.997,.035,.07,edge,.006);}
  if('At-'.includes(t)){box(v.root,x,.015,y,.76,.027,.66,track,.02);for(const z of [-.23,.23])box(v.root,x,.033,y+z,.985,.018,.022,edge,.004);}
  if(t==='D'){const g=new THREE.Group();g.position.set(x,0,y);box(g,0,.5,0,.28,1,.98,wall,.03);box(g,-.15,.52,0,.025,.76,.035,mat(CYAN,{emissive:CYAN,emissiveIntensity:.3}),.004);g.userData.pick={kind:'cell',x,y};v.root.add(g);v.pickables.push(g);v.doors.push(g);}
  if('12'.includes(t)){
   ring(v.root,x,.025,y,.35,v.world==='day'?GOLD:CYAN);
   // A small vertical portal marker leaves the floor and occupant visible.
   box(v.root,x-.33,.42,y-.31,.12,.84,.12,wall);box(v.root,x+.33,.42,y-.31,.12,.84,.12,wall);box(v.root,x,.86,y-.31,.78,.1,.14,wall);box(v.root,x,.4,y-.32,.026,.6,.024,mat(v.world==='day'?GOLD:CYAN,{emissive:v.world==='day'?GOLD:CYAN,emissiveIntensity:.6}),.004);
   v.anchors.push({kind:'portal',id:'P'+t,cell:[x,y],height:.25});
  }
 }
 if(level.track){const x=state.boxes[v.world],y=level.track.y;const g=new THREE.Group(),visual=new THREE.Group();g.position.set(x,0,y);g.add(visual);const crate=mat(v.world==='day'?0xb5aa8b:0x9ba9ad);box(visual,0,.31,0,.56,.62,.56,crate,.035);box(visual,-.288,.3,0,.02,.4,.075,gold,.004);crateMark(visual,'A',{height:.62});g.userData.pick={kind:'object',id:'A',x,y};v.root.add(g);v.pickables.push(g);v.crate=g;v.crateVisual=visual;v.impactDecoration=impactDecoration(v,g);
  const tx=level.track.targets[v.world];if(tx!==undefined){const input=level.science?.inputs.find(i=>i.type==='plate'&&(i.world||level.science.world)===v.world&&i.x===tx);const target=recessedPlate(v,tx,y,input?.id||'A',gold,.76);v.targets.push(target);}
 }
 for(const b of level.bridges){if(b.world===v.world){bridgeGroup(v,b,false);v.anchors.push({kind:'object',id:b.id,cell:[(b.x[0]+b.x[1])/2,(b.y[0]+b.y[1])/2],height:.05});}else{
  const g=bridgeGroup(v,b,true),preview=previewBridge(v,b),stripes=new THREE.Group();stripes.position.copy(g.position);
  const stripeMat=mat(0xf2cd61,{transparent:true,opacity:.8});for(let i=-2;i<=2;i++){const stripe=box(stripes,i*.35,.035,0,.025,.016,1.7,stripeMat,.003);stripe.rotation.y=-.55;}v.root.add(stripes);stripes.visible=false;v.bridges.push({id:b.id,g,preview,stripes,b});opacity(g,0);
  // Invisible picking surfaces are enabled only with the current active support.
  for(let y=b.y[0];y<=b.y[1];y++)for(let x=b.x[0];x<=b.x[1];x++){const m=new THREE.Mesh(new THREE.PlaneGeometry(.99,.99),new THREE.MeshBasicMaterial({visible:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.02,y);m.userData.pick={kind:'cell',x,y};m.userData.bridgeId=b.id;v.root.add(m);v.pickables.push(m);}
 }}
 if(v.world==='night'){
  const cells=level.exit,midY=cells.reduce((a,c)=>a+c[1],0)/cells.length,x=cells[0][0],depth=cells.length>1?2:.85;const goldLight=mat(GOLD,{emissive:GOLD,emissiveIntensity:.4});for(const z of [midY-depth/2,midY+depth/2]){box(v.root,x,.45,z,.07,.9,.07,wall,.015);box(v.root,x,.47,z,.026,.8,.026,goldLight,.004);}const lintel=box(v.root,x,.94,midY,.035,.025,depth,goldLight,.004);lintel.castShadow=false;v.anchors.push({kind:'exit',cell:[x,midY],height:.2});
 }
 if(level.schemaVersion===2)buildEntities(v);else buildScience(v);v.player=character(v);
 const extent=Math.max(W,H);Object.assign(v.sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:1,far:60});v.sun.shadow.camera.updateProjectionMatrix();
 }
 function anchors(v){const result=v.anchors.map(a=>({...a}));if(v.crate)result.push({kind:'object',id:'A',cell:[v.crate.position.x,level.track.y],height:.67});for(const e of v.newEntities||[]){if(!e.spec.ghost&&e.spec.group)result.push({kind:'object',id:e.spec.group,cell:[e.g.position.x,e.g.position.z],height:e.spec.height+.1});}return result.map(a=>{const p=new THREE.Vector3(a.cell[0],a.height,a.cell[1]);v.root.localToWorld(p);p.project(v.camera);return {kind:a.kind,...(a.id?{id:a.id}:{}),...(a.label?{label:a.label}:{}),...(a.signal?{signal:a.signal}:{}),cell:a.cell,x:(p.x+1)*v.width/2,y:(1-p.y)*v.height/2};});}
 function draw(){if(disposed||!level||document.hidden)return;for(const v of scenes){if(v.world===activeWorld)v.renderer.render(v.scene,v.camera);onProject(v.world,anchors(v));}}
 function frame(now){
  raf=0;if(disposed||document.hidden)return;
  const t=reduced?1:Math.min(1,(now-animationStart)/190),e=1-Math.pow(1-t,3);let running=false;
  for(const v of scenes){
   for(const a of v.dynamic){a.obj.position.set(THREE.MathUtils.lerp(a.from.x,a.to.x??a.from.x,e),THREE.MathUtils.lerp(a.from.y,a.to.y??a.from.y,e),THREE.MathUtils.lerp(a.from.z,a.to.z??a.from.z,e));if(a.to.opacity!==undefined)opacity(a.obj,THREE.MathUtils.lerp(a.from.opacity,a.to.opacity,e));}
   if(t>=1)v.dynamic=[];else if(v.dynamic.length)running=true;
   if(applyImpact(v,now))running=true;
   for(const entity of v.newEntities||[]){if(applyImpact(entity,now))running=true;if(entity.fall!==null){const pose=voidFallPose(now-entity.fall,reduced);entity.g.position.y=pose.y;opacity(entity.g,pose.opacity);if(pose.active)running=true;}}
   if(applyFall(v,now))running=true;
  }
  draw();if(running)raf=requestAnimationFrame(frame);
 }
 function update(next,{type,direction,instant=false}={}){
  if(!level||disposed)return;state=next;if(raf){cancelAnimationFrame(raf);raf=0;}
  const bodyFalling=state.failed&&(level.schemaVersion!==2||state.fallen.includes('body'));
  for(const v of scenes){v.dynamic=[];const body=state.body;
   if(!bodyFalling){v.fall=null;resetPlayer(v);v.player.visible=body.world===v.world;patch(v,v.player,{x:body.x,y:0,z:body.y});}
   else if(!lastFailed&&body.world===v.world){v.fall={startedAt:performance.now(),x:body.x,z:body.y,finished:false};applyFall(v,performance.now());}
   else if(!v.fall)v.player.visible=false;
   if(v.crate){v.crate.userData.pick.x=state.boxes[v.world];
    if(type==='undo'||type==='recover')v.impact=null;
    else if(type==='push'&&['left','right'].includes(direction)){
     const feedback=state.feedback?.[v.world];v.impact=feedback?.blocked?{startedAt:performance.now(),direction}:null;
    }
    // A blocked input acts at the stop immediately, including rapid input
    // before the preceding move has finished drawing. Only the visual rig deforms.
    if(type==='push'&&v.impact)v.crate.position.set(state.boxes[v.world],0,level.track.y);
    else patch(v,v.crate,{x:state.boxes[v.world],y:0,z:level.track.y});
   }
   for(const target of v.targets)for(const m of ownMaterials(target)){m.emissiveIntensity=state.boxes[v.world]===level.track.targets[v.world]?1:.08;}
   for(const d of v.doors){const occupied=(!!level.science&&body.world===v.world&&body.x===d.position.x&&body.y===d.position.z)||(level.schemaVersion===2&&((e)=>e&&!e.ghost)(entityAt(level,state,v.world,d.position.x,d.position.z)));const open=doorOpen(level,state,v.world,d.position.x,d.position.z)||occupied;patch(v,d,{y:open?1.35:0,opacity:open?.13:1});}
   if(level.schemaVersion===2)updateEntities(v,type,direction);else updateScience(v);
   for(const b of v.bridges){const active=state.mapping===b.id;patch(v,b.g,{y:active?0:-.22,opacity:active?1:0});b.preview.visible=state.preview?.id===b.id&&!active;b.stripes.visible=active&&!!state.preview&&state.preview.id!==b.id;}
   for(const o of v.pickables)if(o.userData.bridgeId)o.visible=state.mapping===o.userData.bridgeId;
  }
  lastFailed=bodyFalling;
  animationStart=performance.now();if(instant||reduced||type==='undo'||type==='recover'){animationStart-=200;frame(performance.now());}else if(scenes.some(v=>v.impact||(v.newEntities||[]).some(e=>e.impact)))frame(performance.now());else raf=requestAnimationFrame(frame);
 }
 function buildEntities(v){
  const initialSignals=scienceResult(level,state).signals;
  v.instruments=[];v.beams=new THREE.Group();v.root.add(v.beams);v.scienceSignature='';
  const ids=[...level.entities.filter(e=>e.world===v.world).map(e=>e.id),...Object.values(level.groups).filter(g=>g.ghostId&&g.target===v.world).map(g=>g.ghostId)];
  const trackMaterial=mat(PALETTE[v.world].edge);
  for(const id of ids){
   const spec=entitySpec(level,id),g=new THREE.Group(),visual=new THREE.Group();g.add(visual);
   const source=state.entities[id]||state.entities[level.groups[spec.group]?.source]||spec.cell;g.position.set(source[0],0,source[1]);
   if(spec.kind==='fixed'&&!spec.ghost&&level.grids[v.world][source[1]][source[0]]===' ')box(v.root,source[0],-.13,source[1],.98,.26,.98,mat(PALETTE[v.world].stone));
   const material=mat(spec.ghost?0x65bcd3:spec.kind==='weight'?0xb5aa8b:0x9ba9ad,{emissive:spec.ghost?0x267b99:0,emissiveIntensity:spec.ghost?.3:0});
   if(spec.kind==='screen'){box(visual,0,.14,0,.58,.28,.45,material);box(visual,0,1.05,0,.78,1.7,.16,material,.03);}
   else {box(visual,0,.3,0,.56,.6,.56,material,.035);box(visual,-.288,.3,0,.02,.4,.075,mat(GOLD),.004);}
   crateMark(visual,spec.group||spec.id,{ghost:spec.ghost,screen:spec.kind==='screen'});
   if(!spec.ghost&&spec.group){g.userData.pick={kind:'object',id:spec.group};v.pickables.push(g);}
   g.visible=!!state.entities[id];g.userData.entityId=id;v.root.add(g);const decoration=impactDecoration(v,g);
   let preview=null;if(spec.ghost){preview=new THREE.LineSegments(new THREE.EdgesGeometry(geo(.78,spec.height,.6)),new THREE.LineDashedMaterial({color:CYAN,dashSize:.12,gapSize:.08,transparent:true,opacity:.8}));preview.computeLineDistances();preview.visible=false;v.root.add(preview);}
   v.newEntities.push({id,spec,g,preview,present:!!state.entities[id],crateVisual:visual,impactDecoration:decoration,impact:null,fall:null});
   if(spec.rail){
    for(const [x,y] of spec.rail){
     if(!level.grids[v.world][y][x].trim()){box(v.root,x,-.13,y,.97,.26,.97,mat(PALETTE[v.world].stone));}
     for(const z of [-.27,.27])box(v.root,x,.035,y+z,.97,.024,.02,trackMaterial,.004);
     if(!spec.nearPush){for(const z of [-.4,.4]){const rail=box(v.root,x,.3,y+z,.99,.6,.025,mat(CYAN,{transparent:true,opacity:.25,depthWrite:false}),.004);rail.userData.glass=true;rail.castShadow=false;}}
    }
    const cells=spec.rail,ys=cells[0][1];
    for(const end of [-1,1])for(const [x] of cells)if(!cells.some(p=>p[0]===x+end)){box(v.root,x+end*.43,.16,ys,.075,.32,.7,trackMaterial,.008);}
   }
  }
  for(const group of Object.values(level.groups).filter(g=>g.kind==='bridge')){
   const cells=group.cells,x=cells.map(p=>p[0]),y=cells.map(p=>p[1]),b={id:group.id,x:[Math.min(...x),Math.max(...x)],y:[Math.min(...y),Math.max(...y)]};
   if(group.world===v.world||group.target===v.world){
    const ghost=group.target===v.world,g=bridgeGroup(v,b,ghost),preview=ghost?previewBridge(v,b):null;
    opacity(g,bridgeActive(level,state,group.id)&&(!ghost||state.mapping===group.id)?1:0);v.newSupports.push({g,group,ghost,preview});
    if(!ghost)v.anchors.push({kind:'object',id:group.id,cell:[(b.x[0]+b.x[1])/2,(b.y[0]+b.y[1])/2],height:.1});
    else for(const [cx,cy] of cells){const pickSurface=new THREE.Mesh(new THREE.PlaneGeometry(.99,.99),new THREE.MeshBasicMaterial({visible:false}));pickSurface.rotation.x=-Math.PI/2;pickSurface.position.set(cx,.02,cy);pickSurface.userData.pick={kind:'cell',x:cx,y:cy};pickSurface.userData.v2Bridge=group.id;v.root.add(pickSurface);v.pickables.push(pickSurface);}
   }
  }
  for(const deck of level.decks.filter(h=>h.world===v.world)){
   for(const [i,[x,y]] of deck.cells.entries()){const g=bridgeGroup(v,{id:deck.id,label:i===Math.floor(deck.cells.length/2)?deck.signal:false,x:[x,x],y:[y,y]},true);opacity(g,initialSignals[deck.signal]?1:0);v.newSupports.push({g,deck});}
  }
  for(const c of level.science.circuits)for(const input of c.inputs){
   const world=input.world||entitySpec(level,input.entity)?.world||c.world;if(world!==v.world||input.type==='sensor')continue;
   for(const [x,y] of input.cells||[input.cell]){const lens=mat(GOLD,{emissive:GOLD,emissiveIntensity:.1});recessedPlate(v,x,y,input.id,lens);v.newPlates.push({input:input.id,lens});}
  }
  for(const goal of level.requirements.filter(g=>g.type==='position'&&entitySpec(level,g.entity)?.world===v.world)){
   const existing=level.science.circuits.some(c=>c.inputs.some(i=>i.entity===goal.entity&&i.cell?.[0]===goal.cell[0]&&i.cell?.[1]===goal.cell[1]));if(existing)continue;
   const [x,y]=goal.cell,lens=mat(GOLD,{emissive:GOLD,emissiveIntensity:.1});recessedPlate(v,x,y,entitySpec(level,goal.entity).group||goal.entity,lens);
   v.newPlates.push({entity:goal.entity,cell:goal.cell,lens});
  }
  for(const d of level.doors.filter(d=>d.world===v.world))v.anchors.push({kind:'readout',id:d.id,label:d.label,cell:d.cells[0],height:1.2});
  const optical=level.science.optics[v.world];if(optical){
   for(const [x,y] of optical.absorbers||[])box(v.root,x,1.6,y,.55,.45,.08,mat(PALETTE[v.world].edge));
   for(const e of optical.emitters){box(v.root,...[e.cell[0],1.6,e.cell[1]],.3,.25,.3,mat(GOLD));v.anchors.push({kind:'readout',id:e.id,label:'光源',cell:e.cell,height:1.8});}
   for(const m of optical.mirrors){const face=new THREE.Group();face.position.set(m.cell[0],1.6,m.cell[1]);box(face,0,0,0,.65,.55,.05,mat(0xbadbe2,{roughness:.16,metalness:.5}));v.root.add(face);if(m.rotatable){face.userData.pick={kind:'mirror',id:m.id};v.pickables.push(face);}v.instruments.push({kind:'mirror',id:m.id,face});v.anchors.push({kind:m.rotatable?'mirror':'readout',id:m.id,label:'固定镜',cell:m.cell,height:1.8});}
   for(const sensor of optical.sensors){const lens=mat(CYAN,{emissive:CYAN,emissiveIntensity:.1});box(v.root,sensor.cell[0],1.6,sensor.cell[1],.24,.35,.24,lens,.05);v.instruments.push({kind:'sensor',id:sensor.id,lens});v.anchors.push({kind:'sensor',id:sensor.id,label:sensor.id,cell:sensor.cell,height:1.82});}
  }
 }
 function updateEntities(v,type,direction){
  const result=scienceResult(level,state);
  for(const e of v.newEntities){
   if(e.preview){const group=level.groups[e.spec.group],source=state.entities[group.source];e.preview.visible=state.preview?.id===group.id&&state.mapping!==group.id;if(source)e.preview.position.set(source[0],e.spec.height/2,source[1]);}
   const cell=state.entities[e.id];if(!cell){e.present=false;e.g.visible=false;e.impact=null;e.fall=null;continue;}
   if(!e.present){e.g.position.set(cell[0],0,cell[1]);e.present=true;}
   if(!state.fallen.includes(e.id)){e.fall=null;opacity(e.g,1);patch(v,e.g,{x:cell[0],y:0,z:cell[1]});}
   else if(e.fall===null)e.fall=performance.now();
   if(type==='undo'||type==='recover')e.impact=null;
   else if(type==='push'||type==='move'){
    const f=state.feedback?.[e.id],d=Array.isArray(direction)?direction[0]<0?'left':direction[0]>0?'right':direction[1]<0?'up':'down':direction;
    e.impact=f?.blocked?{startedAt:performance.now(),direction:d}:null;
    if(e.impact)e.g.position.set(cell[0],0,cell[1]);
   }
   if(e.spec.group)e.g.userData.pick&&(e.g.userData.pick.x=cell[0],e.g.userData.pick.y=cell[1]);
  }
  for(const b of v.newSupports){const active=b.deck?result.signals[b.deck.signal]:bridgeActive(level,state,b.group.id)&&(!b.ghost||state.mapping===b.group.id);patch(v,b.g,{y:active?0:-.35,opacity:active?1:0});if(b.preview)b.preview.visible=state.preview?.id===b.group.id&&!active;}
  for(const p of v.newPlates){const on=p.entity?state.entities[p.entity]?.[0]===p.cell[0]&&state.entities[p.entity]?.[1]===p.cell[1]:result.signals[p.input];p.lens.emissiveIntensity=on?.75:.05;}
  for(const o of v.pickables)if(o.userData.v2Bridge)o.visible=state.mapping===o.userData.v2Bridge&&bridgeActive(level,state,o.userData.v2Bridge);
  const optics=result.opticsByWorld[v.world],signature=JSON.stringify([state.science, optics]);if(signature===v.scienceSignature)return;v.scienceSignature=signature;clean(v.beams);
  for(const item of v.instruments){if(item.kind==='mirror')item.face.rotation.y=state.science.mirrors[item.id]==='/'?Math.PI/4:-Math.PI/4;else{const on=optics.hits.includes(item.id);item.lens.color.setHex(on?0x55c6c0:0x6b7883);item.lens.emissiveIntensity=on?.7:.05;}}
  for(const line of optics.segments){beam(v.beams,line.from,line.to,0x99723d,.035,1.6);beam(v.beams,line.from,line.to,0xffd278,.017,1.6);}
 }
 function resize(){if(disposed)return;for(const v of scenes){const r=v.host.getBoundingClientRect();v.width=Math.max(1,r.width);v.height=Math.max(1,r.height);v.renderer.setSize(v.width,v.height,false);}if(!level)return;
  // Fit the same complete map envelope in both views, never the current objects.
  const W=level.grids.day[0].length,H=level.grids.day.length,camera=scenes[0].camera;camera.updateMatrixWorld();let maxX=0,maxY=0;for(const x of [-W/2,W/2])for(const z of [-H/2,H/2])for(const y of [-1.65,level.schemaVersion===2?2.25:1.7]){const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));}
  const padding=level.academy?36:180;
  const needed=Math.max(...scenes.map(v=>Math.max(maxY*1.1/(Math.max(.5,(v.height-padding)/v.height)),maxX*1.1/(v.width/v.height))));
  for(const v of scenes){const h=needed/zoomFactor,a=v.width/v.height;v.camera.left=-h*a;v.camera.right=h*a;v.camera.top=h;v.camera.bottom=-h;v.camera.updateProjectionMatrix();}draw();
 }
 const observer=new ResizeObserver(resize);for(const v of scenes)observer.observe(v.host);
 function visibility(){if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else if(state)update(state,{instant:true});}document.addEventListener('visibilitychange',visibility);
 return {setLevel(next,nextState){level=next;state=nextState;lastFailed=false;zoomFactor=1;for(const v of scenes)build(v);resize();update(nextState,{instant:true});},update,resize,setActiveWorld(world){activeWorld=world;draw();},zoom(delta){zoomFactor=Math.max(.7,Math.min(1.65,zoomFactor+delta));resize();},setReducedMotion(value){reduced=!!value;if(reduced&&state)update(state,{instant:true});},dispose(){disposed=true;if(raf)cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',visibility);for(const v of scenes){v.host.removeEventListener('click',v.click);clean(v.root);v.renderer.dispose();v.renderer.domElement.remove();}for(const g of geometries.values())g.dispose();markings.dispose();}};
}

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Logical coordinates map directly to X/Z; the walkable surface is Y=0.
const PALETTE={day:{background:0xc8c3b9,stone:0xe7e2d6,edge:0xcac5b8,wall:0xe1ddcf,pit:0x343b40,ground:0xc8c3b9},night:{background:0x172238,stone:0x394660,edge:0x2b374d,wall:0x475570,pit:0x0c1424,ground:0x172238}};
const CYAN=0x7bddf4,GOLD=0xf2cd61;
const inside=(x,y,b)=>x>=b.x[0]&&x<=b.x[1]&&y>=b.y[0]&&y<=b.y[1];
export function createDiorama({dayElement,nightElement,onPick=()=>{},onProject=()=>{},onError=()=>{}}){
 let level=null,state=null,reduced=false,zoomFactor=1,raf=0,animationStart=0,disposed=false;
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),scenes=[],geometries=new Map();
 const geo=(x,y,z,r=.025)=>{const k=[x,y,z,r].join(':');if(!geometries.has(k))geometries.set(k,new RoundedBoxGeometry(x,y,z,2,Math.min(r,x/3,y/3,z/3)));return geometries.get(k);};
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.87,metalness:0,...extra});
 function box(parent,x,y,z,w,h,d,material,r=.025){const m=new THREE.Mesh(geo(w,h,d,r),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function ring(parent,x,y,z,r,color){const m=new THREE.Mesh(new THREE.TorusGeometry(r,.018,6,40),mat(color,{emissive:color,emissiveIntensity:.15}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);parent.add(m);return m;}
 function ownMaterials(group){const set=new Set();group.traverse(o=>{if(o.material)for(const m of [].concat(o.material))set.add(m);});return [...set];}
 function clean(group){group.traverse(o=>{if(o.geometry&&! [...geometries.values()].includes(o.geometry))o.geometry.dispose();});for(const m of ownMaterials(group))m.dispose();group.clear();}
 function pick(v,event){if(event.target.closest('button')||!level||disposed)return;const rect=v.host.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,v.camera);const hits=raycaster.intersectObjects(v.pickables,true);for(const hit of hits){let obj=hit.object;while(obj&&!obj.userData.pick)obj=obj.parent;if(obj?.userData.bridgeId&&state.mapping!==obj.userData.bridgeId)continue;if(obj?.userData.pick){const data=obj.userData.pick;onPick({world:v.world,...data});break;}}}
 try{
 for(const [world,host] of [['day',dayElement],['night',nightElement]]){
  const p=PALETTE[world],scene=new THREE.Scene();scene.background=new THREE.Color(p.background);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=world==='day'?1.28:1.16;renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:manipulation';renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
  const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,160);camera.position.set(-18,27,28);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  scene.add(new THREE.HemisphereLight(world==='day'?0xfff9e9:0xb6d5ff,world==='day'?0x716a60:0x172439,world==='day'?2.3:1.8));
  const sun=new THREE.DirectionalLight(world==='day'?0xfff6e4:0xc7deff,world==='day'?3.5:2.5);sun.position.set(-8,18,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun);scene.add(sun.target);
  const bounce=new THREE.DirectionalLight(world==='day'?0xe8e5df:0x4a76bd,.6);bounce.position.set(10,6,-8);scene.add(bounce);
  const root=new THREE.Group();scene.add(root);const v={world,host,scene,renderer,camera,sun,root,pickables:[],dynamic:[],anchors:[],width:1,height:1,materials:[],player:null,crate:null,bridges:[],doors:[],targets:[],lastBody:null};
  v.click=e=>pick(v,e);host.addEventListener('click',v.click);scenes.push(v);
 }
 }catch(error){for(const v of scenes)v.renderer.dispose();onError(error);throw error;}
 function patch(v,obj,to){const from={x:obj.position.x,y:obj.position.y,z:obj.position.z,opacity:obj.userData.opacity??1};v.dynamic.push({obj,from,to});}
 function opacity(group,value){group.userData.opacity=value;group.visible=value>.002;group.traverse(o=>{if(o.material){o.material.transparent=value<.999||o.userData.glass===true;o.material.opacity=value*(o.userData.baseOpacity??1);}});}
 function character(v){const g=new THREE.Group(),cream=mat(0xf0eee4),shade=mat(0xc2c6bf);const head=new THREE.Mesh(new THREE.SphereGeometry(.15,16,12),cream);head.position.y=.62;head.castShadow=true;g.add(head);const body=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.25,5,12),cream);body.position.y=.32;body.castShadow=true;g.add(body);box(g,-.065,.065,.01,.085,.13,.13,shade);box(g,.065,.065,.01,.085,.13,.13,shade);const shadow=new THREE.Mesh(new THREE.CircleGeometry(.21,24),new THREE.MeshBasicMaterial({color:0x101724,transparent:true,opacity:.2,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;g.add(shadow);v.root.add(g);return g;}
 function bridgeGroup(v,b,ghost){const g=new THREE.Group(),p=PALETTE[v.world],w=b.x[1]-b.x[0]+1,d=b.y[1]-b.y[0]+1;g.position.set((b.x[0]+b.x[1])/2,0,(b.y[0]+b.y[1])/2);const surface=mat(ghost?0x65bcd3:p.stone,ghost?{emissive:0x267b99,emissiveIntensity:.35}:{});box(g,0,-.13,0,w-.035,.26,d-.035,surface,.035);const edge=mat(ghost?CYAN:p.edge,{emissive:ghost?CYAN:0,emissiveIntensity:ghost?.3:0});for(const z of [-d/2+.035,d/2-.035])box(g,0,.012,z,w-.06,.025,.025,edge,.006);if(!ghost)g.userData.pick={kind:'object',id:b.id,x:Math.round((b.x[0]+b.x[1])/2),y:Math.round((b.y[0]+b.y[1])/2)};v.root.add(g);if(!ghost)v.pickables.push(g);return g;}
 function previewBridge(v,b){const g=new THREE.Group(),color=new THREE.LineDashedMaterial({color:CYAN,dashSize:.13,gapSize:.1,transparent:true,opacity:.8});const x1=b.x[0]-.47,x2=b.x[1]+.47,z1=b.y[0]-.47,z2=b.y[1]+.47;const points=[new THREE.Vector3(x1,.035,z1),new THREE.Vector3(x2,.035,z1),new THREE.Vector3(x2,.035,z2),new THREE.Vector3(x1,.035,z2),new THREE.Vector3(x1,.035,z1)];const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),color);line.computeLineDistances();g.add(line);v.root.add(g);g.visible=false;return g;}
 function build(v){
 clean(v.root);v.pickables=[];v.dynamic=[];v.anchors=[];v.bridges=[];v.doors=[];v.targets=[];v.player=null;v.crate=null;
 const p=PALETTE[v.world],rows=level.grids[v.world],W=rows[0].length,H=rows.length;v.root.position.set(-(W-1)/2,0,-(H-1)/2);
 const stone=mat(p.stone),edge=mat(p.edge),wall=mat(p.wall),pit=mat(p.pit),glass=mat(v.world==='day'?0x9dc8cd:0x719db7,{transparent:true,opacity:.4,roughness:.24,depthWrite:false}),gold=mat(GOLD,{emissive:GOLD,emissiveIntensity:.12}),track=mat(v.world==='day'?0xc8c6bb:0x303e55);
 // Background receives the cast shadow; it remains well below every pit.
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),mat(p.ground));ground.rotation.x=-Math.PI/2;ground.position.set((W-1)/2,-1.65,(H-1)/2);ground.receiveShadow=true;v.root.add(ground);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const t=rows[y][x],b=level.bridges.find(b=>inside(x,y,b)),chasm=t==='~'||'bc'.includes(t)||(t==='E'&&level.id==='G5');
  if(chasm){box(v.root,x,-1.52,y,.998,.12,.998,pit,.005);}else{
   const floor=box(v.root,x,-.29,y,.996,.58,.996,stone,.014);floor.userData.pick={kind:'cell',x,y};v.pickables.push(floor);
   // One continuous dark lower course gives the diorama its substantial edge.
   box(v.root,x,-.82,y,.998,.49,.998,edge,.016);
  }
  if(t==='#'){
   const outer=x===0||y===0||x===W-1||y===H-1;
   // Boundary walls use narrow parapets instead of obscuring the entire edge cell.
   const w=outer&&(x===0||x===W-1)?.2:.96,d=outer&&(y===0||y===H-1)?.2:.96,h=outer?.55:1.04;
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
 if(level.track){const x=state.boxes[v.world],y=level.track.y;const g=new THREE.Group();g.position.set(x,0,y);const crate=mat(v.world==='day'?0xeeeadd:0x8896a6);box(g,0,.31,0,.56,.62,.56,crate,.035);box(g,-.288,.3,0,.02,.4,.075,gold,.004);g.userData.pick={kind:'object',id:'A',x,y};v.root.add(g);v.pickables.push(g);v.crate=g;
  const tx=level.track.targets[v.world];if(tx!==undefined){const target=new THREE.Group();target.position.set(tx,.04,y);for(const z of [-.36,.36])box(target,0,0,z,.76,.025,.035,gold,.006);for(const xx of [-.36,.36])box(target,xx,0,0,.035,.025,.76,gold,.006);v.root.add(target);v.targets.push(target);}
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
 v.player=character(v);
 const extent=Math.max(W,H);Object.assign(v.sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:1,far:60});v.sun.shadow.camera.updateProjectionMatrix();
 }
 function anchors(v){const result=v.anchors.map(a=>({...a}));if(v.crate)result.push({kind:'object',id:'A',cell:[v.crate.position.x,level.track.y],height:.67});return result.map(a=>{const p=new THREE.Vector3(a.cell[0],a.height,a.cell[1]);v.root.localToWorld(p);p.project(v.camera);return {kind:a.kind,...(a.id?{id:a.id}:{}),cell:a.cell,x:(p.x+1)*v.width/2,y:(1-p.y)*v.height/2};});}
 function draw(){if(disposed||!level||document.hidden)return;for(const v of scenes){v.renderer.render(v.scene,v.camera);onProject(v.world,anchors(v));}}
 function frame(now){raf=0;if(disposed||document.hidden)return;const t=reduced?1:Math.min(1,(now-animationStart)/190),e=1-Math.pow(1-t,3);for(const v of scenes)for(const a of v.dynamic){a.obj.position.set(THREE.MathUtils.lerp(a.from.x,a.to.x??a.from.x,e),THREE.MathUtils.lerp(a.from.y,a.to.y??a.from.y,e),THREE.MathUtils.lerp(a.from.z,a.to.z??a.from.z,e));if(a.to.opacity!==undefined)opacity(a.obj,THREE.MathUtils.lerp(a.from.opacity,a.to.opacity,e));if(a.to.shake)a.obj.position.x+=Math.sin(t*Math.PI*4)*(1-t)*.045;}draw();if(t<1)raf=requestAnimationFrame(frame);else for(const v of scenes)v.dynamic=[];}
 function update(next,{type,instant=false}={}){
  if(!level||disposed)return;state=next;if(raf){cancelAnimationFrame(raf);raf=0;}
  for(const v of scenes){v.dynamic=[];const body=state.body;v.player.visible=body.world===v.world;patch(v,v.player,{x:body.x,y:state.failed?-1.1:0,z:body.y});if(v.crate){v.crate.userData.pick.x=state.boxes[v.world];patch(v,v.crate,{x:state.boxes[v.world],y:0,z:level.track.y,shake:type==='push'&&state.feedback?.[v.world]?.blocked});}
   for(const target of v.targets)for(const m of ownMaterials(target)){m.emissiveIntensity=state.boxes[v.world]===level.track.targets[v.world]?1:.08;}
   for(const d of v.doors){const open=v.world==='day'&&state.boxes?.day===level.track?.targets.day;patch(v,d,{y:open?1.35:0,opacity:open?.13:1});}
   for(const b of v.bridges){const active=state.mapping===b.id;patch(v,b.g,{y:active?0:-.22,opacity:active?1:0});b.preview.visible=state.preview?.id===b.id&&!active;b.stripes.visible=active&&!!state.preview&&state.preview.id!==b.id;}
   for(const o of v.pickables)if(o.userData.bridgeId)o.visible=state.mapping===o.userData.bridgeId;
  }
  animationStart=performance.now();if(instant||reduced||type==='undo'||type==='recover'){animationStart-=200;frame(performance.now());}else raf=requestAnimationFrame(frame);
 }
 function resize(){if(disposed)return;for(const v of scenes){const r=v.host.getBoundingClientRect();v.width=Math.max(1,r.width);v.height=Math.max(1,r.height);v.renderer.setSize(v.width,v.height,false);}if(!level)return;
  // Fit the same complete map envelope in both views, never the current objects.
  const W=level.grids.day[0].length,H=level.grids.day.length,camera=scenes[0].camera;camera.updateMatrixWorld();let maxX=0,maxY=0;for(const x of [-W/2,W/2])for(const z of [-H/2,H/2])for(const y of [-1.65,1.7]){const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));}
  const needed=Math.max(...scenes.map(v=>Math.max(maxY*1.12/(Math.max(.5,(v.height-180)/v.height)),maxX*1.12/(v.width/v.height))));
  for(const v of scenes){const h=needed/zoomFactor,a=v.width/v.height;v.camera.left=-h*a;v.camera.right=h*a;v.camera.top=h;v.camera.bottom=-h;v.camera.updateProjectionMatrix();}draw();
 }
 const observer=new ResizeObserver(resize);for(const v of scenes)observer.observe(v.host);
 function visibility(){if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else if(state)update(state,{instant:true});}document.addEventListener('visibilitychange',visibility);
 return {setLevel(next,nextState){level=next;state=nextState;zoomFactor=1;for(const v of scenes)build(v);resize();update(nextState,{instant:true});},update,resize,zoom(delta){zoomFactor=Math.max(.7,Math.min(1.65,zoomFactor+delta));resize();},setReducedMotion(value){reduced=!!value;if(reduced&&state)update(state,{instant:true});},dispose(){disposed=true;if(raf)cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',visibility);for(const v of scenes){v.host.removeEventListener('click',v.click);clean(v.root);v.renderer.dispose();v.renderer.domElement.remove();}for(const g of geometries.values())g.dispose();}};
}

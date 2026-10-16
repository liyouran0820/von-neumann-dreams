import test from 'node:test';
import assert from 'node:assert/strict';
import { V2_LEVELS } from '../web/levels-v2.js';
import { validateLevels,validateLevel } from '../web/level-validation.js';
import { CATALOGS,catalogFor,readProgress,writeProgress } from '../web/level-catalog.js';
import * as G from '../web/engine.js';
import { executeRoute,REFERENCE_ROUTES } from '../scripts/verify-v2-levels.mjs';
const setup=n=>{const l=V2_LEVELS[n-1];return [l,G.createState(l)];};
const act=(l,s,t,a)=>assert(G.act(l,s,t,a),`${l.id}: ${t} ${s.message}`);
const bind=(l,s,id,world='day')=>{act(l,s,'view',{world,recordHistory:false});assert(G.select(l,s,id,world));act(l,s,'activate');};
const move=(l,s,dx,dy)=>{act(l,s,'view',{world:s.body.world,recordHistory:false});act(l,s,'move',[dx,dy]);};
for(const [i,l] of V2_LEVELS.entries())test(l.id+' 通过正式命令入口完成参考路线',()=>{const {state}=executeRoute(l,REFERENCE_ROUTES[i]);assert(state.won&&!state.failed);});
for(const n of [2,4])test(`第${n}关须夜白双箱同时到靶；第二关缺靶不放行，第四关可出口旁继续校准`,()=>{
 const l=V2_LEVELS[n-1],route=structuredClone(REFERENCE_ROUTES[n-1]);route.find(a=>a[0]==='push')[1]=n===2?'L':'LLL';
 if(n===2){
  route.pop();const {state}=executeRoute(l,route);assert(!state.won&&!G.scienceResult(l,state).signals.Y);assert.equal(G.findPath(l,state,7,1),null);
  for(const d of 'LLLR')act(l,state,'push',d==='L'?'left':'right');assert(G.scienceResult(l,state).signals.Y);executeRoute(l,[['walk',7,1]],state);assert(state.won);return;
 }
 const {state}=executeRoute(l,route);assert(G.goals(l,state).at(-1).ok);assert(!state.won&&!state.failed);
 const signals=G.scienceResult(l,state).signals;assert(n===2?signals.Y:signals.W);
 assert.equal(G.goals(l,state).filter(g=>g.ok).length,2);
 for(const d of n===2?'LLLR':'LR')act(l,state,'push',d==='L'?'left':'right');
 assert.deepEqual(state.entities.A_N,[3,7]);assert.deepEqual(state.entities.A_W,[1,7]);assert(state.won);
 if(n===4)assert(!G.scienceResult(l,state).signals.N); // The door behind may close.
});
test('内容校验拒绝非法跨世界接线、未登记特例、环路和未知版本',()=>{
 assert(validateLevels(V2_LEVELS));assert.equal(V2_LEVELS.length,13);
 const a=structuredClone(V2_LEVELS[3]);a.science.circuits[0].inputs[1].world='day';assert.throws(()=>validateLevel(a),/cross-world/);
 for(const index of [0,1]){const bad=structuredClone(V2_LEVELS[index]);delete bad.science.circuits[0].crossWorld;assert.throws(()=>validateLevel(bad),/cross-world/);const wrong=structuredClone(V2_LEVELS[index]);wrong.science.circuits[0].nodes.at(-1).args[1].signal=index===0?'A':'a';assert.throws(()=>validateLevel(wrong),/whitelist/);}
 const b=structuredClone(V2_LEVELS[4]);b.science.circuits[0].crossWorld.bridge='G';assert.throws(()=>validateLevel(b),/whitelist/);
 const c=structuredClone(V2_LEVELS[0]);c.science.circuits[0].nodes[0].args[0].signal='Y';assert.throws(()=>validateLevel(c),/cyclic/);
 const d=structuredClone(V2_LEVELS[0]);d.schemaVersion=3;assert.throws(()=>G.createState(d),/schema/);
});
test('受阻近推仍向另一端传一次输入；人物不能穿进内部止挡',()=>{
 const [l,s]=setup(8);bind(l,s,'G');move(l,s,1,0);assert.deepEqual(s.entities.G_W,[3,3]);assert.deepEqual(s.entities.G_N,[3,3]);
 move(l,s,1,0);assert.deepEqual(s.entities.G_W,[4,3]);assert.deepEqual(s.entities.G_N,[3,3]);assert.deepEqual([s.body.x,s.body.y],[2,3]);assert(s.feedback.G_N.blocked);
 move(l,s,1,0);assert.deepEqual(s.entities.G_W,[5,3]);const before=structuredClone(s);act(l,s,'undo');assert.deepEqual(s.entities.G_W,[4,3]);act(l,s,'move',[1,0]);assert.deepEqual(s,before);
 act(l,s,'unlink');act(l,s,'activate');assert.deepEqual(s.entities.G_N,[5,3]);assert.equal(s.mapping,'G');
});
test('身体止挡与轨末止挡都能同时熄灭两个真实反射输入',()=>{
 const [l,s]=setup(7);bind(l,s,'G');for(let i=0;i<3;i++)act(l,s,'push','right');act(l,s,'push','left');act(l,s,'push','left');
 assert.deepEqual([s.entities.G_W[0],s.entities.G_N[0]],[3,6]);const r=G.scienceResult(l,s);assert(!r.signals.LN&&!r.signals.LW);
 assert(!G.act(l,s,'mirror','M-LN'));assert(!G.act(l,s,'mirror','M-LW')); // fixed mirrors
 const {state}=executeRoute(l,[['bind','G'],['push','RRRLL'],['walk',5,4],['walk',8,4]]);assert(state.won);
});
test('第五关失败预览保留A；换桥后真箱、双板和条件桥持续；桥失效即失撑',()=>{
 const [l,s]=setup(5);bind(l,s,'A','night');G.select(l,s,'B','day');assert(!G.canActivate(l,s));const entities=structuredClone(s.entities);assert(!G.act(l,s,'activate'));assert.equal(s.mapping,'A');assert.deepEqual(s.entities,entities);
 for(const d of 'LLLLRR')act(l,s,'push',d==='L'?'left':'right');assert(G.scienceResult(l,s).output);act(l,s,'activate');assert.equal(s.mapping,'B');assert.deepEqual(s.entities.A_N,[5,2]);assert.deepEqual(s.entities.A_W,[2,2]);assert.equal(G.support(l,s,'night',8,3),'ghost-B');
 const {state}=executeRoute(l,[['bind','A','night'],['push','LLLLRR'],['unlink'],['bind','B'],['walk',8,3]]);const snapshot=structuredClone(state);act(l,state,'unlink');assert(state.failed&&!state.won);act(l,state,'undo');assert.deepEqual(state,snapshot);
 // A corrupted/source-changed state must never freeze a stale bridge output.
 state.entities.A_W=[3,2];assert(!G.bridgeActive(l,state,'B'));assert.equal(G.support(l,state,'night',8,3),null);
});
test('G生成体积与人物冲突时拒绝且保留旧组，预览不遮光不压板',()=>{
 const [l,s]=setup(7);bind(l,s,'G');move(l,s,1,0);act(l,s,'push','left');assert.deepEqual(s.entities.G_W,[4,1]);assert.deepEqual(s.entities.G_N,[6,1]);
 // source at4, body at5: move to4 then try respawning there.
 move(l,s,-1,0);act(l,s,'unlink');const before=structuredClone(s);assert(!G.canActivate(l,s));assert(!G.act(l,s,'activate'));assert.deepEqual(s.entities,before.entities);assert.equal(s.mapping,null);
});
test('人物接替真箱压板时持续为1；普通K不可映射、遥推或连推',()=>{
 const [l,s]=setup(2);assert(!G.select(l,s,'K','night'));assert(!G.act(l,s,'push','right'));move(l,s,0,1);assert.deepEqual(s.entities.K,[3,2]);assert(G.scienceResult(l,s).signals.b);
 move(l,s,0,1);assert.deepEqual(s.entities.K,[3,3]);assert(G.scienceResult(l,s).signals.b);move(l,s,-1,0);assert(!G.scienceResult(l,s).signals.b);
 const [two,t]=setup(10);t.entities.K1=[3,2];t.entities.K2=[4,2];t.body={world:'night',x:2,y:2};const old=structuredClone(t.entities);assert(!G.act(two,t,'move',[1,0]));assert.deepEqual(t.entities,old);
});
test('第十一关只救人物却让真箱失撑仍失败；允许同一路和下岸替代解',()=>{
 const [l,s]=setup(11);move(l,s,0,1);move(l,s,-1,0);const body=structuredClone(s.body);bind(l,s,'B');assert(s.failed);assert(s.fallen.includes('K')&&!s.fallen.includes('body'));assert.deepEqual(s.body,body);act(l,s,'undo');assert(!s.failed);
 const same=[['walk',5,4],['move','U'],['walk',6,2],['move','LL'],['walk',3,1],['move','D'],['bind','B'],['walk',10,3]];assert(executeRoute(l,same).state.won);
 const lower=[['walk',5,2],['move','D'],['walk',6,4],['bind','B'],['move','L'],['walk',4,5],['move','U'],['walk',10,3]];assert(executeRoute(l,lower).state.won);
});
test('两面镜子真实产生四种受光组合；吊装器材不阻挡人物或误遮光',()=>{
 const [l,s]=setup(12);const seen=[];for(const id of [null,'M1','M2','M1']){if(id)act(l,s,'mirror',id);const r=G.scienceResult(l,s);seen.push([+r.signals.a,+r.signals.b,+r.output]);}assert.deepEqual(seen,[[1,1,0],[0,1,1],[0,0,1],[1,0,1]]);
 assert(G.support(l,s,'night',2,1));const before=G.scienceResult(l,s);move(l,s,0,-1);assert.deepEqual(G.scienceResult(l,s).signals,before.signals);act(l,s,'undo');
});
test('配重顶住场地边缘时反馈受阻且不位移，撤销恢复完整状态',()=>{
 const [l,s]=setup(2);move(l,s,0,1);move(l,s,0,1);const before=structuredClone(s);move(l,s,0,1);assert.deepEqual(s.entities.K,[3,3]);assert.deepEqual([s.body.x,s.body.y],[3,2]);assert(s.feedback.K.blocked);act(l,s,'undo');assert.deepEqual(s,before);
});
test('第一关删除配重和夜b板；夜靶A、白靶B的AND四种输入来自真实箱位',()=>{
 assert.equal(V2_LEVELS[0].entities.length,2);assert(V2_LEVELS[0].entities.every(e=>e.kind==='rail'));assert(!V2_LEVELS[0].science.circuits[0].inputs.some(i=>i.type==='contact'));
 for(const [push,A,B] of [['',false,false],['R',true,false],['RR',true,true],['RRRL',false,true]]){
  const [l,s]=setup(1);executeRoute(l,[['bind','A','night'],...(push?[['push',push]]:[])],s);const r=G.scienceResult(l,s);assert.equal(r.signals.A,A);assert.equal(r.signals.B,B);assert.equal(r.signals.Y,A&&B);assert.equal(G.doorOpen(l,s,'night',6,1),A&&B);
 }
});
test('第二关双靶先AND为C，C与持续压板b再AND为Y；八组实际输入均正确',()=>{
 for(const b of [false,true])for(const [push,a,w] of [['',false,false],['L',true,false],['LLL',false,true],['LLLLR',true,true]]){
  const [l,s]=setup(2);if(b)executeRoute(l,[['move','D']],s);executeRoute(l,[['bind','A','night'],...(push?[['push',push]]:[])],s);
  const r=G.scienceResult(l,s);assert.equal(r.signals.a,a);assert.equal(r.signals.w,w);assert.equal(r.signals.b,b);assert.equal(r.signals.C,a&&w);assert.equal(r.signals.Y,a&&w&&b);assert.equal(G.doorOpen(l,s,'night',6,1),a&&w&&b);
 }
});
test('十三关支持先转镜后校准；桥上转走光即时失败并完整恢复',()=>{
 const [l,s]=setup(13);const {state}=executeRoute(l,[['move','D'],['mirror','M'],['walk',6,3],['bind','A','night'],['push','R'],['bind','B'],['walk',7,3]],s);
 const before=structuredClone(state);act(l,state,'mirror','M');assert(state.failed&&!state.won);act(l,state,'undo');assert.deepEqual(state,before);assert(G.scienceResult(l,state).signals.Y);
 act(l,state,'mirror','M');act(l,state,'recover');assert(!state.failed);assert.deepEqual([state.body.x,state.body.y],[6,3]);
});
test('目录保留旧URL/存档；新存档按稳定ID保存，损坏或禁用存储仍可玩',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 writeProgress(storage,CATALOGS.academy,['G1']);writeProgress(storage,CATALOGS.v2,['V2-05','V2-06','V2-13']);assert.deepEqual(readProgress(storage,CATALOGS.academy),['G1']);assert.deepEqual(readProgress(storage,CATALOGS.v2),['V2-05','V2-06','V2-13']);
 assert.equal(catalogFor(null).id,'academy');assert.equal(catalogFor('original').id,'original');assert.equal(catalogFor('optics').id,'optics');assert.equal(catalogFor('v2').levels.length,13);
 writeProgress(storage,CATALOGS.v2,[]);assert.deepEqual(readProgress(storage,CATALOGS.academy),['G1']);assert.deepEqual(readProgress(undefined,CATALOGS.v2),[]);assert.doesNotThrow(()=>writeProgress(undefined,CATALOGS.v2,[]));
 data.set(CATALOGS.v2.progressKey,'broken');assert.deepEqual(readProgress(storage,CATALOGS.v2),[]);
});
test('待关闭门中的真配重可以移出，人物不能接替进入已关闭线路',()=>{
 const l=structuredClone(V2_LEVELS[9]);l.start=[5,3];l.entities[0].cell=[6,3];l.entities[1].cell=[4,1];const s=G.createState(l);
 assert(!G.doorOpen(l,s,'night',6,3));assert.equal(G.support(l,s,'night',6,3),'floor');
 act(l,s,'move',[1,0]);assert.deepEqual(s.entities.K1,[7,3]);assert.deepEqual([s.body.x,s.body.y],[5,3]);assert(!G.act(l,s,'move',[1,0]));
});
test('重复确认G保留位差；明确解除后才按本体位置检查重新生成',()=>{
 const [l,s]=setup(6);bind(l,s,'G');move(l,s,1,0);act(l,s,'push','left');assert.deepEqual(s.entities.G_W,[4,1]);assert.deepEqual(s.entities.G_N,[5,1]);
 assert(G.canActivate(l,s));act(l,s,'activate');assert.deepEqual(s.entities.G_N,[5,1]);act(l,s,'unlink');assert(!G.canActivate(l,s)); // Body at the new spawn cell4.
});
for(const n of [8,9])test(`第${n}关轨靶与配重压板独立产生AND四种真实输入`,()=>{
 for(const b of [false,true])for(const target of [false,true]){
  const [l,s]=setup(n);
  if(b)executeRoute(l,[['walk',2,2],['move','U'],['walk',1,3]],s);
  if(target)executeRoute(l,[['bind','G'],['push',n===8?'RRR':'RRRR'],['unlink'],['activate']],s);
  const r=G.scienceResult(l,s);assert.equal(r.signals.p,target);assert.equal(r.signals.b,b);assert.equal(r.signals.Y1,b&&target);assert.equal(G.doorOpen(l,s,'night',4,1),b&&target);
  if(n===9){
   assert(!r.signals.Y2);
   if(target){act(l,s,'push','right');act(l,s,'push','right');const next=G.scienceResult(l,s);assert(!next.signals.p&&next.signals.q);assert(!next.signals.Y1);assert.equal(next.signals.Y2,b);assert.equal(G.doorOpen(l,s,'night',9,1),b);}
  }
 }
});

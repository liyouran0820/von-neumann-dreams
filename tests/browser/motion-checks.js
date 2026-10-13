export async function verifyImpact(motionTest) {
 const checks=[];
 function assert(value){if(!value)throw Error('验收断言失败');}
 assert.equal=(a,b)=>{if(a!==b)throw Error(`预期 ${JSON.stringify(b)}，实际 ${JSON.stringify(a)}`);};
 assert.deepEqual=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
 const page={evaluate:(fn,arg)=>fn(arg)},run=fn=>fn(),metric=world=>motionTest.metrics(world);
 const neutral=m=>{assert.equal(m.crate.offset,0);assert.equal(m.crate.rotation,0);assert.deepEqual(m.crate.scale,[1,1,1]);assert.equal(m.crate.contact,false);};
 async function check(name,callback){await callback();checks.push(name);}
 try {
 await check('I01 同动、两种独立受阻、两侧同时受阻与撤销',async()=>{
  await run(()=>{motionTest.load();motionTest.bind('A');motionTest.dispatch('push','right');motionTest.step(200);});
  assert((await metric('night')).crate.contact);neutral(await metric('day'));
  await run(()=>motionTest.step(360));for(const w of ['night','day'])neutral(await metric(w));
  await run(()=>{motionTest.dispatch('push','right');motionTest.step(65);});
  let n=await metric('night'),d=await metric('day');assert(n.crate.offset>.06&&n.crate.scale[0]<.9&&n.crate.contact);neutral(d);assert.deepEqual(n.boxes,{night:3,day:4});
  await run(()=>motionTest.step(97));n=await metric('night');assert(n.crate.offset<-.05&&n.crate.scale[0]>1);
  await run(()=>{motionTest.step(198);motionTest.boxes({night:3,day:2});motionTest.dispatch('push','left');motionTest.step(65);});
  n=await metric('night');d=await metric('day');neutral(n);assert(d.crate.offset<-.06&&d.crate.contactX<0);assert.deepEqual(d.boxes,{night:2,day:2});
  await run(()=>{motionTest.step(125);motionTest.dispatch('push','left');motionTest.step(65);});
  for(const w of ['night','day'])assert((await metric(w)).crate.contact);
  await run(()=>{motionTest.dispatch('undo');motionTest.step(0);});for(const w of ['night','day'])neutral(await metric(w));
 });
 await check('I02 左右方向、接触闪光与360ms精确归位',async()=>{
  for(const direction of ['left','right']){
   await page.evaluate(dir=>{motionTest.load();motionTest.bind('A');motionTest.boxes(dir==='left'?{night:2,day:2}:{night:3,day:7});motionTest.dispatch('push',dir);motionTest.step(65);},direction);
   const m=await metric('night');assert(m.crate.flash>.7);assert.equal(Math.sign(m.crate.offset),direction==='left'?-1:1);assert.equal(Math.sign(m.crate.contactX),direction==='left'?-1:1);
   await run(()=>motionTest.step(295));const end=await metric('night');neutral(end);assert.equal(end.pendingFrames,0);
  }
 });
 await check('I03 连续推动、观察/预览/缩放不重播及恢复/换关清理',async()=>{
  await run(()=>{motionTest.load();motionTest.bind('A');motionTest.dispatch('push','right');motionTest.step(200);for(let i=0;i<20;i++){motionTest.dispatch('push','right');motionTest.step(25);}motionTest.step(190);motionTest.step(360);});
  for(const w of ['night','day'])neutral(await metric(w));
  await run(()=>{motionTest.dispatch('view',{world:'day',recordHistory:false});motionTest.update({instant:true});motionTest.bind('A');motionTest.zoom(.12);motionTest.step(400);});for(const w of ['night','day'])neutral(await metric(w));
  await run(()=>{motionTest.dispatch('push','right');motionTest.step(65);motionTest.dispatch('recover');motionTest.step(0);});for(const w of ['night','day'])neutral(await metric(w));
  await run(()=>{motionTest.bind('A');motionTest.boxes({night:3,day:7});motionTest.dispatch('push','right');motionTest.step(65);motionTest.load(2);motionTest.step(0);});assert.equal((await metric()).crate,undefined);
 });
 await check('I04 减少动态静态反馈及无效推动不触发',async()=>{
  await run(()=>{motionTest.load(0,true);motionTest.bind('A');motionTest.boxes({night:3,day:7});motionTest.dispatch('push','right');motionTest.step(0);});
  const m=await metric();assert(m.crate.contact&&m.crate.flash===1);assert.deepEqual([m.crate.offset,m.crate.rotation,...m.crate.scale],[0,0,1,1,1]);
  await run(()=>motionTest.step(180));neutral(await metric());
  for(const direction of ['up','down']){assert.equal(await page.evaluate(dir=>motionTest.dispatch('push',dir),direction),false);await run(()=>motionTest.step(0));neutral(await metric());}
  await run(()=>{motionTest.load();motionTest.dispatch('push','right');motionTest.step(400);});neutral(await metric());
  await run(()=>{motionTest.load(2);motionTest.bind('B');});assert.equal(await run(()=>motionTest.dispatch('push','right')),false);
 });
 return {status:'PASS',checks};
 }catch(error){return {status:'FAIL',checks,error:error.stack};}
}
export async function verifyFall(t) {
 const checks=[];
 function assert(value,message='验收断言失败'){if(!value)throw Error(message);}
 const equal=(a,b)=>assert(JSON.stringify(a)===JSON.stringify(b),`预期 ${JSON.stringify(b)}，实际 ${JSON.stringify(a)}`);
 const restored=m=>{assert(m.player.visible&&m.player.shadow);equal(m.player.position,[m.body.x,0,m.body.y]);equal(m.player.scale,[1,1,1]);equal(m.player.rotation,[0,0,0,'XYZ']);equal(m.player.arms,[-.12,.12]);equal(m.player.opacity,1);equal(m.player.shadowOpacity,.2);assert(!m.failed);};
 async function check(name,fn){await fn();checks.push(name);}
 try {
  await check('F01 白侧桥上解除、夜侧桥上替换触发；预览及合法地面解除不触发',()=>{
   t.prepareFall('day');assert(t.dispatch('unlink'));let m=t.metrics();assert(m.failed&&!m.won&&m.player.visible&&!m.player.shadow);
   t.prepareFall('night');assert(t.preview('C','day'));assert(!t.metrics().failed);restored(t.metrics());assert(t.dispatch('activate'));assert(t.metrics().failed&&!t.metrics().player.shadow);
   t.load(2);t.bind('B');t.dispatch('unlink');t.step(900);restored(t.metrics());
   t.walk(3,3);t.dispatch('teleport');t.walk(5,3);assert(!t.dispatch('move',[1,0]));t.step(900);restored(t.metrics());
   t.load(1);t.walk(3,3);t.dispatch('teleport');t.walk(2,3);assert(!t.dispatch('move',[0,-1]));t.step(900);restored(t.metrics());
  });
  await check('F02 失衡、加速下坠、淡出及900ms内隐藏且停止重绘',()=>{
   t.prepareFall('day');t.dispatch('unlink');t.step(140);let m=t.metrics();assert(m.player.rotation[2]>.15&&Math.abs(m.player.position[1])<.03);assert(Math.abs(m.player.arms[0])>1&&!m.player.shadow);
   t.step(160);const a=t.metrics().player.position[1];t.step(200);const b=t.metrics().player.position[1];t.step(200);m=t.metrics();const c=m.player.position[1];assert(a>b&&b>c&&b-c>a-b);assert(m.player.opacity<.5);
   t.step(200);m=t.metrics();assert(!m.player.visible&&m.player.position[1]<-5&&!m.player.shadow&&m.failed&&!m.won);equal(m.pendingFrames,0);
  });
  await check('F03 观察/缩放不重播；任意时刻撤销、恢复、重开/换关立即完整还原',()=>{
   for(const elapsed of [0,140,450,900]){
    t.prepareFall('day');const before=t.state();t.dispatch('unlink');t.step(elapsed);const originalY=t.metrics().player.position[1];t.zoom(.12);t.dispatch('view',{world:'night',recordHistory:false});t.dispatch('view',{world:'day',recordHistory:false});t.update({instant:true});const y=t.metrics().player.position[1];equal(y,originalY);if(elapsed===900)assert(!t.metrics().player.visible);
    for(const [type,arg] of [['move',[1,0]],['push','right'],['teleport'],['activate']])assert(!t.dispatch(type,arg));assert(!t.preview('B','night'));
    t.dispatch('undo');t.step(0);restored(t.metrics());equal(t.state(),before);
    t.dispatch('unlink');t.step(elapsed);const cp=t.state().checkpoint;t.dispatch('recover');t.step(0);restored(t.metrics());equal(t.state().body,cp.body);equal(t.state().mapping,cp.mapping);
   }
   t.prepareFall('night');t.dispatch('unlink');t.step(140);t.load(3);restored(t.metrics());t.prepareFall('night');t.dispatch('unlink');t.step(450);t.load(1);restored(t.metrics());
  });
  await check('F04 减少动态直接隐藏可立即恢复，切换偏好不重播，恢复可撤销',()=>{
   t.prepareFall('day',true);t.dispatch('unlink');t.step(0);let m=t.metrics();assert(m.failed&&!m.player.visible&&!m.player.shadow);equal(m.pendingFrames,0);t.dispatch('undo');t.step(0);restored(t.metrics());
   t.prepareFall('day');t.dispatch('unlink');t.step(140);t.reduce(true);assert(!t.metrics().player.visible);t.reduce(false);t.update({instant:true});assert(!t.metrics().player.visible);
   const failed=t.state();t.dispatch('recover');t.step(0);restored(t.metrics());t.dispatch('undo');t.step(900);assert(t.metrics().failed&&!t.metrics().player.visible);equal(t.state(),failed);
  });
  return {status:'PASS',checks};
 }catch(error){return {status:'FAIL',checks,error:error.stack};}
}
export async function verifySinglePush(t){
 const checks=[];
 function assert(value,message='单击验收失败'){if(!value)throw Error(message);}
 const equal=(a,b)=>assert(JSON.stringify(a)===JSON.stringify(b),`预期 ${JSON.stringify(b)}，实际 ${JSON.stringify(a)}`);
 const neutral=m=>{equal([m.crate.offset,m.crate.rotation,...m.crate.scale],[0,0,1,1,1]);assert(!m.crate.contact);};
 async function check(name,fn){await fn();checks.push(name);}
 try{
  await check('S01 首次单击到达止挡即反馈，途中不提前闪光，另一侧正常移动',()=>{
   t.load();t.bind('A');const history=t.state().history.length;assert(t.dispatch('push','right'));t.step(100);
   assert(t.metrics('night').crate.x<3);neutral(t.metrics('night'));neutral(t.metrics('day'));
   t.step(90);assert(t.metrics('night').crate.contact);equal(t.metrics('night').crate.x,3);neutral(t.metrics('day'));
   t.step(65);const m=t.metrics('night');assert(m.crate.offset>.06&&m.crate.scale[0]<.9&&m.crate.flash>.7);equal(m.boxes,{night:3,day:3});equal(m.history,history+1);
  });
  await check('S02 左右到达和已受阻的单次推动，白夜分别反馈且只增加一次历史',()=>{
   for(const [direction,boxes] of [['right',{night:2,day:6}],['left',{night:3,day:3}]]){
    t.load();t.bind('A');t.boxes(boxes);const before=t.state().history.length;t.dispatch('push',direction);t.step(190);t.step(65);
    for(const w of ['night','day']){const m=t.metrics(w);assert(m.crate.contact);assert(Math.sign(m.crate.offset)===(direction==='left'?-1:1));}equal(t.state().history.length,before+1);
    t.step(360);t.dispatch('push',direction);t.step(65);for(const w of ['night','day'])assert(t.metrics(w).crate.contact);equal(t.state().history.length,before+2);
   }
   t.load(4);t.bind('A');t.boxes({night:4,day:5});t.dispatch('push','right');t.step(190);t.step(65);neutral(t.metrics('night'));assert(t.metrics('day').crate.contact);
  });
  await check('S03 离开止挡与中段移动不误报，非法推动不触发',()=>{
   t.load(4);t.bind('A');t.boxes({night:6,day:6});t.dispatch('push','left');t.step(550);for(const w of ['night','day'])neutral(t.metrics(w));
   t.boxes({night:4,day:3});t.dispatch('push','right');t.step(550);for(const w of ['night','day'])neutral(t.metrics(w));
   for(const direction of ['up','down'])assert(!t.dispatch('push',direction));t.step(0);for(const w of ['night','day'])neutral(t.metrics(w));
   t.load();assert(!t.dispatch('push','right'));t.step(0);neutral(t.metrics());t.load(2);t.bind('B');assert(!t.dispatch('push','right'));
  });
  await check('S04 接触后360ms归位，取消等待反馈、快速输入及减少动态',()=>{
   t.load();t.bind('A');t.dispatch('push','right');t.step(190);t.step(360);for(const w of ['night','day'])neutral(t.metrics(w));equal(t.metrics().pendingFrames,0);
   t.dispatch('view',{world:'day',recordHistory:false});t.zoom(.12);t.update({instant:true});for(const w of ['night','day'])neutral(t.metrics(w));
   for(const type of ['undo','recover']){t.load();t.bind('A');t.dispatch('push','right');t.step(100);t.dispatch(type);t.step(0);for(const w of ['night','day'])neutral(t.metrics(w));t.step(550);for(const w of ['night','day'])neutral(t.metrics(w));}
   t.load();t.bind('A');t.dispatch('push','right');t.step(100);t.load(1);t.step(550);for(const w of ['night','day'])neutral(t.metrics(w));
   t.load();t.bind('A');for(let i=0;i<10;i++){t.dispatch('push','right');t.step(25);}t.step(190);t.step(360);for(const w of ['night','day'])neutral(t.metrics(w));
   t.load(0,true);t.bind('A');t.dispatch('push','right');t.step(0);const m=t.metrics('night');equal([m.crate.offset,m.crate.rotation,...m.crate.scale],[0,0,1,1,1]);assert(m.crate.contact&&m.crate.flash===1);neutral(t.metrics('day'));t.step(180);neutral(t.metrics('night'));
  });
  return {status:'PASS',checks};
 }catch(error){return {status:'FAIL',checks,error:error.stack};}
}

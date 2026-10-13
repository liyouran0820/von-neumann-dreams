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
  for(const w of ['night','day'])neutral(await metric(w));
  await run(()=>{motionTest.dispatch('push','right');motionTest.step(65);});
  let n=await metric('night'),d=await metric('day');assert(n.crate.offset>.06&&n.crate.scale[0]<.9&&n.crate.contact);neutral(d);assert.deepEqual(n.boxes,{night:3,day:4});
  await run(()=>motionTest.step(97));n=await metric('night');assert(n.crate.offset<-.05&&n.crate.scale[0]>1);
  await run(()=>{motionTest.step(198);motionTest.boxes({night:3,day:2});motionTest.dispatch('push','left');motionTest.step(65);});
  n=await metric('night');d=await metric('day');neutral(n);assert(d.crate.offset<-.06&&d.crate.contactX<0);assert.deepEqual(d.boxes,{night:2,day:2});
  await run(()=>{motionTest.dispatch('push','left');motionTest.step(65);});
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
  await run(()=>{motionTest.load();motionTest.bind('A');motionTest.dispatch('push','right');motionTest.step(200);for(let i=0;i<20;i++){motionTest.dispatch('push','right');motionTest.step(25);}motionTest.step(360);});
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

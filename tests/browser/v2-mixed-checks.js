export default async (page) => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const report={sizes:[],mixed:[],performance:{},motion:{}};
 const go=async(base,version)=>{await page.goto(base+'/generated/v2-render-probe.html?version='+version);await page.locator('#chapter').waitFor();};
 const level=async i=>{await page.locator('#open-levels').click();await page.locator('[data-level="'+i+'"]').click();};
 await go('http://127.0.0.1:5174','v2');
 for(const [width,height] of [[1280,800],[390,844],[320,740]]){
  await page.setViewportSize({width,height});
  for(const i of [4,7,8,11,12]){
   await level(i);await page.waitForTimeout(240);
   const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,canvases:document.querySelectorAll('canvas').length,visibleWorlds:[...document.querySelectorAll('.world')].filter(n=>getComputedStyle(n).visibility==='visible').length,mirrors:[...document.querySelectorAll('[data-mirror]')].map(b=>{const r=b.getBoundingClientRect();return {w:r.width,h:r.height,x:r.x,right:r.right};})}));
   if(layout.scroll>width||layout.visibleWorlds!==1||layout.canvases!==2||layout.mirrors.some(m=>m.w<44||m.h<44||m.x<0||m.right>width))throw Error('Invalid responsive layout '+width+'/'+i+JSON.stringify(layout));
   report.sizes.push({width,height,level:i+1,...layout});
   await page.screenshot({path:'output/playwright/v2-'+(i+1)+'-'+width+'.png'});
   if(i===11){await page.locator('[data-mirror="M1"]').click();await page.locator('[data-mirror="M2"]').click();if(!await page.getByRole('img',{name:'Y=1，a=0，b=0',exact:true}).isVisible())throw Error('Two-mirror controls failed');}
  }
 }
 await page.setViewportSize({width:1280,height:800});
 for(let i=0;i<30;i++){
  const catalog=i%2?'v2':'academy';await page.locator('#open-levels').click();await page.locator('[data-catalog="'+catalog+'"]').click();await level(catalog==='v2'?12:4);await page.keyboard.press('Space');await page.keyboard.press('Space');await page.waitForTimeout(220);
  const metrics=await page.evaluate(()=>v2Probe.summary()),hotspots=await page.locator('.hotspots > *').count();report.mixed.push({i,catalog,hotspots,...metrics.resources});
 }
 for(const id of ['academy','v2']){const samples=report.mixed.filter(r=>r.catalog===id).slice(2);if(samples.some(s=>s.hotspots!==samples[0].hotspots))throw Error('Hotspot growth '+id);}
 for(const id of ['academy','v2'])for(const world of ['night','day']){
  const samples=report.mixed.filter(r=>r.catalog===id).slice(2).map(r=>r[world]);if(samples.some(s=>s.objects!==samples[0].objects||s.geometries!==samples[0].geometries||s.textures!==samples[0].textures))throw Error('Resource growth '+id+'/'+world);
 }
 // Clear only the new campaign, through its confirmation dialog.
 const old=await page.evaluate(()=>Object.fromEntries(['night-white-logic-gates-v1-progress','night-white-five-v1-progress','night-white-academy-v1-progress'].map(k=>[k,localStorage.getItem(k)])));
 await page.locator('#open-levels').click();await page.locator('#clear-progress').click();await page.locator('#reset-confirm').click();
 const after=await page.evaluate(()=>Object.fromEntries(['night-white-logic-gates-v1-progress','night-white-five-v1-progress','night-white-academy-v1-progress'].map(k=>[k,localStorage.getItem(k)])));
 if(JSON.stringify(old)!==JSON.stringify(after))throw Error('Old progress changed when clearing v2');report.progressIsolation='PASS';
 const measure=async(base,version,index)=>{
  await go(base,version);await page.setViewportSize({width:1280,height:800});await level(index);const values=[];
  for(let run=0;run<3;run++){
   await page.evaluate(()=>v2Probe.start());
   for(let i=0;i<36;i++){await page.keyboard.press(['w','d','s','a'][i%4]);await page.waitForTimeout(32);}
   values.push(await page.evaluate(()=>v2Probe.summary()));
  }
  return values;
 };
 report.performance.baseline=await measure('http://127.0.0.1:5175','academy',4);
 report.performance.old=await measure('http://127.0.0.1:5174','academy',4);
 report.performance.new=await measure('http://127.0.0.1:5174','v2',12);
 const median=a=>a.map(r=>r.frameP95).sort((a,b)=>a-b)[1];
 report.performance.oldRatio=median(report.performance.old)/median(report.performance.baseline);report.performance.newRatio=median(report.performance.new)/median(report.performance.baseline);
 report.performance.status=report.performance.oldRatio<=1.1&&report.performance.newRatio<=1.2?'PASS':'FAIL';
 if(report.performance.status!=='PASS')throw Error('Frame P95 exceeded performance budget '+JSON.stringify(report.performance));
 if(errors.length)throw Error(errors.join(' / '));report.scriptErrors=errors;
 return JSON.stringify(report);
}

// Drives real keyboard/buttons via the Playwright CLI; never injects gameplay state.
import { execFileSync } from 'node:child_process';
import { mkdirSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as G from '../../web/engine.js';
import { V2_LEVELS } from '../../web/levels-v2.js';
import { ACADEMY_LEVELS } from '../../web/academy-levels.js';
import { LEVELS } from '../../web/levels.js';
import { OPTICS_LEVELS } from '../../web/optics-levels.js';
import { REFERENCE_ROUTES } from '../../scripts/verify-v2-levels.mjs';
const arrow={R:'ArrowRight',L:'ArrowLeft'},key=([x,y])=>x===1?'d':x===-1?'a':y===1?'s':'w';
export function uiSteps(l,route,expectedWon=true){
 const s=G.createState(l),steps=[];
 const view=w=>{if(s.view!==w){G.act(l,s,'view',{world:w,recordHistory:false});steps.push({key:'Space'});}};
 const act=(t,a)=>{if(!G.act(l,s,t,a))throw Error(l.id+' rejected '+t);steps.push({key:t==='move'?key(a):t==='push'?a==='right'?'ArrowRight':'ArrowLeft':({activate:'e',unlink:'q',teleport:'f'})[t]});};
 const walk=(x,y)=>{view(s.body.world);const p=G.findPath(l,s,x,y);if(!p)throw Error('No path '+l.id);for(const d of p)act('move',d);};
 for(const [t,...a] of route){
  if(t==='bind'){const w=a[1]||(a[0]==='A'?s.view:l.schemaVersion===2?'day':l.bridges.find(b=>b.id===a[0]).world);view(w);G.select(l,s,a[0],w);steps.push({object:a[0],world:w});act('activate');}
  else if(t==='walk')walk(...a);
  else if(t==='move'){view(s.body.world);for(const c of a[0])act('move',({R:[1,0],L:[-1,0],U:[0,-1],D:[0,1]})[c]);}
  else if(t==='push')for(const c of a[0])act('push',c==='R'?'right':'left');
  else if(t==='portal'){walk(...a);act('teleport');}
  else if(t==='mirror'){view(a[1]||l.science?.world||'night');if(l.schemaVersion===2)view('night');G.act(l,s,'mirror',a[0]);steps.push(l.schemaVersion===2?{mirror:a[0]}:{key:'r'});}
  else if(t==='switch'){view(l.science.world);G.act(l,s,'switch',a[0]);steps.push({switch:a[0]});}
  else if(t==='activate'){G.act(l,s,'activate');steps.push({key:'e'});}
  else act(t,a[0]);
 }
 if(s.won!==expectedWon)throw Error(l.id+' UI plan has unexpected completion');return steps;
}
const originals=[
 [['bind','A'],['push','RRR'],['walk',8,4]],
 [['bind','A'],['push','RR'],['unlink'],['portal',3,3],['portal',9,3],['walk',10,3]],
 [['bind','B'],['portal',3,3],['portal',11,3],['walk',12,3]],
 [['bind','B'],['portal',9,2],['portal',12,4],['bind','C'],['walk',18,4]],
 [['bind','A'],['push','LLRRR'],['bind','B'],['portal',9,3],['portal',12,3],['bind','C'],['walk',15,3]],
];
const academy=originals.map(r=>structuredClone(r));academy[2].unshift(['mirror','M','day']);academy[4].unshift(['mirror','M','day']);academy[3]=[['bind','B'],['walk',9,2],['switch','A'],['portal',9,2],['portal',12,4],['bind','C'],['walk',18,4]];
const optics=originals.map(r=>structuredClone(r));optics[1].unshift(['switch','B']);optics[2].unshift(['mirror','M','day']);optics[4].unshift(['mirror','M','day']);
const catalogs={v2:[V2_LEVELS,REFERENCE_ROUTES],academy:[ACADEMY_LEVELS,academy],original:[LEVELS,originals],optics:[OPTICS_LEVELS,optics]};
const mode=process.argv[2]||'v2',version=['alternatives','goals'].includes(mode)?'v2':mode;const [levels,routes]=catalogs[version];
const alternatives=[
 [6,[['bind','G','day'],['push','RRRLL'],['walk',5,4],['walk',8,4]]],
 [10,[['walk',5,4],['move','U'],['walk',6,2],['move','LL'],['walk',3,1],['move','D'],['bind','B','day'],['walk',10,3]]],
 [10,[['walk',5,2],['move','D'],['walk',6,4],['bind','B','day'],['move','L'],['walk',4,5],['move','U'],['walk',10,3]]],
 [11,[['mirror','M1'],['walk',7,3]]],
 [12,[['move','D'],['mirror','M'],['walk',6,3],['bind','A','night'],['push','R'],['bind','B','day'],['walk',11,3]]],
];
const payload=mode==='goals'?[1,3].map(i=>{const route=structuredClone(routes[i]);route.find(a=>a[0]==='push')[1]=i===1?'L':'LLL';if(i===1)route.pop();const steps=uiSteps(levels[i],route,false),fix=i===1?'LLLR':'LR',finish=i===1?uiSteps(levels[i],[...route,['push',fix],['walk',7,1]]).slice(steps.length+fix.length):[];return {index:i,id:levels[i].id+'-dual-goals',steps,fix,finish,atExit:i!==1};}):mode==='alternatives'?alternatives.map(([i,r],n)=>({index:i,id:levels[i].id+'-alt'+n,steps:uiSteps(levels[i],r)})):levels.map((l,i)=>({index:i,id:l.id,steps:uiSteps(l,routes[i])}));
const origin=process.env.DEMO_UI_ORIGIN||'http://127.0.0.1:5174';
const code=`async () => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(${JSON.stringify(origin+'/?version='+version)});await page.setViewportSize({width:1280,height:800});await page.locator('#chapter').waitFor();
 const results=[];
 for(const route of ${JSON.stringify(payload)}){
  await page.locator('#open-levels').click();await page.locator('[data-level="'+route.index+'"]').click();
  if(await page.locator('#welcome').isVisible())await page.locator('#dismiss-welcome').click();
  for(const step of route.steps){
   if(step.object){await page.locator('#mapping-status').click();await page.locator('[data-select-object="'+step.object+'"][data-source-world="'+step.world+'"]').click();}
   else if(step.mirror)await page.locator('[data-mirror="'+step.mirror+'"]').click();
   else if(step.switch)await page.locator('[data-signal="'+step.switch+'"]').click();
   else await page.keyboard.press(step.key);
   if(await page.locator('#failure').isVisible())throw Error(route.id+' failed in actual UI');
  }
  if(route.fix){
   if(await page.locator('#completion').isVisible())throw Error(route.id+' completed with missing target');
   if(await page.locator('#goals [data-goal="2"].satisfied').isVisible()!==route.atExit||await page.locator('#goals li:not(.satisfied)').count()!==(route.atExit?1:2))throw Error(route.id+' partial target mismatch');
   await page.screenshot({path:'output/playwright/'+route.id+'-incomplete.png'});
   for(const ch of route.fix)await page.keyboard.press(ch==='L'?'ArrowLeft':'ArrowRight');
   for(const step of route.finish)await page.keyboard.press(step.key);
  }
  if(!await page.locator('#completion').isVisible())throw Error(route.id+' actual UI did not complete: '+await page.locator('#message').textContent());
  results.push({id:route.id,status:'PASS',inputs:route.steps.length});
  await page.waitForTimeout(240);await page.screenshot({path:'output/playwright/'+${JSON.stringify(mode)}+'-'+route.id+'-complete.png'});
 }
 if(errors.length)throw Error(errors.join(' / '));
 return JSON.stringify({version:${JSON.stringify(version)},results,scriptErrors:errors});
}`;
mkdirSync('output/playwright',{recursive:true});
writeFileSync('output/playwright/'+mode+'-ui-code.js',code);
const cli=process.env.DEMO_PLAYWRIGHT_CLI||path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'skills/playwright/scripts/playwright_cli.sh');
const output=execFileSync(cli,['--session','night-v2','run-code',code],{encoding:'utf8',maxBuffer:16*1024*1024});
writeFileSync('output/playwright/'+mode+'-ui-results.txt',output);
const error=output.includes('### Error');console.log(output.split('\n').filter(l=>l.includes('"results"')||l.includes('Error')||l.includes('Timeout')||l.includes('Result')).join('\n'));
if(error)process.exitCode=1;

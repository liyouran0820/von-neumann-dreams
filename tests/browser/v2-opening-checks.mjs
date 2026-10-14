// Real UI checks for the user's revised first and second levels.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const check=async(page)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/?version=v2');await page.setViewportSize({width:1280,height:800});await page.locator('#chapter').waitFor();
 const load=async n=>{await page.locator('#open-levels').click();await page.locator('[data-level="'+(n-1)+'"]').click();};
 const keys=async sequence=>{for(const k of sequence)await page.keyboard.press(k);};
 const visible=async name=>{if(!await page.getByRole('img',{name,exact:true}).isVisible())throw Error('Missing actual circuit state: '+name);return name;};
 const report={first:[],second:[],mobile:[]};
 await load(1);report.first.push(await visible('Y=0，A=0，B=0'));
 if(await page.locator('[data-anchor="readout:entity-K"]').count()||await page.locator('[data-anchor="readout:input-b"]').count())throw Error('Removed night weight/plate still present');
 await keys(['e','ArrowRight']);report.first.push(await visible('Y=0，A=1，B=0'));
 await keys(['ArrowRight']);report.first.push(await visible('Y=1，A=1，B=1'));
 await page.keyboard.press('Space');if(!await page.locator('#day-hotspots [data-anchor="readout:input-B"]').isVisible())throw Error('White target B missing');
 await page.waitForTimeout(240);await page.screenshot({path:'output/playwright/v2-first-white-B.png'});
 await keys(['Space','ArrowRight','ArrowLeft']);report.first.push(await visible('Y=0，A=0，B=1'));
 await load(2);if(await page.locator('#science-circuit svg').count()!==2)throw Error('Second level must contain two actual AND nodes');
 report.second.push(await visible('C=0，a=0，w=0'));report.second.push(await visible('Y=0，C=0，b=0'));
 await keys(['e','ArrowLeft','ArrowLeft','ArrowLeft','ArrowLeft','ArrowRight']);report.second.push(await visible('C=1，a=1，w=1'));report.second.push(await visible('Y=0，C=1，b=0'));
 await page.keyboard.press('s');report.second.push(await visible('Y=1，C=1，b=1'));
 await page.waitForTimeout(240);await page.screenshot({path:'output/playwright/v2-second-two-AND.png'});
 await page.keyboard.press('z');await visible('C=1，a=1，w=1');report.second.push(await visible('Y=0，C=1，b=0'));
 await keys(['s','ArrowRight']);report.second.push(await visible('Y=0，C=0，b=1'));
 for(const [width,height] of [[390,844],[320,740]]){
  await page.setViewportSize({width,height});
  for(const n of [1,2]){
   await load(n);if(n===1)await page.keyboard.press('Space');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Opening level mobile overflow');
   if(n===2){await page.locator('#course-collapse').click();if(!await page.getByRole('img',{name:'C=0，a=0，w=0',exact:true}).isVisible())throw Error('Mobile first AND not accessible');if(!await page.getByRole('img',{name:'Y=0，C=0，b=0',exact:true}).isVisible())throw Error('Mobile second AND not accessible');await page.locator('#course-collapse').click();}
   await page.waitForTimeout(240);await page.screenshot({path:'output/playwright/v2-opening-'+n+'-'+width+'.png'});report.mobile.push({level:n,width,height,status:'PASS'});
  }
 }
 if(errors.length)throw Error(errors.join(' / '));report.scriptErrors=errors;report.status='PASS';return JSON.stringify(report);
};
const cli=process.env.DEMO_PLAYWRIGHT_CLI||path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'skills/playwright/scripts/playwright_cli.sh');
const code=check.toString().replaceAll('http://127.0.0.1:5174',process.env.DEMO_UI_ORIGIN||'http://127.0.0.1:5174');
const command=spawnSync(cli,['--session','night-v2','run-code',code],{encoding:'utf8',maxBuffer:16*1024*1024}),output=command.stdout||command.stderr;
mkdirSync('output/playwright',{recursive:true});writeFileSync('output/playwright/opening-results.txt',output);
if(command.status!==0||output.includes('### Error')){console.error(output.split('### Ran')[0]);process.exitCode=1;}else{const line=output.split('\n').find(l=>l.startsWith('"{'));if(!line)throw Error('No opening check results');const report=JSON.parse(JSON.parse(line));writeFileSync('output/playwright/opening-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}

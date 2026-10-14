// Verify the distributed file's entry point, rather than relying on a URL flag.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const check=async(page)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const load=async url=>{await page.goto(url);await page.locator('#chapter').waitFor();};
 const expectSize=async n=>{const label=await page.locator('#chapter').textContent();if(!label.endsWith('1 / '+n))throw Error('Wrong entry: '+label);return label;};
 const catalog=async id=>{await page.locator('#open-levels').click();await page.locator('[data-catalog="'+id+'"]').click();};
 await load('http://127.0.0.1:5176/');const distributed=await expectSize(13);
 if(!await page.getByRole('img',{name:'Y=0，A=0，B=0',exact:true}).isVisible())throw Error('Old first level');
 await page.locator('#open-levels').click();await page.locator('[data-level="1"]').click();
 if(await page.locator('#science-circuit svg').count()!==2||!await page.getByRole('img',{name:'C=0，a=0，w=0',exact:true}).isVisible()||!await page.getByRole('img',{name:'Y=0，C=0，b=0',exact:true}).isVisible())throw Error('Old second level');
 const assets=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>!r.name.endsWith('favicon.ico')).map(r=>r.name));if(assets.length)throw Error('Single file requests external assets');
 await catalog('academy');await expectSize(5);await page.reload();await expectSize(5);
 await catalog('v2');await expectSize(13);await page.reload();await expectSize(13);
 await page.screenshot({path:'output/playwright/export-default-v2.png'});
 await load('file:///Users/liyouran/Documents/ChatGPT/BNBU_AI_PC/dist/server-upload-v2/index.html');const localFile=await expectSize(13);
 await load('http://127.0.0.1:5174/');const developmentDefault=await expectSize(5);
 await load('http://127.0.0.1:5174/?version=v2');const developmentV2=await expectSize(13);
 if(errors.length)throw Error(errors.join(' / '));return JSON.stringify({status:'PASS',distributed,localFile,developmentDefault,developmentV2,menuReload:'PASS',externalAssets:assets,scriptErrors:errors});
};
const cli=process.env.DEMO_PLAYWRIGHT_CLI||path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'skills/playwright/scripts/playwright_cli.sh');
const result=spawnSync(cli,['--session','index-upload','run-code',check.toString()],{encoding:'utf8',maxBuffer:8*1024*1024}),output=result.stdout||result.stderr;
mkdirSync('output/playwright',{recursive:true});writeFileSync('output/playwright/export-default-results.txt',output);
if(result.status!==0||output.includes('### Error')){console.error(output.split('### Ran')[0]);process.exitCode=1;}else{const line=output.split('\n').find(l=>l.startsWith('"{'));if(!line)throw Error('Missing export check result');const report=JSON.parse(JSON.parse(line));writeFileSync('output/playwright/export-default-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}

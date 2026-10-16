// Runs the existing CLI in an isolated session. Gameplay uses real UI inputs.
import {spawnSync} from 'node:child_process';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import os from 'node:os';
const mode=process.argv[2]||'live';if(!['live','mixed'].includes(mode))throw Error('Use live or mixed');
const run=(await import('./v2-'+mode+'-checks.js')).default;
const cli=process.env.DEMO_PLAYWRIGHT_CLI||path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'skills/playwright/scripts/playwright_cli.sh');
const code=run.toString().replaceAll('http://127.0.0.1:5174',process.env.DEMO_UI_ORIGIN||'http://127.0.0.1:5174').replaceAll('http://127.0.0.1:5175',process.env.DEMO_BASELINE_ORIGIN||'http://127.0.0.1:5175');
const command=spawnSync(cli,['--session','night-v2','run-code',code],{encoding:'utf8',maxBuffer:16*1024*1024}),output=command.stdout||command.stderr;
mkdirSync('output/playwright',{recursive:true});writeFileSync('output/playwright/'+mode+'-results.txt',output);
if(command.status!==0||output.includes('### Error')){console.error(output.split('### Ran')[0]);process.exitCode=1;}else{
 const line=output.split('\n').find(l=>l.startsWith('"{'));if(!line)throw Error('CLI returned no check results');const result=JSON.parse(JSON.parse(line));
 writeFileSync('output/playwright/'+mode+'-results.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(mode==='live'?{legacyMotion:Object.fromEntries(Object.entries(result.legacyMotion).map(([k,v])=>[k,v.status])),liveMotion:Object.fromEntries(Object.entries(result.liveMotion).map(([k,v])=>[k,v.status||v])),mirrorFocus:result.mirrorFocus,scriptErrors:result.scriptErrors}:{sizes:result.sizes.length,switches:result.mixed.length,progressIsolation:result.progressIsolation,performance:result.performance,scriptErrors:result.scriptErrors}));
}

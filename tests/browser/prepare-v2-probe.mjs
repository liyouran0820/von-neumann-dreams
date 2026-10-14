import {build} from 'esbuild';import{readFile,mkdir,writeFile,copyFile}from'node:fs/promises';import path from'node:path';
const root=process.cwd();for(const base of [root,path.join(root,'artifacts/v20-baseline')]){
 await mkdir(path.join(base,'web/generated'),{recursive:true});
 if(base!==root)await copyFile(path.join(root,'tests/browser/v2-render-probe.js'),path.join(base,'tests/browser/v2-render-probe.js'));
 await build({entryPoints:[path.join(base,'tests/browser/v2-render-probe.js')],bundle:true,format:'iife',outfile:path.join(base,'web/generated/v2-render-probe.js')});
 const html=(await readFile(path.join(base,'web/index.html'),'utf8')).replace('src="./generated/app.js"','src="./v2-render-probe.js"').replace('href="./style.css"','href="../style.css"');await writeFile(path.join(base,'web/generated/v2-render-probe.html'),html);
}
console.log('Render probes ready on development servers.');

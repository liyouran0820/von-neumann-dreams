import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
const generated=new URL('../../web/generated/',import.meta.url);
await mkdir(generated,{recursive:true});
await build({entryPoints:[new URL('./mirror-turn-harness.js',import.meta.url).pathname],bundle:true,format:'iife',outfile:new URL('mirror-turn-harness.js',generated).pathname});
await writeFile(new URL('mirror-turn-harness.html',generated),`<!doctype html><meta charset="utf-8"><title>反光板旋转验收</title><style>body{margin:0;background:#3d4a59;color:white}#day,#night{position:absolute;inset:0}#day{visibility:hidden}aside{position:fixed;left:8px;top:8px;z-index:2;background:#253640;padding:8px;max-width:30vw;max-height:25vh;overflow:auto}pre{font:10px monospace;white-space:pre-wrap}</style><div id="day"></div><div id="night"></div><aside><button id="verify-turn">验证同步旋转</button><select id="case"><option value="start">起始</option><option value="quarter">47.5ms</option><option value="middle">95ms</option><option value="finish">190ms</option></select><pre id="report">待执行</pre></aside><script src="mirror-turn-harness.js"></script>`);
console.log('旋转验收：http://127.0.0.1:5173/generated/mirror-turn-harness.html');

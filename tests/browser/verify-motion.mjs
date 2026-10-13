import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
const root=fileURLToPath(new URL('../../',import.meta.url));
await mkdir(path.join(root,'web/generated'),{recursive:true});
await build({entryPoints:[path.join(root,'tests/browser/motion-harness.js')],bundle:true,format:'iife',outfile:path.join(root,'web/generated/motion-harness.js')});
await writeFile(path.join(root,'web/generated/motion-harness.html'),`<!doctype html><meta charset="utf-8"><title>网页动效验收</title><style>body{margin:0;background:#3d4a59}#day,#night{width:100vw;height:100vh}#day{background:#dde1df}aside{position:absolute;top:12px;left:12px;padding:12px;background:#fff;max-width:80vw;font:14px system-ui}pre{white-space:pre-wrap}@media(max-width:600px){pre{display:none}}</style><div id="day"></div><div id="night"></div><aside><button id="verify-impact">执行止挡验收</button><button id="verify-fall">执行掉落验收</button><select id="case" aria-label="动作关键帧"><option value="initial">初始</option><option value="compress">夜侧压缩</option><option value="rebound">夜侧回弹</option><option value="day-left">白侧左撞击</option><option value="finish">结束归位</option><option value="reduced">减少动态</option><option value="fall-start">白侧失衡</option><option value="fall-middle">白侧下坠</option><option value="fall-night">夜侧下坠</option><option value="fall-end">掉落结束</option><option value="fall-undo">掉落撤销</option><option value="fall-reduced">减少动态掉落</option></select><pre id="report">待执行</pre></aside><script src="motion-harness.js"></script>`);
console.log('验收场景：http://127.0.0.1:5173/generated/motion-harness.html');

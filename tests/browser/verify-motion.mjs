import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
const root=fileURLToPath(new URL('../../',import.meta.url));
await mkdir(path.join(root,'web/generated'),{recursive:true});
await build({entryPoints:[path.join(root,'tests/browser/motion-harness.js')],bundle:true,format:'iife',outfile:path.join(root,'web/generated/motion-harness.js')});
await writeFile(path.join(root,'web/generated/motion-harness.html'),`<!doctype html><meta charset="utf-8"><title>网页动效验收</title><style>body{margin:0;background:#3d4a59}#day,#night{width:100vw;height:100vh}#day{background:#dde1df}aside{position:absolute;top:12px;left:12px;padding:12px;background:#fff;max-width:80vw;font:14px system-ui}pre{white-space:pre-wrap}@media(max-width:600px){pre{display:none}}</style><div id="day"></div><div id="night"></div><aside><button id="verify-single">执行贴墙后推动验收</button><button id="verify-impact">执行止挡验收</button><button id="verify-fall">执行掉落验收</button><select id="case" aria-label="动作关键帧"><option value="initial">初始</option><option value="single-arrival">刚贴住止挡（无碰撞）</option><option value="blocked-single">贴住后单击撞向止挡</option><option value="compress">夜侧压缩</option><option value="rebound">夜侧回弹</option><option value="day-left">白侧左撞击</option><option value="finish">结束归位</option><option value="reduced">减少动态</option><option value="fall-start">白侧失衡</option><option value="fall-middle">白侧下坠</option><option value="fall-night">夜侧下坠</option><option value="fall-end">掉落结束</option><option value="fall-undo">掉落撤销</option><option value="fall-reduced">减少动态掉落</option></select><pre id="report">待执行</pre></aside><script src="motion-harness.js"></script>`);
console.log('验收场景：http://127.0.0.1:5173/generated/motion-harness.html');
await build({entryPoints:[path.join(root,'tests/browser/live-push-probe.js')],bundle:true,format:'iife',outfile:path.join(root,'web/generated/live-push-probe.js')});
const liveHTML=(await readFile(path.join(root,'web/index.html'),'utf8'))
 .replace('href="./style.css"','href="../style.css"')
 .replace('src="./generated/app.js"','src="./live-push-probe.js"')
 .replace('</body>','<pre id="push-probe" role="status" style="position:fixed;right:12px;top:12px;z-index:30;background:#fff;color:#152738;padding:12px;font:13px monospace;pointer-events:none">等待实际单击</pre><pre id="push-samples" hidden></pre></body>');
await writeFile(path.join(root,'web/generated/live-push-probe.html'),liveHTML);
console.log('实际按钮帧采样：http://127.0.0.1:5173/generated/live-push-probe.html');

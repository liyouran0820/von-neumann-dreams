import { readFile, mkdir, writeFile } from 'node:fs/promises';
const source = new URL('../web/', import.meta.url);
const [html, css, engine, levels, icons, renderer, app] = await Promise.all(['index.html', 'style.css', 'engine.js', 'levels.js', 'icons.js', 'renderer.js', 'app.js'].map(file => readFile(new URL(file, source), 'utf8')));
const clean = text => text.replace(/^import .*?;\s*$/gm, '').replace(/\bexport (?=(?:const|function)\b)/g, '');
const module = (name, code) => {
  const exports = [...code.matchAll(/export (?:function|const) (\w+)/g)].map(match => match[1]);
  return `const ${name}=(()=>{${clean(code)}\nreturn {${exports.join(',')}};})();`;
};
const js = [module('Game', engine), module('Levels', levels), module('Icons', icons), module('View', renderer), `(()=>{${clean(app)}})();`].join('\n');
const output = html.replace(/<link rel="stylesheet" href="\.\/style.css">/, () => `<style>${css}</style>`).replace(/<script type="module" src="\.\/app.js"><\/script>/, () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`);
const dist = new URL('../dist/', import.meta.url);
await mkdir(dist, { recursive: true });
await writeFile(new URL('index.html', dist), output);
console.log('已生成 dist/index.html，全部脚本、样式与图标均已内联。');

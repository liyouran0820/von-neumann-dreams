import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { bundleGame } from './bundle.mjs';

const source = new URL('../web/', import.meta.url);
const [html, css, result] = await Promise.all([
  readFile(new URL('index.html', source), 'utf8'),
  readFile(new URL('style.css', source), 'utf8'),
  bundleGame(),
]);
const script = result.outputFiles[0].text;
await mkdir(new URL('generated/', source), { recursive: true });
await writeFile(new URL('generated/app.js', source), script);
const output = html.replace('<link rel="stylesheet" href="./style.css">', () => `<style>${css}</style>`)
  .replace('<script src="./generated/app.js" defer></script>', () => `<script>${script.replace(/<\/script/gi, '<\\/script')}</script>`);
const dist = new URL('../dist/', import.meta.url);
await mkdir(dist, { recursive: true });
await writeFile(new URL('index.html', dist), output);
console.log('已生成 3D 游戏：web/generated/app.js 与内联 dist/index.html。');

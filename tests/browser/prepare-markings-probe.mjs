import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const generated = new URL('../../web/generated/', import.meta.url);
await mkdir(generated, { recursive: true });
await build({ entryPoints: [new URL('./markings-probe.js', import.meta.url).pathname], bundle: true, format: 'iife', outfile: new URL('markings-probe.js', generated).pathname });
const html = (await readFile(new URL('../../web/index.html', import.meta.url), 'utf8')).replace('src="./generated/app.js"', 'src="./markings-probe.js"').replace('href="./style.css"', 'href="../style.css"');
await writeFile(new URL('markings-probe.html', generated), html);
console.log('Read-only scene probe: /generated/markings-probe.html');

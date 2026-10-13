import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function bundleGame() {
  const threeLicense = await readFile(new URL('../node_modules/three/LICENSE', import.meta.url), 'utf8');
  const iconSource = await readFile(new URL('../web/icons.js', import.meta.url), 'utf8');
  const iconLicense = iconSource.slice(0, iconSource.indexOf('*/') + 2);
  return build({
    entryPoints: [fileURLToPath(new URL('../web/app.js', import.meta.url))],
    bundle: true, write: false, format: 'iife', target: 'es2022',
    minify: true, legalComments: 'inline',
    banner: { js: `/*! Three.js\n${threeLicense}\n*/\n${iconLicense}` },
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));

test('含空格、中文及#的仓库路径仍能生成完整网页包', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), '夜白 build #'));
  try {
    for (const name of ['web', 'scripts', 'package.json']) {
      await cp(path.join(root, name), path.join(fixture, name), {
        recursive: true,
        filter: source => !source.startsWith(path.join(root, 'web', 'generated')),
      });
    }
    await symlink(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    const { stdout } = await run(process.execPath, ['scripts/build.mjs'], { cwd: fixture });
    assert.match(stdout, /已生成 3D 游戏/);
    const html = await readFile(path.join(fixture, 'dist', 'index.html'), 'utf8');
    const script = await readFile(path.join(fixture, 'web', 'generated', 'app.js'), 'utf8');
    assert.ok(script.length > 1000);
    assert.match(html, /<style>/);
    assert.match(html, /<script>/);
    assert.doesNotMatch(html, /<script src="\.\/generated\/app\.js"/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

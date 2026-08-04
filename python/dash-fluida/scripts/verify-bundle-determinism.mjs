#!/usr/bin/env node
// Builds the Dash frontend bundle twice in a row and fails if either
// dash_fluida.min.js or its .map differs between the two runs. This
// is what actually proves the build is deterministic — not just that
// it matches whatever happens to already be committed, which would
// stay green even if a new nondeterminism were introduced alongside
// a real source change that also touched the bundle.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = path.join(packageDir, 'src', 'dash_fluida', 'dash_fluida.min.js');
const mapPath = `${bundlePath}.map`;

function build() {
  execFileSync('pnpm', ['--filter', 'dash-fluida-frontend', 'run', 'build'], {
    cwd: path.join(packageDir, '..', '..'),
    stdio: 'inherit',
  });
}

function snapshot(dir) {
  copyFileSync(bundlePath, path.join(dir, 'dash_fluida.min.js'));
  copyFileSync(mapPath, path.join(dir, 'dash_fluida.min.js.map'));
}

const tmp = mkdtempSync(path.join(tmpdir(), 'fluida-bundle-determinism-'));
const firstDir = path.join(tmp, 'first');
const secondDir = path.join(tmp, 'second');

try {
  execFileSync('node', ['-e', `require('fs').mkdirSync(${JSON.stringify(firstDir)})`]);
  execFileSync('node', ['-e', `require('fs').mkdirSync(${JSON.stringify(secondDir)})`]);

  if (!existsSync(bundlePath) || !existsSync(mapPath)) {
    console.error('Run this after an initial build exists, or just let it build twice from scratch.');
  }

  build();
  snapshot(firstDir);

  build();
  snapshot(secondDir);

  const jsA = readFileSync(path.join(firstDir, 'dash_fluida.min.js'));
  const jsB = readFileSync(path.join(secondDir, 'dash_fluida.min.js'));
  const mapA = readFileSync(path.join(firstDir, 'dash_fluida.min.js.map'));
  const mapB = readFileSync(path.join(secondDir, 'dash_fluida.min.js.map'));

  let failed = false;

  if (!jsA.equals(jsB)) {
    console.error('dash_fluida.min.js differs between two consecutive builds.');
    failed = true;
  }

  if (!mapA.equals(mapB)) {
    console.error('dash_fluida.min.js.map differs between two consecutive builds.');
    failed = true;
  }

  if (failed) {
    process.exit(1);
  }

  console.log('dash_fluida.min.js and .map are identical across two consecutive builds.');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

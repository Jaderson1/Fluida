// Copies the tsup build output into src/dash_fluida/, where
// _js_dist (in FluidaGrid.py) expects to find it, and where
// pyproject.toml's package-data configuration picks it up for the
// wheel.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, '..', 'dist', 'dash_fluida.global.js');
const sourceMap = `${source}.map`;
const destinationDir = path.join(here, '..', 'src', 'dash_fluida');
const destination = path.join(destinationDir, 'dash_fluida.min.js');
const destinationMap = `${destination}.map`;

if (!existsSync(source)) {
  console.error(`Expected build output not found: ${source}`);
  process.exit(1);
}

if (!existsSync(destinationDir)) {
  mkdirSync(destinationDir, { recursive: true });
}

copyFileSync(source, destination);
if (existsSync(sourceMap)) {
  copyFileSync(sourceMap, destinationMap);
}

console.log(`Copied ${source} -> ${destination}`);

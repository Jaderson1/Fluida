// Copies the tsup build output into src/dash_fluida/, where
// _js_dist (in FluidaGrid.py) expects to find it, and where
// pyproject.toml's package-data configuration picks it up for the
// wheel.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, '..', 'dist', 'dash_fluida.global.js');
const sourceMap = `${source}.map`;
const destinationDir = path.join(here, '..', 'src', 'dash_fluida');
const destinationName = 'dash_fluida.min.js';
const destination = path.join(destinationDir, destinationName);
const destinationMapName = `${destinationName}.map`;
const destinationMap = path.join(destinationDir, destinationMapName);

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

  // tsup names its own output dash_fluida.global.js(.map) — copying
  // to dash_fluida.min.js above renames the file but not the
  // sourceMappingURL comment still inside it, which otherwise keeps
  // pointing at the old .global.js.map name a browser would then
  // request and fail to find next to the renamed file.
  const contents = readFileSync(destination, 'utf8');
  const rewritten = contents.replace(
    /\/\/# sourceMappingURL=.*$/m,
    `//# sourceMappingURL=${destinationMapName}`,
  );
  writeFileSync(destination, rewritten);
}

console.log(`Copied ${source} -> ${destination}`);

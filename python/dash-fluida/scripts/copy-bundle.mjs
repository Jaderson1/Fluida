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

  normalizeSourceMap(destinationMap);
}

console.log(`Copied ${source} -> ${destination}`);

/**
 * Makes the .map byte-identical across OS-different builds of the
 * same source: sourcesContent embeds each file's raw text (line
 * endings and all) and `sources` uses the OS's path separator, but a
 * debugger maps positions via `mappings`, not by comparing
 * sourcesContent bytes — normalizing both here changes nothing about
 * how the map works, only makes two builds of the same source match.
 */
function normalizeSourceMap(mapPath) {
  const raw = readFileSync(mapPath, 'utf8');
  const map = JSON.parse(raw);

  if (Array.isArray(map.sources)) {
    map.sources = map.sources.map((sourcePath) => sourcePath.split(path.sep).join('/'));
  }

  if (Array.isArray(map.sourcesContent)) {
    map.sourcesContent = map.sourcesContent.map((content) =>
      typeof content === 'string' ? content.replace(/\r\n/g, '\n') : content,
    );
  }

  // JSON.stringify preserves this object's own key insertion order,
  // which is already the same across platforms since it comes from
  // parsing the same tsup output — only the values above needed
  // normalizing, not the key order itself.
  writeFileSync(mapPath, `${JSON.stringify(map)}\n`);
}

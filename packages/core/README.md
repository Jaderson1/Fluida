# @fluida/core

The framework-agnostic engine behind Fluida. Computes layout decisions from either a viewport or a real measured container — no DOM rendering, no UI framework dependency, no runtime dependencies at all.

**Status:** pre-release, `0.0.1`. Not published to npm yet.

## What this package is

`@fluida/core` owns exactly one thing: turning either a viewport's environment, or a container's real measured size plus an item count, into a small, deterministic set of layout values. It does not render anything and does not require React, or any other framework — verified directly in this package's own `package.json`, which declares no runtime dependencies, and in its source, which contains no framework import of any kind.

It is written for the browser (its viewport-reading logic uses `window`, `window.visualViewport`, and `resize`/`orientationchange` events) but works safely in Node/SSR contexts too — see [Server-side rendering](#server-side-rendering) below.

## Installation

Not available on npm yet.

```json
{ "dependencies": { "@fluida/core": "workspace:*" } }
```

## Viewport-based layout

### `createFluida(config?: FluidaConfig): FluidaInstance`

```ts
import { createFluida } from '@fluida/core';

const fluida = createFluida();

console.log(fluida.getLayout());
// {
//   breakpoint: 'mobile',
//   grid: { columns: 4 },
//   spacing: { page: 16 },
//   typography: { scale: 1 },
//   container: { maxWidth: 480 },
// }

fluida.destroy();
```

Reads the environment immediately and synchronously — nothing is deferred. Throws `FluidaConfigError` synchronously if `config` is invalid.

### `FluidaInstance`

```ts
interface FluidaInstance {
  getSnapshot(): FluidaSnapshot;
  getServerSnapshot(): FluidaSnapshot;
  getLayout(): LayoutTokens;
  getServerLayout(): LayoutTokens;
  subscribe(listener: () => void): () => void;
  destroy(): void;
}
```

- **`getSnapshot()`** — the raw environment reading: `{ width, height, orientation, pixelRatio }`.
- **`getLayout()`** — everything derived from it: `{ breakpoint, grid, spacing, typography, container }`.
- Both return the same object reference across calls when nothing relevant changed, and update independently of each other.
- **`getServerSnapshot()` / `getServerLayout()`** — a fixed fallback (`width: 0`, `orientation: 'portrait'`, `pixelRatio: 1`, and whatever layout that width resolves to), the same on every call, in any environment.
- **`subscribe(listener)`** — registers `listener` for snapshot/layout changes; returns an unsubscribe function. Listeners attach lazily, only on the first real call.
- **`destroy()`** — removes all listeners and clears all subscribers. Safe to call more than once.

### Configuration

```ts
interface FluidaConfig {
  breakpoints?: Readonly<Record<'mobile' | 'tablet' | 'desktop', number>>;
  spacing?: {
    minimumWidth?: number;
    maximumWidth?: number;
    minimumPadding?: number;
    maximumPadding?: number;
  };
  typography?: {
    minimumWidth?: number;
    maximumWidth?: number;
    minimumScale?: number;
    maximumScale?: number;
  };
  container?: {
    tiers?: ReadonlyArray<{ minimumWidth: number; containerMaxWidth: number }>;
  };
}
```

Every field is optional. `breakpoints` drives both `breakpoint` and `grid.columns`. `spacing` and `typography` interpolate linearly between a minimum and maximum across a width range, clamped flat outside it. `container.tiers` is a set of discrete steps, with thresholds independent from `breakpoints` by design.

### `FluidaConfigError`

```ts
import { createFluida, FluidaConfigError } from '@fluida/core';

try {
  createFluida({ breakpoints: {} });
} catch (error) {
  if (error instanceof FluidaConfigError) {
    console.error(error.message);
  }
}
```

Thrown synchronously for invalid configuration: empty breakpoints or container tiers, non-finite or negative values where a real size is expected, or duplicate thresholds.

## Container-based layout

### `computeContainerLayout(containerWidth, containerHeight, options): ContainerLayoutResult`

A separate, standalone pure function — not tied to `createFluida()` or any instance. Given a container's real measured size and a known item count, computes the column/row count and cell size.

```ts
import { computeContainerLayout } from '@fluida/core';

computeContainerLayout(800, 600, { itemCount: 8 });
// { columns: 3, rows: 3, cellWidth: 189.33..., cellHeight: 189.33... }
```

```ts
interface ContainerLayoutOptions {
  itemCount: number;
  strategy?: 'fit' | 'fill' | 'balanced' | 'preserve-ratio'; // default 'fit'
  gap?: number;         // default 16
  aspectRatio?: number; // width / height; only used by 'preserve-ratio'; default 1
}

interface ContainerLayoutResult {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
}
```

**Parameters.** `containerWidth`/`containerHeight` are the real measured dimensions of the container, in the same units your consumer measures in (pixels, for the React adapter). `itemCount` is required; the other three fields are optional.

**Return value.** `columns`/`rows` describe the grid shape; `cellWidth`/`cellHeight` are the computed size for each cell.

**Algorithm.** A search across every possible column count (1 through `itemCount`) finds the one that fills the given width and height exactly, with the least-distorted (closest to square) resulting cell. Each strategy then applies a different rule on top of that same chosen column count:

- **`fit`** (default) — forces a square cell, sized to the smaller of the fill answer's width and height. Fits without overflow; may leave space in one axis.
- **`fill`** — uses the fill answer exactly, in both axes. Uses 100% of the space; the cell may not be square.
- **`balanced`** — a square cell sized to the geometric mean of the fill answer's width and height — less stretched than `fill`, less conservative than `fit`.
- **`preserve-ratio`** — forces the cell to the configured `aspectRatio` exactly, even if that leaves leftover space.

**Container not yet measured, or too small to fit anything.** If `containerWidth`/`containerHeight` are `0` (or no column count produces a positive cell size at all — for example, gaps alone exceeding the available space), the function returns `{ columns: 1, rows: itemCount, cellWidth: 0, cellHeight: 0 }` — a real, valid result rather than `null` or an exception.

**Errors.** Throws `FluidaConfigError` for `itemCount < 1`, a negative `gap`, or a non-positive `aspectRatio`.

## Server-side rendering

`typeof window !== 'undefined'` decides which environment reader `createFluida()` uses — nothing to configure. The server reader never touches `window` or `document`. `computeContainerLayout` has no browser dependency at all; calling it with `(0, 0, options)` — the natural "not measured" case on a server — returns the same valid fallback described above.

## Compatibility

Published as both ESM and CommonJS from a single build:

```json
"main": "./dist/index.cjs",
"module": "./dist/index.js",
"types": "./dist/index.d.ts"
```

No runtime dependencies. `sideEffects: false`.

## Building an adapter for another framework

Nothing in this package is React-specific. An adapter for a different framework needs only: a way to call `subscribe()` and re-render/re-emit on notification, a way to read `getSnapshot()`/`getLayout()` (or their server-mode counterparts), and, for container-based layout, its own way of measuring a real element's size before calling `computeContainerLayout()` with the result. See [`@fluida/react`](../react/README.md) for a concrete implementation of that shape.

## License

MIT — see [`LICENSE`](LICENSE).
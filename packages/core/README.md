# @fluida/core

The framework-agnostic engine behind Fluida. Computes layout decisions from either a viewport or a real measured container — no DOM rendering, no UI framework dependency, no runtime dependencies.

[![npm](https://img.shields.io/npm/v/@fluida/core)](https://www.npmjs.com/package/@fluida/core)

**Status:** public beta, `0.2.0`.

## Installation

```bash
npm install @fluida/core
```

Or with pnpm:

```bash
pnpm add @fluida/core
```

## What this package is

`@fluida/core` turns either a viewport's environment, or a container's real measured size plus an item count, into deterministic layout values. It does not render anything and does not require React or any other framework.

## Viewport-based layout

### `createFluida(config?: FluidaConfig): FluidaInstance`

```ts
import { createFluida } from '@fluida/core';

const fluida = createFluida();
console.log(fluida.getLayout());
fluida.destroy();
```

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
    tiers?: ReadonlyArray<{
      minimumWidth: number;
      containerMaxWidth: number;
    }>;
  };
}
```

`typography.scale` and `spacing.page` also grow a little further with viewport *height*, but only once width is already in the large-display range (≥1920px) — an internal behavior, not something exposed in this config. `container.maxWidth` is never affected by height. See the root README's "Large-screen and 4K behavior" section for why.

## Container-based layout

### `computeContainerLayout(containerWidth, containerHeight, options)`

```ts
import { computeContainerLayout } from '@fluida/core';

const layout = computeContainerLayout(800, 600, {
  itemCount: 8,
  strategy: 'fit',
  gap: 16,
});
```

```ts
function computeContainerLayout(
  containerWidth: number,
  containerHeight: number | undefined,
  options: ContainerLayoutOptions,
): ContainerLayoutResult;

interface ContainerLayoutOptions {
  itemCount: number;
  strategy?: 'fit' | 'fill' | 'balanced' | 'preserve-ratio';
  gap?: number;
  aspectRatio?: number;
  minItemWidth?: number;
}

interface ContainerLayoutResult {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
}
```

`itemCount` must be a positive integer — `1.5`, `NaN`, `Infinity`, or a numeric string all raise `FluidaConfigError`, not a coerced or rounded value. `containerWidth` and `containerHeight` (when provided) must each be finite and `>= 0`; `0` is valid and represents a container not yet measured. `strategy`, if set, must be one of the four listed below — anything else raises `FluidaConfigError` rather than silently behaving like `fill`.

Strategies:

- **`fit`** — square cells, sized to the smaller of the two available dimensions. Choose it for uniform, icon-like content where a non-square cell would look wrong.
- **`fill`** — uses the full available width and height as-is, whatever shape that leaves the cell. Choose it when the content itself defines its own aspect ratio (e.g. text) and squeezing it into a specific shape would waste space. Requires a known `containerHeight`.
- **`balanced`** — the smaller of `fill`'s two dimensions is left unchanged; the larger one is pulled toward it (geometric mean with the smaller) without ever exceeding either original dimension. Less distorted than `fill`, without forcing a square like `fit`. Requires a known `containerHeight`, for the same reason `fill` does.
- **`preserve-ratio`** — sized to a fixed `aspectRatio` you provide (width / height), as large as fits within the space. Choose it for charts, images, or video, where the shape is fixed but the size should adapt.

`minItemWidth`, when set, excludes any column count whose resulting cell would be narrower than it, before that candidate is even scored — it restricts which column counts are eligible; it does not change how the winner among the eligible ones is chosen or how the strategy sizes the final cell. Omitted (the default), it applies no such constraint. If no column count satisfies it, the same not-yet-fitting fallback (`columns: 1`, zero-size cell) is returned, not a distinct error.

## Auto-height

`containerHeight` can be omitted (`undefined`) for `fit` and `preserve-ratio` specifically, and only when `minItemWidth` is also set:

```ts
const layout = computeContainerLayout(800, undefined, {
  itemCount: 4,
  strategy: 'preserve-ratio',
  aspectRatio: 4 / 3,
  minItemWidth: 300,
});
```

Without a known height, the usual distortion-minimizing column search has nothing to compare `cellWidth` against — `minItemWidth` becomes the sole basis for choosing a column count instead, and `cellHeight` is derived from the resulting `cellWidth` directly (equal to it for `fit`; divided by `aspectRatio` for `preserve-ratio`). `fill` and `balanced` cannot do this — both compute cell size directly from `containerHeight`, and raise `FluidaConfigError` if it's omitted, as does `fit`/`preserve-ratio` without `minItemWidth` also set.

Total height, if you need it for styling an element, is `rows * cellHeight + (rows - 1) * gap` — this package does not compute or return it; each adapter (`@fluida/react`, `dash-fluida`) computes and applies it directly.

## Server-side rendering

`createFluida()` automatically chooses a browser or server environment reader. `computeContainerLayout()` has no browser dependency.

## Compatibility

Published as ESM and CommonJS with TypeScript declarations.

No runtime dependencies. `sideEffects: false`.

## Building an adapter for another framework

Nothing in this package is React-specific. See [`@fluida/react`](../react/README.md) for the official React implementation.

## License

MIT — see [`LICENSE`](LICENSE).

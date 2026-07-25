# @fluida/core

The framework-agnostic engine behind Fluida. Computes layout decisions from either a viewport or a real measured container — no DOM rendering, no UI framework dependency, no runtime dependencies.

[![npm](https://img.shields.io/npm/v/@fluida/core)](https://www.npmjs.com/package/@fluida/core)

**Status:** public beta, `0.1.0`.

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
interface ContainerLayoutOptions {
  itemCount: number;
  strategy?: 'fit' | 'fill' | 'balanced' | 'preserve-ratio';
  gap?: number;
  aspectRatio?: number;
}

interface ContainerLayoutResult {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
}
```

Strategies:

- **`fit`** — square cells that fit without overflow.
- **`fill`** — uses the available width and height.
- **`balanced`** — a middle ground between fit and fill.
- **`preserve-ratio`** — preserves the configured aspect ratio.

## Server-side rendering

`createFluida()` automatically chooses a browser or server environment reader. `computeContainerLayout()` has no browser dependency.

## Compatibility

Published as ESM and CommonJS with TypeScript declarations.

No runtime dependencies. `sideEffects: false`.

## Building an adapter for another framework

Nothing in this package is React-specific. See [`@fluida/react`](../react/README.md) for the official React implementation.

## License

MIT — see [`LICENSE`](LICENSE).
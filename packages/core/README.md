# @fluida/core

The framework-agnostic engine behind Fluida. Reads a viewport's environment and computes a small set of layout decisions as one reactive object — no UI framework, no DOM rendering, no dependencies.

**Status: pre-release.** Not published to npm yet.

## Responsibility

`@fluida/core` owns exactly one thing: turning a viewport's environment (width, height, orientation, pixel ratio) into a small, deterministic set of layout decisions (`LayoutTokens`), reactively. It does not render anything, does not touch the DOM beyond reading `window`/`document` for the environment itself, and does not know any UI framework exists.

## Independence from React

Verified directly, not assumed: this package's `package.json` declares zero runtime dependencies, and no file under `src/` imports React or any other framework. `@fluida/react` depends on this package through its ordinary public API; this package has never changed shape to accommodate it.

## Installation

Not available on npm yet. Within this monorepo:

```json
{ "dependencies": { "@fluida/core": "workspace:*" } }
```

## `createFluida(config?: FluidaConfig): FluidaInstance`

Creates one independent instance. Reads the environment immediately and synchronously — nothing is deferred — and computes the initial layout. Throws `FluidaConfigError` synchronously if `config` is invalid.

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

## `FluidaInstance`

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

### `getSnapshot()`

The raw environment reading: `{ width, height, orientation, pixelRatio }`.

### `getLayout()`

Everything derived from the snapshot: `{ breakpoint, grid, spacing, typography, container }`.

### Reference stability

`getSnapshot()` and `getLayout()` each return the exact same object reference across repeated calls, as long as nothing relevant changed since the last read — and they update independently of each other. An environment change that doesn't affect any layout-relevant value (today, that's `pixelRatio` specifically, since nothing in the Engine reads it) updates only `getSnapshot()`'s reference, leaving `getLayout()`'s untouched. This matters for anything (React's `useSyncExternalStore` included) that decides whether to re-render by comparing references rather than deep-equality.

### `subscribe(listener)`

Registers `listener` to be called whenever the snapshot or layout changes; returns an unsubscribe function. Listeners are attached lazily — only on the first real `subscribe()` call. An instance that's created but never subscribed to costs nothing beyond the initial synchronous read.

### `destroy()`

Removes all environment listeners and clears all subscribers. Safe to call more than once; every getter keeps returning its last known value even after `destroy()`.

## Browser events

In a browser, an instance listens for three independent signals, all routed through the same internal update path:

- **`resize`** — the ordinary case.
- **`visualViewport`'s own `resize` event** — tracks the visual viewport separately from the layout viewport; in practice, also catches some DevTools device-emulation transitions that don't reliably dispatch a plain `resize` on a page already loaded before emulation was toggled.
- **`orientationchange`** — a distinct signal some devices and emulators fire independently of `resize`.

Plus one deferred, single-shot re-read scheduled right after the first `subscribe()` call, to catch drift between the instance's construction-time read and that first subscription. This is event-driven, not polling — it cannot guarantee catching every conceivable browser or DevTools scenario, only ones that dispatch at least one of the three events above.

## `FluidaConfigError`

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

## Configuration and validation

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

Every field is optional. `breakpoints` drives both `breakpoint` and `grid.columns`. `spacing` and `typography` interpolate linearly between their minimum and maximum across the given width range, clamped flat outside it. `container.tiers` is a set of discrete steps, each a fixed `containerMaxWidth` past its own `minimumWidth`, with thresholds independent from `breakpoints` by design.

Validation happens synchronously inside `createFluida()`, once, before any layout is computed. It rejects: empty breakpoints or container tiers, non-finite or negative values where a real size is expected, and duplicate thresholds that would make classification ambiguous. Nothing is validated lazily or on a later call.

## Server-side rendering

`typeof window !== 'undefined'` decides which environment reader is used — nothing to configure. The server reader never touches `window` or `document` and always returns the same fixed snapshot (`width: 0`, `height: 0`, `orientation: 'portrait'`, `pixelRatio: 1`).

## Public types

`FluidaConfig`, `FluidaInstance`, `FluidaOrientation`, `FluidaSnapshot`, `Breakpoint`, `Breakpoints`, `ContainerConfig`, `ContainerLayout`, `ContainerTier`, `GridLayout`, `LayoutTokens`, `SpacingConfig`, `SpacingLayout`, `TypographyConfig`, `TypographyLayout` — all exported from `@fluida/core`, confirmed directly against `src/index.ts`.

## Limitations

- `orientation`, `height`, and `pixelRatio` are captured in every snapshot but don't influence any layout decision today.
- Breakpoint names are a fixed set (`mobile` / `tablet` / `desktop`).
- No selector-based subscription — every subscriber is notified on any change to snapshot or layout, whichever changed.
- Event-driven reactivity, not polling — see [Browser events](#browser-events) above for exactly what that does and doesn't guarantee.

## Roadmap: container measurement

Planned, not implemented: measuring the real space available *inside* a container (via `ResizeObserver`) rather than deriving everything from viewport width alone, to compute the best distribution of a container's own elements while preserving a planned composition and avoiding excessive leftover space. This is intended to live here, in `@fluida/core`, specifically so React, Dash, and any future adapter can reuse the same computation identically — the same relationship viewport-based layout already has with `@fluida/react` today. No code for this exists yet.
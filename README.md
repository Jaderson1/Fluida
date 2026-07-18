# Fluida

Fluida is a framework-agnostic adaptive layout engine. It reads a viewport's environment (width, height, orientation, pixel ratio) and computes a small set of layout decisions — breakpoint, grid columns, spacing, typography scale, and container max-width — as one reactive, framework-independent object. The goal is to write that decision logic once, in `@fluida/core`, and let thin adapters expose it idiomatically in React, Dash, and eventually other frameworks, instead of re-implementing the same responsive rules separately in each one.

**Status: pre-release, Core only.** Nothing in this repository has been published to npm or PyPI. `@fluida/core` is a working, tested package inside this monorepo; `@fluida/react` and a Dash bridge do not exist yet. See [Limitations and roadmap](#limitations-and-roadmap).

## Table of contents

- [What problem this solves](#what-problem-this-solves)
- [Why this is not a replacement for CSS](#why-this-is-not-a-replacement-for-css)
- [Project status](#project-status)
- [Architecture](#architecture)
- [Installing the Core package](#installing-the-core-package)
- [Quick start](#quick-start)
- [Reading snapshots and layout tokens](#reading-snapshots-and-layout-tokens)
- [Subscribing and cleaning up](#subscribing-and-cleaning-up)
- [Configuring breakpoints, spacing, typography, and container sizing](#configuring-breakpoints-spacing-typography-and-container-sizing)
- [Server-side rendering](#server-side-rendering)
- [Configuration errors](#configuration-errors)
- [React and Dash: separate, upcoming adapters](#react-and-dash-separate-upcoming-adapters)
- [Limitations and roadmap](#limitations-and-roadmap)

## What problem this solves

Most responsive logic today lives in one of two places: CSS (media queries, `clamp()`, container queries) or ad hoc, framework-specific hooks that re-read `window` and re-implement the same breakpoint and scaling rules per project. Neither gives an application's *logic* — not just its styling — a single, consistent answer to "what layout am I in right now," and neither is shared across a JavaScript frontend and a Python one.

Fluida centralizes that decision in one place: a small, pure computation from viewport width (and, deliberately, only width for most fields — see below) to a `LayoutTokens` object. Every consumer, in every framework, asks the same engine the same question and gets the same answer.

## Why this is not a replacement for CSS

Fluida does not touch the DOM, does not write CSS, and does not render anything. It computes *values* — a breakpoint name, a column count, a padding number, a type scale multiplier, a container max-width — and hands them to whatever already renders in your framework of choice. CSS (and, increasingly, native Container Queries) is still what actually paints the page, and for purely visual responsiveness within a single component tree, Container Queries and `clamp()` already solve a large part of this problem natively, with no JavaScript at all.

Fluida's reason to exist is narrower and specific: exposing the *same* responsive decision to application logic — not just styling — identically across frameworks that don't share a CSS layer, and eventually across languages (JavaScript and Python) that don't share a runtime at all. If your responsive needs are purely visual and confined to CSS, native Container Queries are very likely the simpler answer. Fluida is aimed at the case where the *decision itself* needs to be shared and reasoned about in code.

## Project status

- `@fluida/core`: implemented, tested, framework-agnostic. Supports SSR-safe environment reading, a reactive store with stable references, centralized runtime configuration validation, and a layout engine covering breakpoints, grid columns, spacing, typography, and container sizing.
- `@fluida/react`: does not exist yet. The package is scaffolded but contains no real code.
- Dash bridge: not started.
- Published packages: none — Fluida is not yet available through a public package registry.

## Architecture

The Core package is organized as three layers, each with a single direction of dependency:

```
environment/   → reads the browser or server environment
engine/        → pure functions that compute layout decisions
createFluida() → validates config, owns state, and wires reactivity
```

`engine/` never imports from `environment/`, and neither knows `createFluida()` exists — only the store depends on both. This is what lets the engine's computations stay pure, synchronously testable, and completely ignorant of whether they're running in a browser, in Node during server-side rendering, or eventually inside a Dash callback.

## Installing the Core package

`@fluida/core` is not on npm. To use it today, clone this repository and build it locally:

```bash
git clone https://github.com/Jaderson1/Fluida.git
cd Fluida
corepack enable
pnpm install
pnpm build
```

`packages/core/dist` will then contain the built ESM and CommonJS output. Within this monorepo, any other workspace package can depend on it with `"@fluida/core": "workspace:*"`.

## Quick start

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

That's the whole surface for a default instance: no configuration is required, and every field above is computed from your current environment the moment `createFluida()` runs.

## Reading snapshots and layout tokens

A `FluidaInstance` exposes two kinds of state, each independently stable — reading either one twice in a row without anything changing returns the exact same object reference, which matters for frameworks (like React, once the adapter exists) that decide whether to re-render by comparing references:

```ts
fluida.getSnapshot();
// {
//   width: 1440,
//   height: 900,
//   orientation: 'landscape',
//   pixelRatio: 2,
// }

fluida.getLayout();
// {
//   breakpoint: 'desktop',
//   grid: { columns: 12 },
//   spacing: { page: 48 },
//   typography: { scale: 1.25 },
//   container: { maxWidth: 1140 },
// }
```

`getSnapshot()` is the raw, unopinionated environment reading. `getLayout()` is everything derived from it. They update independently: an environment change that doesn't affect any layout-relevant value (there is exactly one such field today — `pixelRatio`, which nothing in the Engine currently reads) updates `getSnapshot()`'s reference without touching `getLayout()`'s.

## Subscribing and cleaning up

```ts
const unsubscribe = fluida.subscribe(() => {
  console.log('Environment or layout changed:', fluida.getLayout());
});

// later, when you no longer need updates
unsubscribe();

// when the instance itself is no longer needed
fluida.destroy();
```

`subscribe()` only attaches a real browser listener the first time it's called — an instance that's created but never subscribed to costs nothing beyond the initial read. `destroy()` removes that listener and clears all subscribers; it's safe to call more than once, and every getter keeps working (returning the last known value) even after `destroy()` has been called.

## Configuring breakpoints, spacing, typography, and container sizing

Every field in `createFluida()`'s config is optional — anything you don't set falls back to a documented default.

```ts
const fluida = createFluida({
  breakpoints: {
    mobile: 0,
    tablet: 600,
    desktop: 1000,
  },
  spacing: {
    minimumWidth: 320,
    maximumWidth: 1440,
    minimumPadding: 16,
    maximumPadding: 64,
  },
  typography: {
    minimumWidth: 320,
    maximumWidth: 1440,
    minimumScale: 1,
    maximumScale: 1.3,
  },
  container: {
    tiers: [
      { minimumWidth: 0, containerMaxWidth: 480 },
      { minimumWidth: 768, containerMaxWidth: 720 },
      { minimumWidth: 1280, containerMaxWidth: 1140 },
    ],
  },
});
```

`breakpoints` drives both the `breakpoint` name and the grid column count. `spacing` and `typography` interpolate smoothly between a minimum and maximum value across a width range — the padding or type scale between the two anchors is a straight line, clamped flat outside it. `container` is deliberately different: it's a set of discrete tiers, each a fixed max-width past a given minimum width, and its tier boundaries are entirely independent from `breakpoints` — the container can change tier at a different width than columns do. That's a deliberate choice, not an oversight: coupling every field to the same three breakpoints would make columns and container width jump in lockstep, which is rarely what a real layout wants at every width.

## Server-side rendering

`createFluida()` detects whether it's running in a browser (`typeof window !== 'undefined'`) and picks its environment reader accordingly — nothing to configure. In a server context, `getSnapshot()` and `getLayout()` return a fixed fallback (`width: 0`, `orientation: 'portrait'`, `pixelRatio: 1`, and whatever layout that width resolves to under your config) rather than throwing or guessing. `getServerSnapshot()` and `getServerLayout()` return that same fallback explicitly, on any instance, in any environment — this is what a future adapter's hydration path will read to make sure the server-rendered output and the client's first render agree, before the real environment is read.

## Configuration errors

Invalid configuration throws synchronously, once, when `createFluida()` is called — never later, and never silently. This includes: empty breakpoints or container tiers, non-finite or negative values where a value must represent a real width or size, and duplicate thresholds that would make classification ambiguous.

```ts
import { createFluida, FluidaConfigError } from '@fluida/core';

try {
  createFluida({ breakpoints: {} });
} catch (error) {
  if (error instanceof FluidaConfigError) {
    console.error('Invalid Fluida configuration:', error.message);
  }
}
```

## React and Dash: separate, upcoming adapters

Neither exists yet. The plan for both is the same: a thin layer that translates `createFluida()`'s `subscribe`/`getSnapshot`/`getLayout` shape into each framework's own idioms — a hook built on `useSyncExternalStore` for React, and a Dash custom component (JavaScript on one side, an auto-generated Python wrapper on the other) for Dash — without either adapter reimplementing any of the Engine's decisions. `@fluida/core` itself will not change shape to accommodate either; if building the React adapter reveals that the Core API genuinely needs to grow (for example, a way to subscribe to only part of the layout), that will be a deliberate, separate decision, not something bundled into this package speculatively ahead of time.

## Limitations and roadmap

Known, current limitations — not bugs, just not built yet:

- No React or Dash adapter yet, and Fluida is not yet available through a public package registry — the only way to use it today is by cloning this repository.
- No automated CI. All 87 tests pass locally as of this writing, but nothing runs them automatically on every change yet.
- `orientation`, `height`, and `pixelRatio` are captured in every snapshot but don't currently influence any layout decision — a landscape phone and a portrait tablet at the same width get the same layout today.
- Breakpoint names are a fixed set (`mobile` / `tablet` / `desktop`); custom names are not supported yet.
- Zoom level is not detected — this is deliberately out of scope for now, since there's no reliable cross-browser way to observe it.
- No selector-based subscriptions. Every subscriber is notified on any change; a way to subscribe to only the field you care about is expected to become necessary once the React adapter exists, and will be designed against that adapter's real requirements rather than guessed at now.

Before this is realistically a v1.0: a working React adapter, CI running the existing test suite on every push, and an actual npm publish of `@fluida/core`.
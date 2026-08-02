# Fluida

_A layout engine that reasons about both the viewport and the real space inside a container._

[![CI](https://github.com/Jaderson1/Fluida/actions/workflows/ci.yml/badge.svg)](https://github.com/Jaderson1/Fluida/actions/workflows/ci.yml)
[![npm core](https://img.shields.io/npm/v/@fluida/core?label=%40fluida%2Fcore)](https://www.npmjs.com/package/@fluida/core)
[![npm react](https://img.shields.io/npm/v/@fluida/react?label=%40fluida%2Freact)](https://www.npmjs.com/package/@fluida/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-public%20beta-blue)

Fluida is a responsive layout library organized into two complementary packages:

- **`@fluida/core`** — the framework-agnostic layout engine.
- **`@fluida/react`** — the official React integration, built on top of Core.

Together, they form the Fluida project. Fluida computes responsive layout decisions from two independent sources: a viewport's width, and a real container's measured size together with a known item count.

**Status: public beta — v0.2.0, pre-1.0.** The layout algorithm and its TypeScript/Python conformance are the most exercised part of this project (192 TypeScript + 106 Python tests as of this release). The Dash adapter is newer and has had less real-world use. Nothing here has been validated in a production deployment outside this project's own development — treat it accordingly until it has.

## Installation

For React applications:

```bash
npm install @fluida/react
```

Or with pnpm:

```bash
pnpm add @fluida/react
```

`@fluida/core` is installed automatically as a dependency.

For framework-agnostic usage:

```bash
npm install @fluida/core
```

Or with pnpm:

```bash
pnpm add @fluida/core
```

## The problem

Most responsive logic today lives in CSS media queries, or in framework-specific hooks that re-implement the same breakpoint rules per project. Neither gives application logic — not just styling — a single, consistent, cross-framework answer to "what layout am I in right now," whether the question is about the whole page or about one specific container.

## Viewport layout vs. container layout

These are two independent systems inside `@fluida/core`, sharing no state with each other.

**Viewport layout** answers "what layout is the whole page in right now" — breakpoint, grid columns, spacing, typography scale, and container max-width, all derived from the browser's viewport width.

**Container layout** answers "given this exact measured space and this many items, what's the best grid" — column count and cell size, derived from a specific element's real size and an item count you provide.

## Quick example

```tsx
import { FluidaContainer, FluidaProvider, FluidaText } from '@fluida/react';

export function App() {
  return (
    <FluidaProvider>
      <FluidaContainer>
        <FluidaText as="h1">My app</FluidaText>
      </FluidaContainer>
    </FluidaProvider>
  );
}
```

## `FluidaAdaptiveGrid` example

```tsx
import { FluidaAdaptiveGrid } from '@fluida/react';

<FluidaAdaptiveGrid itemCount={2} strategy="preserve-ratio" aspectRatio={16 / 9}>
  <ChartA />
  <ChartB />
</FluidaAdaptiveGrid>;
```

## Layout strategies

`computeContainerLayout` (and `FluidaAdaptiveGrid`/`FluidaGrid`, which call it) support four strategies, chosen by what you're laying out:

| Strategy         | Choose it when                                                             | Cell shape                                                                                   |
| ---------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `fit`            | Items should stay square — icon grids, uniform cards, thumbnails.          | Square, sized to the smaller of the two available dimensions.                                |
| `preserve-ratio` | Items have a specific shape — charts, images, video.                       | A fixed `aspectRatio` you set, sized as large as it fits.                                    |
| `fill`           | Items should use all the available space, whatever shape that leaves them. | Exactly the container divided by columns/rows — may not be square.                           |
| `balanced`       | You want less distortion than `fill` without forcing a square like `fit`.  | Between the two: the smaller fill dimension stays as-is, the larger one is pulled toward it. |

`fill` and `balanced` both need a real, known container height to mean anything — they compute cell size directly from it. `fit` and `preserve-ratio` can each run without one; see Auto-height below.

## Auto-height

Normally, `computeContainerLayout` needs both a container width and height. Auto-height lets `fit` and `preserve-ratio` compute a layout from width alone — useful when you don't want to give an element a height ahead of measuring it, only to have the layout decide what that height should be.

It requires `minItemWidth` to be set: without a known height, column count has to come from somewhere, and `minItemWidth` is that anchor. `fill` and `balanced` cannot use auto-height — both need a real height to compute cell size, and asking for either without one raises `FluidaConfigError`.

```tsx
<FluidaAdaptiveGrid
  itemCount={4}
  strategy="preserve-ratio"
  aspectRatio={4 / 3}
  minItemWidth={300}
  autoHeight
>
  {children}
</FluidaAdaptiveGrid>
```

The resulting height (`rows * cellHeight + (rows - 1) * gap`) is computed by the adapter, not returned by `@fluida/core` itself, and applied as the element's own height — never a fixed pixel value guessed ahead of time. Dash's `FluidaGrid` supports the same thing as `auto_height=True`.

```text
packages/
├── core/        → @fluida/core
└── react/       → @fluida/react

python/
├── fluida-core/ → pure-Python port of the same layout algorithm
└── dash-fluida/ → initial Dash custom component

spec/
└── conformance/ → shared test cases checked by both the TypeScript and Python implementations

examples/
└── react-demo/  → Vite + React demo
```

## Packages

Fluida is a container-aware adaptive layout engine, currently available as a TypeScript core, a React adapter, an independent pure-Python implementation, and an initial Dash adapter.

| Package                                       | Description                                                                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [`@fluida/core`](packages/core/README.md)     | Framework-agnostic engine (TypeScript).                                                                                      |
| [`@fluida/react`](packages/react/README.md)   | React integration.                                                                                                           |
| [`fluida-core`](python/fluida-core/README.md) | Pure-Python port of the same layout algorithm — no JavaScript involved.                                                      |
| [`dash-fluida`](python/dash-fluida/README.md) | Initial Dash custom component; measures the container and computes the layout in the browser, using `@fluida/core` directly. |

Two things worth being precise about, rather than implying more than is true: `dash-fluida`'s actual measurement and calculation happens in the browser (via `@fluida/core`, bundled into its frontend) — the Python side declares the component and can optionally receive the computed layout back, but never computes it itself and never sees a resize event by default. `fluida-core` (Python) is a completely separate, independent implementation from that — useful on its own for offline calculations, backend logic, or generating previews without a browser at all.

The TypeScript and Python implementations are checked against the same shared cases in [`spec/conformance/layout-cases.json`](spec/conformance/layout-cases.json) — `columns`/`rows` must match exactly, `cellWidth`/`cellHeight` within a small declared numeric tolerance, since floating-point arithmetic across two different language runtimes isn't expected to match beyond that. Adapters (React, Dash, and any future one) may have their own integration logic — Strict Mode handling, or how resize events reach the server — but none of them alter the layout rules themselves; that logic lives only in `@fluida/core`, reused as-is.

## Development

```bash
git clone https://github.com/Jaderson1/Fluida.git
cd Fluida
corepack enable
pnpm install
```

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm demo:react
```

## Publishing (for maintainers)

Always use `pnpm publish` or `pnpm pack`, not plain npm commands.

Publish in this order:

1. `@fluida/core`
2. `@fluida/react`
3. `fluida-core` (PyPI)
4. `dash-fluida` (PyPI)

## Compatibility

- `@fluida/core` has no runtime dependencies.
- `@fluida/react` requires React and React DOM `>=18.0.0`.
- `fluida-core` (Python) requires Python `>=3.9`, no runtime dependencies.
- `dash-fluida` requires Dash `>=2.4`.

## Contributing

Issues and pull requests are welcome. See [`CHANGELOG.md`](CHANGELOG.md) for what's changed between versions.

```bash
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT — see [`LICENSE`](LICENSE).

# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## `@fluida/core` 0.2.0 / `@fluida/react` 0.2.0

### Added
- `minItemWidth` option in `computeContainerLayout` and on `FluidaAdaptiveGrid`: column counts whose resulting cell would be narrower than this are excluded from the search entirely. Optional; omitted preserves the exact prior behavior.
- `requestAnimationFrame` coalescing in `useFluidaContainerSize` (`@fluida/react`): at most one re-render per animation frame, even if `ResizeObserver` reports several measurements before the frame runs. Falls back to the previous, synchronous behavior if `requestAnimationFrame` is unavailable.
- `spec/conformance/layout-cases.json`: a shared, language-neutral set of `computeContainerLayout` inputs and expected outputs, checked by both the TypeScript and (new, see below) Python implementations.
- `fluida-core` (Python, `0.1.0`): an independent, pure-Python port of the same `computeContainerLayout` algorithm — no JavaScript, Node.js, subprocess, or browser involved. See [`python/fluida-core`](python/fluida-core).
- `dash-fluida` (Python, `0.1.0`): an initial Dash custom component, `FluidaGrid`, that measures its own real container size in the browser and lays out its children using `@fluida/core` directly, bundled into its frontend. See [`python/dash-fluida`](python/dash-fluida).

### Changed
- None to existing public API surfaces beyond the additions above — `minItemWidth` omitted and no `requestAnimationFrame` available both fall back to prior behavior exactly.

## `@fluida/core` 0.1.0 / `@fluida/react` 0.1.0

Initial public release: viewport-based layout (`createFluida`, `FluidaProvider`, `FluidaContainer`, `FluidaGrid`, `FluidaStack`, `FluidaText`) and container-based layout (`computeContainerLayout`, `FluidaAdaptiveGrid`, `ResizeObserver`-based measurement), with SSR and React Strict Mode support.

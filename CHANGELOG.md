# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## `@fluida/core` 0.2.0 / `@fluida/react` 0.2.0 / `fluida-core` 0.2.0 / `dash-fluida` 0.2.0

### Added

- **Auto-height**: `containerHeight` can now be omitted from `computeContainerLayout` (TypeScript) / `container_height` from `compute_container_layout` (Python) for the `fit` and `preserve-ratio` strategies, as long as `minItemWidth`/`min_item_width` is set. Column count is chosen from width alone; `fill` and `balanced` still require a known height and raise `FluidaConfigError` if it's omitted. `@fluida/react`'s `FluidaAdaptiveGrid` exposes this as `autoHeight`; `dash-fluida`'s `FluidaGrid` exposes it as `auto_height`. See each package's README for examples.
- `minItemWidth` option in `computeContainerLayout` and on `FluidaAdaptiveGrid`: column counts whose resulting cell would be narrower than this are excluded from the search entirely. Optional; omitted preserves the exact prior behavior.
- `requestAnimationFrame` coalescing in `useFluidaContainerSize` (`@fluida/react`): at most one re-render per animation frame, even if `ResizeObserver` reports several measurements before the frame runs. Falls back to the previous, synchronous behavior if `requestAnimationFrame` is unavailable.
- `spec/conformance/layout-cases.json`: a shared, language-neutral set of `computeContainerLayout` inputs and expected outputs, checked by both the TypeScript and Python implementations.
- `fluida-core` (Python): an independent, pure-Python port of the same `computeContainerLayout` algorithm — no JavaScript, Node.js, subprocess, or browser involved. See [`python/fluida-core`](python/fluida-core).
- `dash-fluida` (Python): a Dash custom component, `FluidaGrid`, that measures its own real container size in the browser and lays out its children using `@fluida/core` directly, bundled into its frontend. See [`python/dash-fluida`](python/dash-fluida).

### Fixed

- **`balanced` could produce a cell larger than the container.** The previous formula (a square sized to the geometric mean of the fill answer's width and height) could exceed the smaller of the two dimensions whenever the base cell wasn't already square. It's now the geometric mean of each axis with the largest safe square size individually — the smaller fill dimension is returned unchanged, the larger one is pulled toward it without exceeding it. `balanced` no longer produces a square cell in the general case; it stays between `fit`'s square and `fill`'s uncorrected rectangle.
- **`itemCount`/`item_count` accepted non-integer values.** `1.5`, and in Python, `True`/`False` (since `bool` is an `int` subclass there), were previously accepted. Both now require a positive integer, checked explicitly.
- **Unknown `strategy` values silently behaved like `fill`.** Now rejected with `FluidaConfigError` in both languages.
- **`containerWidth`/`containerHeight` accepted `NaN`, `Infinity`, and negative values**, producing the same fallback as an unmeasured container rather than a clear error. Both are now validated explicitly (`0` remains valid, representing "not yet measured").
- **`dash-fluida`'s frontend could apply a stale measurement.** When several `ResizeObserver` entries arrived before the same `requestAnimationFrame` fired, only the first one's width/height reached the frame; later ones in the same frame were silently dropped. The frame now always reads the most recent measurement.
- **`dash-fluida`'s bundle referenced a source map by the wrong name.** The build renamed the compiled file but not the `sourceMappingURL` comment inside it, which still pointed at the pre-rename name — a browser looking up the map next to the renamed file would not find it. The copy step now rewrites the reference to match.
- Duplicate `ContainerLayoutOptions` interface declaration in `@fluida/core` consolidated into one.
- Removed `FluidaConfig.minItemWidth` — a public property that was never read by any computation (confirmed: no reference to it existed outside its own declaration). This is a breaking change for anyone who was setting it, though it had no effect either way.

### Changed

- None to existing public API surfaces beyond the above — `minItemWidth`/`min_item_width` and `autoHeight`/`auto_height` are opt-in, and every fix above only rejects inputs that previously produced wrong or silently-incorrect results.

## `@fluida/core` 0.1.0 / `@fluida/react` 0.1.0

Initial public release: viewport-based layout (`createFluida`, `FluidaProvider`, `FluidaContainer`, `FluidaGrid`, `FluidaStack`, `FluidaText`) and container-based layout (`computeContainerLayout`, `FluidaAdaptiveGrid`, `ResizeObserver`-based measurement), with SSR and React Strict Mode support.

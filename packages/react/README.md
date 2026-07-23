## Core and adapters

`@fluida/core` has no dependency on React or on any other framework — its `package.json` declares zero runtime dependencies, and nothing in its source imports React. `@fluida/react` is a separate package that depends on Core through Core's ordinary public API (`subscribe`, `getSnapshot`, `getLayout`, and their server-mode counterparts); Core's shape has not changed to accommodate it. This is also the intended relationship for any future adapter — Dash included: a thin layer translating Core's plain JS contract into that framework's own idioms, without Core needing to know the adapter exists.

## Packages in this repository

- **[`@fluida/core`](packages/core/README.md)** — the engine. No UI framework required.
- **[`@fluida/react`](packages/react/README.md)** — `FluidaProvider`, `FluidaContainer`, `FluidaGrid`, `FluidaStack`, `FluidaText`, and two hooks.
- **`examples/react-demo`** — a small Vite + React app demonstrating the primitives live; not published, not a library.

## Local installation

Neither package is on npm yet.

```bash
git clone https://github.com/Jaderson1/Fluida.git
cd Fluida
corepack enable
pnpm install
pnpm build
```

Within this monorepo, any workspace package can depend on either package with `"@fluida/core": "workspace:*"` or `"@fluida/react": "workspace:*"`.

## Minimal React example

```tsx
import {
  FluidaContainer,
  FluidaProvider,
  FluidaText,
} from '@fluida/react';

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

Every name in this example is a real export of `@fluida/react` — confirmed directly against `packages/react/src/index.ts`, not assumed.

## React components available

All four read from Core automatically. None recomputes a breakpoint, a scale, or a threshold on its own. All four react to the browser's viewport width, not to their own element's size — there is no `ResizeObserver` or CSS container query behind any of them yet (see [Roadmap](#roadmap)).

**`FluidaProvider`** — creates one Core instance per Provider, never a shared singleton, and destroys it on unmount.

```tsx
<FluidaProvider config={{ /* optional FluidaConfig */ }}>
  <App />
</FluidaProvider>
```

**`FluidaContainer`** — centers content: `maxWidth` from `layout.container.maxWidth`, horizontal padding from `layout.spacing.page`.

```tsx
<FluidaContainer>
  <YourPage />
</FluidaContainer>
```

**`FluidaGrid`** — a CSS grid with `layout.grid.columns` columns and a gap from `layout.spacing.page`, using `repeat(columns, minmax(0, 1fr))` so long content can't force the grid wider than its container.

```tsx
<FluidaGrid>
  {items.map((item) => (
    <Card key={item.id} {...item} />
  ))}
</FluidaGrid>
```

**`FluidaStack`** — a flex stack with `direction` (`'row' | 'column'`, default `'column'`) and `gap` (defaults to `layout.spacing.page`). `stackOnMobile` forces column direction whenever Core's own `layout.breakpoint === 'mobile'`.

```tsx
<FluidaStack direction="row" stackOnMobile>
  <Sidebar />
  <Content />
</FluidaStack>
```

**`FluidaText`** — applies `layout.typography.scale` as a font-size multiplier, via an `as` prop (`p`, `span`, `div`, `label`, `h1`–`h6`; defaults to `p`). Defaults to the same computed size regardless of `as` — a deliberate tradeoff explained in [`packages/react/README.md`](packages/react/README.md), not an oversight.

```tsx
<FluidaText as="h1">A responsive heading</FluidaText>
```

## React hooks

**`useFluidaLayout()`** returns `LayoutTokens` and only re-renders a component when a derived value actually changes.

**`useFluidaSnapshot()`** returns the raw `FluidaSnapshot` (`width`, `height`, `orientation`, `pixelRatio`) and re-renders on every environment change, including ones layout doesn't care about.

They're separate hooks specifically so a component using only `useFluidaLayout()` never subscribes to the raw snapshot, and a `pixelRatio`-only change can't force it to re-render. Use these directly only when the primitives don't fit.

## Snapshot and computed layout

```ts
import { createFluida } from '@fluida/core';

const fluida = createFluida();

fluida.getSnapshot();
// { width: 1440, height: 900, orientation: 'landscape', pixelRatio: 2 }

fluida.getLayout();
// {
//   breakpoint: 'desktop',
//   grid: { columns: 12 },
//   spacing: { page: 48 },
//   typography: { scale: 1.25 },
//   container: { maxWidth: 1140 },
// }
```

`getSnapshot()` is the raw environment reading; `getLayout()` is everything derived from it. Both return a stable reference when nothing relevant changed since the last read.

## Breakpoints and real values

From viewport width alone, Fluida computes:

- **`breakpoint`** — `'mobile' | 'tablet' | 'desktop'`, from configurable width thresholds.
- **`grid.columns`** — a column count tied to the current breakpoint.
- **`spacing.page`** and **`typography.scale`** — each interpolated linearly between a minimum and maximum across a width range, clamped flat outside it.
- **`container.maxWidth`** — a discrete tier, with thresholds independent from `breakpoint`'s, by design.

With the default configuration, at `width: 320` (the default minimum): `breakpoint: 'mobile'`, `grid.columns: 4`, `spacing.page: 16`, `typography.scale: 1`, `container.maxWidth: 480`. These are the real defaults in `packages/core/src/engine/`, not illustrative numbers.

## Custom configuration

Every field is optional; this is the real shape `createFluida()` and `<FluidaProvider config={...}>` both accept:

```ts
const fluida = createFluida({
  breakpoints: { mobile: 0, tablet: 600, desktop: 1000 },
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

Invalid configuration throws `FluidaConfigError` synchronously, when `createFluida()` is called (or when `<FluidaProvider config={...}>` first renders) — never later, never silently.

## Server-side rendering

`createFluida()` detects whether it's running in a browser and picks its environment reader accordingly. In a server context, `getSnapshot()`/`getLayout()` return a fixed fallback (`width: 0`, `orientation: 'portrait'`, `pixelRatio: 1`, and whatever layout that width resolves to) rather than guessing. `getServerSnapshot()`/`getServerLayout()` return that same fallback explicitly — this is exactly what `@fluida/react`'s hooks and primitives read through `useSyncExternalStore`'s server-snapshot argument, keeping server-rendered output and the client's first render in agreement before hydration.

## React Strict Mode

`FluidaProvider` is safe under React's development-only Strict Mode, which replays every effect (setup → cleanup → setup) synchronously on the initial mount, reusing the same component instance rather than creating a new one. Destroying the Core instance immediately in that cleanup would have broken this — the instance would be torn down mid-replay and never properly reused. Instead, `destroy()` is deferred by one macrotask and canceled if the same instance is reused by a following setup before that macrotask fires; a genuine final unmount has no following setup to cancel it, so the instance is still destroyed, just not synchronously. This is tested directly in `packages/react/src/FluidaProvider.strictmode.test.tsx`.

## React demo

[`examples/react-demo`](examples/react-demo) is a small Vite + React app with a breakpoint indicator, two panels — one on `useFluidaSnapshot()`, one on `useFluidaLayout()`, each with its own render counter — and a grid built from the primitives above, with a compact presentation mode at wide, limited-height viewports (`@media (min-width: 900px) and (max-height: 1080px)`).

```bash
pnpm install
pnpm build
pnpm demo:react
```

Then open the printed local URL and resize the window. If testing with your browser's device emulation instead of an actual resize, reload the page after switching devices to guarantee a fresh read — see [Limitations](#limitations).

## Development commands

```bash
pnpm install       # install dependencies
pnpm build         # build @fluida/core and @fluida/react
pnpm typecheck     # typecheck all packages
pnpm test          # run all tests
pnpm demo:react    # run the live demo locally
pnpm demo:react:build  # production-build the demo
```

## Tests

`@fluida/core`: 100 tests across 10 files — the Engine's pure functions, config validation, SSR-mode behavior, and browser-mode reactivity (real `resize`, `visualViewport`, and `orientationchange` events dispatched in jsdom, reference-stability checks, and listener cleanup).

`@fluida/react`: 44 tests across 8 files — each primitive (ref/prop forwarding, style application, resize-driven updates), the hooks' re-render-isolation behavior, SSR compatibility via `renderToString`, and Provider lifecycle correctness under React Strict Mode.

**144 tests total**, both counts confirmed by running the suites directly, not estimated.

## CI

GitHub Actions runs `pnpm typecheck`, `pnpm test`, and `pnpm build` on Node 22 and Node 24, on every push and pull request to `main`.

## Limitations

Known, current limitations — not bugs, just not built yet:

- No Dash adapter yet, and neither package is published to a public registry.
- `orientation`, `height`, and `pixelRatio` are captured in every snapshot but don't currently influence any layout decision.
- Breakpoint names are a fixed set (`mobile` / `tablet` / `desktop`); custom names are not supported yet.
- Zoom level is not detected.
- No selector-based subscription beyond the separate `useFluidaSnapshot`/`useFluidaLayout` hooks.
- Every primitive reacts to viewport width, not to its own element's size — there is no CSS container query or `ResizeObserver` behind any of them yet (see [Roadmap](#roadmap) for the planned direction here).
- `<FluidaProvider config>` does not react to the `config` prop changing after the first render.
- `FluidaGrid` prevents its own container from being forced wider by long content, but doesn't force line-wrapping inside individual cells.
- The environment reader is event-driven (`resize`, `visualViewport` resize, `orientationchange`, plus a one-time deferred re-read after the first subscriber) rather than polling; it cannot guarantee catching every conceivable browser or DevTools scenario.

## Roadmap

These are **future directions, not current functionality** — nothing below exists in the code today:

- **Container-based measurement.** Fluida is planned to eventually measure the real space available *inside* a container — via `ResizeObserver` — and compute the best distribution of its elements from that, rather than from viewport width alone. The goal is to preserve a planned composition while avoiding excessive leftover space, and for that logic to live in `@fluida/core` so React, Dash, and any other adapter can reuse it identically, the same way viewport-based layout works today.
- **Layout strategies based on both container width and height** (not just width, as today), including named strategies such as `fit`, `fill`, `balanced`, and `preserve-ratio` — none of which exist yet, in any form.
- **Smarter adaptation for cards and charts**, including a planned demo with cards and two charts specifically exercising container-based, not viewport-based, layout decisions.
- **A Dash adapter** — a custom component (JavaScript, likely using React internally since Dash's own rendering is React-based) with an auto-generated Python wrapper, reusing `@fluida/core` unchanged.
- **npm and PyPI publication**, once the above has real usage validating the API surface.

## Contributing

This is a solo, early-stage project. Issues and pull requests are welcome, particularly ones that exercise `@fluida/react` in a real application. Please run `pnpm typecheck && pnpm test && pnpm build` before opening a pull request.

## License

MIT — see [`LICENSE`](LICENSE).
# Fluida

*A layout engine that reasons about both the viewport and the real space inside a container.*

[![CI](https://github.com/Jaderson1/Fluida/actions/workflows/ci.yml/badge.svg)](https://github.com/Jaderson1/Fluida/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Status](https://img.shields.io/badge/status-pre--release-orange)

Fluida is a responsive layout library organized into two complementary packages:

- **`@fluida/core`** — the framework-agnostic layout engine.
- **`@fluida/react`** — the official React integration, built on top of Core.

Together, they form the Fluida project. Fluida computes responsive layout decisions from two independent sources: a viewport's width, and a real container's measured size together with a known item count.

**Status: pre-release, `0.0.1`.** Both packages are implemented and tested. Neither is published to npm yet.

---

## Table of contents

- [The problem](#the-problem)
- [Viewport layout vs. container layout](#viewport-layout-vs-container-layout)
- [Quick example](#quick-example)
- [`FluidaAdaptiveGrid` example](#fluidaadaptivegrid-example)
- [Monorepo structure](#monorepo-structure)
- [Packages](#packages)
- [Development](#development)
- [Publishing (for maintainers)](#publishing-for-maintainers)
- [Future installation](#future-installation)
- [Compatibility](#compatibility)
- [Contributing](#contributing)
- [License](#license)

---

## The problem

Most responsive logic today lives in CSS media queries, or in framework-specific hooks that re-implement the same breakpoint rules per project. Neither gives application logic — not just styling — a single, consistent, cross-framework answer to "what layout am I in right now," whether the question is about the whole page or about one specific container.

## Viewport layout vs. container layout

These are two independent systems inside `@fluida/core`, sharing no state with each other.

**Viewport layout** answers "what layout is the whole page in right now" — breakpoint, grid columns, spacing, typography scale, and container max-width, all derived from the browser's viewport width.

**Container layout** answers "given this exact measured space and this many items, what's the best grid" — column count and cell size, derived from a specific element's real size (via `ResizeObserver` in the React adapter) and an item count you provide. It does not need to know anything about the viewport.

## Quick example

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

## `FluidaAdaptiveGrid` example

`FluidaAdaptiveGrid` measures its own real rendered size with `ResizeObserver` — not the viewport — and lays out a known number of children to fit it:

```tsx
import { FluidaAdaptiveGrid } from '@fluida/react';

<FluidaAdaptiveGrid
  itemCount={2}
  strategy="preserve-ratio"
  aspectRatio={16 / 9}
>
  <ChartA />
  <ChartB />
</FluidaAdaptiveGrid>
```

## Monorepo structure

## Packages

| Package | Description |
|---|---|
| [`@fluida/core`](packages/core/README.md) | Framework-agnostic engine. See its README for the full public API. |
| [`@fluida/react`](packages/react/README.md) | The React integration. See its README for every component, hook, and prop. |

## Development

```bash
git clone https://github.com/Jaderson1/Fluida.git
cd Fluida
corepack enable
pnpm install
```

```bash
pnpm build       # build @fluida/core and @fluida/react
pnpm typecheck   # typecheck all packages
pnpm test        # run all tests
pnpm demo:react  # run the live React demo
```

## Publishing (for maintainers)

Always use `pnpm publish` — or `pnpm pack` to inspect a tarball first — rather than plain `npm publish` or `npm pack`.

`@fluida/react` depends on `@fluida/core` through `workspace:*`. pnpm rewrites that protocol to a real version number when packing or publishing. Plain npm does not understand the `workspace:` protocol and can produce a tarball that fails to install outside the workspace.

Publish in this order:

1. `@fluida/core`
2. `@fluida/react`

## Future installation

Neither `@fluida/core` nor `@fluida/react` is published to npm yet. Once published, installation will look like:

```bash
npm install @fluida/core @fluida/react
```

Until then, use this monorepo directly (see [Development](#development)), or a `workspace:*` dependency when working inside it.

## Compatibility

- `@fluida/core` has no runtime dependencies and works in any modern JavaScript environment.
- `@fluida/react` requires `react` and `react-dom` as peer dependencies. See [`packages/react/README.md`](packages/react/README.md) for the exact supported versions.

## Contributing

This is an early-stage project. Issues and pull requests are welcome.

Before opening a pull request, run:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT — see [`LICENSE`](LICENSE).
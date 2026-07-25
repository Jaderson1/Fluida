# Fluida

*A layout engine that reasons about both the viewport and the real space inside a container.*

[![CI](https://github.com/Jaderson1/Fluida/actions/workflows/ci.yml/badge.svg)](https://github.com/Jaderson1/Fluida/actions/workflows/ci.yml)
[![npm core](https://img.shields.io/npm/v/@fluida/core?label=%40fluida%2Fcore)](https://www.npmjs.com/package/@fluida/core)
[![npm react](https://img.shields.io/npm/v/@fluida/react?label=%40fluida%2Freact)](https://www.npmjs.com/package/@fluida/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-public%20beta-blue)

Fluida is a responsive layout library organized into two complementary packages:

- **`@fluida/core`** — the framework-agnostic layout engine.
- **`@fluida/react`** — the official React integration, built on top of Core.

Together, they form the Fluida project. Fluida computes responsive layout decisions from two independent sources: a viewport's width, and a real container's measured size together with a known item count.

**Status: public beta — v0.1.0.**

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

```text
packages/
├── core/        → @fluida/core
└── react/       → @fluida/react

examples/
└── react-demo/  → Vite + React demo
```

## Packages

| Package | Description |
|---|---|
| [`@fluida/core`](packages/core/README.md) | Framework-agnostic engine. |
| [`@fluida/react`](packages/react/README.md) | React integration. |

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

## Compatibility

- `@fluida/core` has no runtime dependencies.
- `@fluida/react` requires React and React DOM `>=18.0.0`.

## Contributing

Issues and pull requests are welcome.

```bash
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT — see [`LICENSE`](LICENSE).
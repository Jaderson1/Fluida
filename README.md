# Fluida

Fluida is a framework-agnostic adaptive layout engine. It reads a viewport's environment (width, height, orientation, pixel ratio) and computes a small set of layout decisions — breakpoint, grid columns, spacing, typography scale, and container max-width — as one reactive, framework-independent object. The goal is to write that decision logic once, in `@fluida/core`, and let thin adapters expose it idiomatically in React, Dash, and eventually other frameworks, instead of re-implementing the same responsive rules separately in each one.

**Status: pre-release MVP.** `@fluida/core` and `@fluida/react` are both implemented and tested inside this monorepo, with a live demo you can run locally. Neither package has been published to npm. A Dash bridge is planned but not started. See [Project status](#project-status) and [Limitations and roadmap](#limitations-and-roadmap).

## Table of contents

- [What problem this solves](#what-problem-this-solves)
- [Why this is not a replacement for CSS](#why-this-is-not-a-replacement-for-css)
- [Project status](#project-status)
- [Architecture](#architecture)
- [Packages in this repository](#packages-in-this-repository)
- [Installation](#installation)
- [Minimal React example](#minimal-react-example)
- [The layout primitives](#the-layout-primitives)
- [The hooks — for advanced cases](#the-hooks--for-advanced-cases)
- [Breakpoints and the computed values](#breakpoints-and-the-computed-values)
- [Custom configuration](#custom-configuration)
- [Server-side rendering](#server-side-rendering)
- [Compatibility](#compatibility)
- [Development commands](#development-commands)
- [Tests and CI](#tests-and-ci)
- [Limitations and roadmap](#limitations-and-roadmap)
- [Contributing](#contributing)
- [License](#license)

## What problem this solves

Most responsive logic today lives in one of two places: CSS (media queries, `clamp()`, container queries) or ad hoc, framework-specific hooks that re-read `window` and re-implement the same breakpoint and scaling rules per project. Neither gives an application's *logic* — not just its styling — a single, consistent answer to "what layout am I in right now," and neither is shared across a JavaScript frontend and a Python one.

Fluida centralizes that decision in one place: a small, pure computation from viewport width (and, deliberately, only width for most fields — see [Limitations](#limitations-and-roadmap)) to a `LayoutTokens` object. Every consumer, in every framework, asks the same engine the same question and gets the same answer.

## Why this is not a replacement for CSS

Fluida does not touch the DOM, does not write CSS on its own account, and does not render anything by itself — the React primitives apply computed values as inline styles, but the *computation* lives entirely in `@fluida/core`. CSS (and, increasingly, native Container Queries) is still what actually paints the page, and for purely visual responsiveness within a single component tree, Container Queries and `clamp()` already solve a large part of this problem natively, with no JavaScript at all.

Fluida's reason to exist is narrower and specific: exposing the *same* responsive decision to application logic — not just styling — identically across frameworks that don't share a CSS layer, and eventually across languages (JavaScript and Python) that don't share a runtime at all. If your responsive needs are purely visual and confined to CSS, native Container Queries are very likely the simpler answer.

## Project status

| Package | Status |
|---|---|
| `@fluida/core` | Implemented and tested. Framework-agnostic, zero runtime dependencies. |
| `@fluida/react` | Implemented and tested. A `FluidaProvider`, four layout primitives, and two hooks. |
| Dash bridge | Planned. Not started — no code exists for it yet. |
| npm / PyPI publication | Not published. Use via this monorepo (`workspace:*` or a local clone) today. |

## Architecture
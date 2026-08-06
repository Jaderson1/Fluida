# Fluida

Fluida is a framework-agnostic adaptive layout engine, with official adapters for TypeScript, React, Python, and Dash. It computes layout decisions — column counts, cell sizes, typography scale, spacing — from real measurements, not just CSS breakpoints.

## Why Fluida

Viewport responsiveness answers "what layout fits the browser window." Container-aware layout answers a different, often more useful question: "what layout fits *this specific element*, right now, given how many items it holds." CSS alone handles the first reasonably well; it has no built-in way to answer the second without you hand-rolling the arithmetic yourself — how many columns fit a measured width, what a cell's height should be to keep a chart's aspect ratio, when a container's height should come from its content instead of a guess.

Fluida exists for the cases where that arithmetic keeps showing up: dashboards with a variable number of cards, chart grids that need to preserve aspect ratio without a fixed pixel height, maps or embeds that need a real measured container, and any component meant to be reused where the surrounding page width isn't known in advance.

## Packages

| Package | Language | What it does |
| --- | --- | --- |
| [`@fluida/core`](packages/core/README.md) | TypeScript | Framework-agnostic engine. Viewport layout and container layout, no dependencies, no DOM requirement beyond what each adapter provides. |
| [`@fluida/react`](packages/react/README.md) | TypeScript (React) | React adapter: `FluidaProvider`, viewport-based components, and container-measuring components (`FluidaAdaptiveGrid`), built on `@fluida/core`. |
| [`fluida-core`](python/fluida-core/README.md) | Python | Independent, pure-Python port of the same container layout algorithm — no JavaScript, no browser, checked against the same shared test cases as the TypeScript engine. |
| [`dash-fluida`](python/dash-fluida/README.md) | Python + TypeScript | Dash custom component (`FluidaGrid`). Measurement and layout computation happen in the browser, using `@fluida/core` bundled into its frontend — the Python side declares the component and can optionally receive the computed layout back. |

`fluida-core` and `dash-fluida` are separate: `fluida-core` never touches a browser and is useful on its own for backend calculations or generating layouts without a UI. `dash-fluida` is a real Dash component and depends on `@fluida/core` directly (bundled), not on `fluida-core`.

## Installation

None of Fluida's packages are published to npm or PyPI yet. Until they are, install from the repository:

```bash
git clone https://github.com/Jaderson1/Fluida.git
cd Fluida
corepack enable
pnpm install
pnpm build
```

`@fluida/react` and `@fluida/core` can then be packed locally for use in another project:

```bash
pnpm --filter @fluida/core pack
pnpm --filter @fluida/react pack
```

For Python, install either package directly from a local clone:

```bash
pip install ./python/fluida-core
pip install ./python/dash-fluida
```

This section will be updated with real `npm install`/`pip install` commands once packages are published — see [Project status](#project-status).

## Quick start

**TypeScript, framework-agnostic:**

```ts
import { computeContainerLayout } from '@fluida/core';

const layout = computeContainerLayout(800, 600, {
  itemCount: 8,
  strategy: 'fit',
  gap: 16,
});
```

**React:**

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

**`FluidaAdaptiveGrid`**, measuring its own container and computing its own height:

```tsx
import { FluidaAdaptiveGrid } from '@fluida/react';

<FluidaAdaptiveGrid
  itemCount={4}
  strategy="preserve-ratio"
  aspectRatio={16 / 9}
  minItemWidth={280}
  autoHeight
  gap={16}
>
  <ChartA />
  <ChartB />
  <ChartC />
  <ChartD />
</FluidaAdaptiveGrid>;
```

**Python, framework-agnostic:**

```python
from fluida_core import compute_container_layout

layout = compute_container_layout(800, 600, item_count=8, strategy="fit", gap=16)
```

**Dash:**

```python
from dash import Dash, html
from dash_fluida import FluidaGrid

app = Dash(__name__)
app.layout = html.Div([
    FluidaGrid(
        item_count=4,
        strategy="preserve-ratio",
        aspect_ratio=16 / 9,
        min_item_width=280,
        auto_height=True,
        gap=16,
        children=[html.Div("Card") for _ in range(4)],
    ),
])
```

## Core concepts

**Viewport layout** — breakpoint, grid columns, spacing, typography scale, and container max-width, all derived from the browser's own viewport width. This is what `FluidaProvider`, `FluidaContainer`, `FluidaGrid`, `FluidaStack`, and `FluidaText` use.

**Container layout** — column count and cell size, derived from one specific element's real measured size and a known item count, independent of the viewport. This is what `computeContainerLayout` and `FluidaAdaptiveGrid` (React) / `FluidaGrid` (Dash) use.

**Layout strategies** — `fit` (square cells), `preserve-ratio` (a fixed aspect ratio you set), `fill` (uses all available space, any resulting shape), `balanced` (less distorted than `fill` without forcing a square). `fill` and `balanced` require a known container height; `fit` and `preserve-ratio` can run without one.

**Auto-height** (`autoHeight` / `auto_height`) — lets `fit` and `preserve-ratio` compute a layout from width alone, deriving height instead of requiring it upfront. Requires `minItemWidth`/`min_item_width` as the basis for choosing a column count.

**Typography and spacing** — viewport layout also produces a typography scale and a spacing value, both derived the same way as breakpoints, available via `useFluidaLayout()` in React or the equivalent viewport-layout fields in Core.

**Subscriptions and lifecycle** — `useFluidaSnapshot()` and `useFluidaLayout()` (React) subscribe to viewport changes and re-render only when the relevant values change; container-based components use `ResizeObserver`, coalesced to at most one recomputation per animation frame.

## Use cases

- Responsive dashboards with a variable number of cards.
- Chart grids that need to preserve aspect ratio without a fixed pixel height.
- Maps or embeds that need to be measured, not guessed at.
- TV and large-display interfaces, where a normal desktop breakpoint set stops making sense.
- Container-aware component libraries meant to be dropped into pages of unknown width.
- React and Dash applications that need equivalent layout behavior without duplicating the logic in two places.
- Backend or offline layout calculations (`fluida-core`, Python) without a browser.

## Large-screen and 4K behavior

Fluida has been checked at mobile, tablet, notebook, 1080p, 1440p, and 4K (3840×2160) viewport sizes, in both the React and Dash demos — this is validation on the demos included in this repository, not a guarantee about every physical TV or display Fluida might run on.

Fluida's own responsibility ends at computing layout: columns, cell size, typography scale, spacing. What renders *inside* a cell — a Plotly chart, a map, a video embed — is the content's own responsibility. A chart library with its own internal sizing behavior (for example, one that only reacts to its first resize notification) needs its own resize handling to fully benefit from a cell that Fluida resizes after the fact; this repository's Dash demo includes a real example of exactly that integration.

## Monorepo structure

```text
packages/
├── core/          → @fluida/core
└── react/         → @fluida/react

python/
├── fluida-core/   → pure-Python port of the same layout algorithm
└── dash-fluida/   → Dash custom component (Python wrapper + TypeScript frontend)
    ├── demo/      → Dash demo application
    └── e2e/       → Playwright end-to-end tests, real-browser

spec/
└── conformance/   → shared test cases checked by both the TypeScript and Python implementations

examples/
└── react-demo/    → Vite + React demo
```

## Development

```bash
git clone https://github.com/Jaderson1/Fluida.git
cd Fluida
corepack enable
pnpm install
```

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run the demos:

```bash
pnpm demo:react           # React demo (Vite dev server)
```

```bash
cd python/dash-fluida
pip install -e ".[dev]"
python demo/app.py        # Dash demo
```

Python tests:

```bash
cd python/fluida-core && pip install -e ".[dev]" && pytest
cd python/dash-fluida && pip install -e ".[dev]" && pytest
```

End-to-end tests, real Chromium (separate from the commands above — see [Testing](#testing)):

```bash
cd python/dash-fluida
pip install -e ".[e2e]"
playwright install chromium
pytest e2e/tests
```

On Windows PowerShell, replace `pip install -e ".[dev]"` with `pip install -e ".[dev]"` unchanged (the quoting works the same); activate a virtual environment first with `.venv\Scripts\Activate.ps1` if you're using one, matching the equivalent `source .venv/bin/activate` on Linux/macOS.

## Testing

- **`@fluida/core`** — unit tests for the layout engine (`vitest`).
- **`@fluida/react`** — component and hook tests, including SSR and React Strict Mode behavior.
- **Dash frontend** — TypeScript unit tests for the resize/measurement logic.
- **`fluida-core`** (Python) — unit tests mirroring the TypeScript engine's own test cases.
- **`dash-fluida`** (Python) — component wrapper and serialization tests.
- **Shared conformance** — the same layout cases (`spec/conformance/layout-cases.json`), including invalid-configuration cases, checked by both the TypeScript and Python engines, so the two stay behaviorally aligned.
- **End-to-end** — Playwright tests against a real Chromium browser, covering the Dash demo's actual visual layout (no horizontal overflow, correct centering, chart sizing) at multiple viewport sizes, run as a separate CI job from the rest.

CI runs every suite above on each push; see the workflow badge for current status rather than a specific number here, since test counts change as the project grows.

## Browser and runtime support

- Node.js `>=22.13.0` (checked in CI on `22.13.0` and `24`).
- React and React DOM `>=18.0.0` (`@fluida/react`'s declared peer range; checked in CI against both `18` and the current `19` release).
- Python `>=3.9` (declared in both Python packages; CI checks `3.9` and `3.13`).
- `dash-fluida` requires Dash `>=2.4`.
- Modern evergreen browsers (anywhere `ResizeObserver` and `requestAnimationFrame` are available) — no specific browser/version matrix is currently published beyond what CI's own Chromium-based E2E suite exercises.

## Project status

Public beta, `v0.2.x`. Pre-1.0: the public API can still change before a `v1.0.0` release, though nothing in this series has removed working functionality outright — see [`CHANGELOG.md`](CHANGELOG.md) for what's changed release to release. Versioning follows semver once `v1.0.0` lands; until then, treat minor version bumps as the point where a breaking change is most likely to be documented.

## Roadmap

Not commitments with dates — a rough sense of what's next, based on what's already in progress in this repository:

- Stabilizing the public API ahead of a `v1.0.0` release.
- Publishing all four packages to npm and PyPI.
- More real-world examples beyond the two demos in this repository.
- Expanded documentation, and performance benchmarks where they'd actually inform a decision (column-count search cost at large item counts, for example).
- Additional adapters, if a real use case motivates one.

## Contributing

Issues and pull requests are welcome.

1. Open an issue describing the problem or proposal before a large change.
2. Branch from `main`.
3. Run the relevant test suites for whatever you changed (`pnpm test`, Python `pytest`, or both) before opening a PR — see [Testing](#testing) and [Development](#development).
4. Keep changes to `@fluida/core`'s layout algorithm accompanied by conformance cases in `spec/conformance/layout-cases.json`, covering both languages.

## License

MIT — see [`LICENSE`](LICENSE).
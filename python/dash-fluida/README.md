# dash-fluida

A Dash custom component (`FluidaGrid`) that measures its own real container size in the browser and lays out its children using the same layout engine as [`@fluida/core`](https://github.com/Jaderson1/Fluida/tree/main/packages/core).

**Status: pre-release, `0.1.0`.** Not published to PyPI yet.

## Architecture

```
Dash / Python declares FluidaGrid(...)
  → frontend JavaScript measures the container with ResizeObserver
  → requestAnimationFrame coalesces updates (at most one per frame)
  → @fluida/core computes the layout in the browser
  → CSS Grid receives the result
```

The Python side never computes a layout, and never sees a resize event unless you explicitly ask for one (see `notify_layout_changes` below). The computation always happens in the browser, using the real `@fluida/core` package — bundled directly into this component's frontend, not reimplemented in JavaScript or in Python.

`fluida-core` (the pure-Python port, in [`../fluida-core`](../fluida-core)) is a separate, independent thing from this package — useful for offline calculations, backend logic, or generating previews without a browser. This package does not use it and does not need to: the measurement itself only ever happens client-side.

## Installation

Not available on PyPI yet.

```bash
pip install -e path/to/dash-fluida
```

## Usage

```python
from dash import Dash, html
from dash_fluida import FluidaGrid

app = Dash(__name__)

app.layout = html.Div([
    FluidaGrid(
        item_count=6,
        gap=16,
        min_item_width=280,
        strategy="fill",
        children=[html.Div(f"Card {i}") for i in range(6)],
    ),
])

if __name__ == "__main__":
    app.run(debug=True)
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `item_count` | `int` | — | Required. |
| `strategy` | `"fit" \| "fill" \| "balanced" \| "preserve-ratio"` | `"fit"` | |
| `gap` | `float` | `16` | |
| `aspect_ratio` | `float` | `1` | Only used by `"preserve-ratio"`. |
| `min_item_width` | `float` | `None` | Omitted applies no constraint. |
| `style` | `dict` | `None` | Merged with (and overriding) the layout-driven inline styles. |
| `className` | `str` | `None` | |
| `notify_layout_changes` | `bool` | `False` | See below. |
| `columns`, `rows`, `cellWidth`, `cellHeight` | — | — | Output-only; populated when `notify_layout_changes=True`. |

## `notify_layout_changes`

By default (`False`), the computed layout only drives this component's own rendering — nothing is ever sent to the Python side, and no round-trip happens on resize. Set it to `True` to also receive `columns`/`rows`/`cellWidth`/`cellHeight` as props, useful for a callback reacting to the computed layout:

```python
FluidaGrid(item_count=6, notify_layout_changes=True, id="grid")

@app.callback(Output("info", "children"), Input("grid", "columns"))
def show_columns(columns):
    return f"Currently showing {columns} columns"
```

Even with this enabled, updates are batched to at most one `setProps` call per animation frame — never one per raw resize event.

## Build tooling

No webpack, no `dash-component-boilerplate`. The frontend is built with [`tsup`](https://tsup.egoist.dev) (esbuild), producing a single IIFE bundle. React and `prop-types` are not bundled — they're provided by Dash's own renderer at runtime (`window.React` / `window.PropTypes`), the same convention Dash's own built-in components use — confirmed directly against `dash`'s own installed, shipped bundle, not assumed.

```bash
pnpm install
pnpm --filter @fluida/core build
pnpm --filter dash-fluida-frontend build
```

This produces `src/dash_fluida/dash_fluida.min.js`, which `pyproject.toml` includes as a build artifact in the wheel.

## Development (Python side)

```bash
python -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/python -m pytest
```

## What is and isn't verified here

The Python-side tests (props, validation, serialization, that the real bundle is present and contains the real `@fluida/core` algorithm) run and pass in this environment. What they do **not** verify — because it requires an actual browser — is that `FluidaGrid` visually renders, resizes, and lays out children correctly inside a running Dash app. The `ResizeObserver` + `requestAnimationFrame` pattern used here is the same one already tested directly in `@fluida/react`'s own test suite; it is not retested here.

## License

MIT.

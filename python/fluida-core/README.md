# fluida-core

A framework-agnostic, pure-Python container layout engine. Computes how many columns and rows to use, and what size each cell should be, from a real container size and a known item count.

**Status: pre-release, `0.2.0`.** Not published to PyPI yet.

This is an independent Python port of the same algorithm implemented in [`@fluida/core`](https://github.com/Jaderson1/Fluida/tree/main/packages/core) (TypeScript) — not a wrapper around it. No JavaScript, Node.js, subprocess, or browser is involved anywhere in this package. Both implementations are checked against the same shared, language-neutral test cases in [`spec/conformance/layout-cases.json`](../../spec/conformance/layout-cases.json), at the root of the [Fluida monorepo](https://github.com/Jaderson1/Fluida).

## Installation

Not available on PyPI yet.

```bash
pip install -e path/to/fluida-core
```

## Quick example

```python
from fluida_core import compute_container_layout

result = compute_container_layout(
    container_width=1200,
    container_height=600,
    item_count=6,
    gap=16,
    min_item_width=280,
    strategy="fit",
)

print(result)
# LayoutResult(columns=4, rows=2, cell_width=288.0, cell_height=288.0)
```

## API

### `compute_container_layout(container_width, container_height, item_count, strategy="fit", gap=16, aspect_ratio=1, min_item_width=None)`

- `container_width` — the container's real measured width. Must be finite and `>= 0`; `0` is valid and represents a container not yet measured.
- `container_height` — the container's real measured height, or `None` for auto-height (see below). When provided, must be finite and `>= 0`.
- `item_count` — how many cells to lay out. Must be a positive integer — `1.5`, `True`/`False` (`bool` is an `int` subclass in Python, rejected explicitly), `NaN`, and `Infinity` all raise `FluidaConfigError`.
- `strategy` — one of `"fit"`, `"fill"`, `"balanced"`, `"preserve-ratio"`. Anything else raises `FluidaConfigError`. Defaults to `"fit"`.
- `gap` — space between cells. Defaults to `16`.
- `aspect_ratio` — width / height. Only used by `"preserve-ratio"`. Defaults to `1`.
- `min_item_width` — when set, column counts whose resulting cell would be narrower than this are excluded entirely. `None` (the default) applies no such constraint.

Returns a `LayoutResult`:

```python
@dataclass(frozen=True)
class LayoutResult:
    columns: int
    rows: int
    cell_width: float
    cell_height: float
```

Raises `FluidaConfigError` (a `ValueError` subclass) for an invalid `item_count`, `gap`, `aspect_ratio`, `min_item_width`, `container_width`, `container_height`, or `strategy` — the same conditions the TypeScript implementation raises `FluidaConfigError` for.

## Strategies

- **`fit`** (default) — square cells, the largest size that fits without overflow. Choose it for uniform, icon-like content.
- **`fill`** — uses 100% of the space in both axes; cells may not be square. Requires a known `container_height`.
- **`balanced`** — the smaller of `fill`'s two dimensions stays unchanged; the larger is pulled toward it (geometric mean with the smaller) without ever exceeding either original dimension — less distorted than `fill`, without forcing a square like `fit`. Requires a known `container_height`.
- **`preserve-ratio`** — cells keep the configured `aspect_ratio` exactly, even if that leaves leftover space. Choose it for charts, images, or video.

## Auto-height

`container_height` can be `None` for `fit` and `preserve-ratio` specifically, and only when `min_item_width` is also set:

```python
result = compute_container_layout(
    container_width=800,
    container_height=None,
    item_count=4,
    strategy="preserve-ratio",
    aspect_ratio=4 / 3,
    min_item_width=300,
)
```

Without a known height, column count comes from `min_item_width` alone, and `cell_height` is derived from the resulting `cell_width` directly. `fill` and `balanced` cannot do this — both raise `FluidaConfigError` if `container_height` is omitted, as does `fit`/`preserve-ratio` without `min_item_width` also set.

## What this package does not do

It does not measure anything — there is no DOM, no browser, no `ResizeObserver` here. It takes numbers you already have and returns a layout. Measuring a real container in a browser is [`dash-fluida`](../dash-fluida)'s job, or your own application's, if you're using this package directly for offline calculations, backend logic, or generating previews.

## Compatibility

Python `>=3.9`. No runtime dependencies. Fully type-hinted; ships a `py.typed` marker.

## Conformance with the TypeScript implementation

`tests/test_conformance.py` loads `spec/conformance/layout-cases.json` directly — the same file `@fluida/core`'s own TypeScript test suite checks against — and verifies this package produces the same `columns`/`rows` (exact equality) and `cell_width`/`cell_height` (within the tolerance the file itself declares). This is meant to catch real behavioral drift between the two implementations, not to prove they're bit-identical: floating-point arithmetic across two different language runtimes isn't expected to match beyond a small tolerance, and the shared file says so explicitly.

## Development

```bash
python -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/python -m pytest
```

## License

MIT.

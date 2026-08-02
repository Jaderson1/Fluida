"""Pure, framework-agnostic container layout computation.

This is a faithful, independent Python port of the same algorithm in
@fluida/core (TypeScript) — packages/core/src/engine/computeContainerLayout.ts.
No JavaScript, Node.js, subprocess, or browser is used anywhere in this
module: every computation here is plain Python arithmetic, verified
against the same shared conformance cases the TypeScript implementation
uses (see spec/conformance/layout-cases.json at the repository root).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

from .models import FluidaConfigError, LayoutResult, LayoutStrategy

_DEFAULT_GAP = 16
_DEFAULT_ASPECT_RATIO = 1
_VALID_STRATEGIES = ("fill", "fit", "balanced", "preserve-ratio")


def _is_positive_integer(value: object) -> bool:
    """bool is an int subclass in Python — excluded explicitly, since
    item_count is a discrete quantity, not a flag."""
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return value >= 1
    if isinstance(value, float):
        return math.isfinite(value) and value.is_integer() and value >= 1
    return False


@dataclass(frozen=True)
class _Candidate:
    columns: int
    rows: int
    cell_width: float
    cell_height: float


def _find_best_filling_columns(
    container_width: float,
    container_height: float,
    item_count: int,
    gap: float,
    min_item_width: Optional[float],
) -> _Candidate:
    """For each column count from 1 up to item_count, computes the cell
    size that fills the space exactly, discards candidates that don't
    fit or don't meet min_item_width, and keeps whichever surviving
    candidate has the least width/height distortion.
    """
    best: Optional[_Candidate] = None
    best_score = math.inf

    for columns in range(1, item_count + 1):
        rows = math.ceil(item_count / columns)

        cell_width = (container_width - (columns - 1) * gap) / columns
        cell_height = (container_height - (rows - 1) * gap) / rows

        if cell_width <= 0 or cell_height <= 0:
            continue
        if min_item_width is not None and cell_width < min_item_width:
            continue

        score = abs(cell_width - cell_height)
        if score < best_score:
            best_score = score
            best = _Candidate(columns, rows, cell_width, cell_height)

    if best is not None:
        return best

    # No candidate produced a positive size, or none met
    # min_item_width — one column at zero size, matching the state
    # before any real measurement exists.
    return _Candidate(columns=1, rows=item_count, cell_width=0, cell_height=0)


@dataclass(frozen=True)
class _WidthOnlyColumns:
    columns: int
    rows: int
    cell_width: float


def _find_columns_by_width_only(
    container_width: float,
    item_count: int,
    gap: float,
    min_item_width: float,
) -> _WidthOnlyColumns:
    """Used only when container_height isn't known, where the
    distortion-minimizing search above has nothing to compare
    cell_width against, so min_item_width becomes the sole basis for a
    column count.

    Solved directly: (container_width - gap*(columns-1)) / columns >=
    min_item_width rearranges to columns <= (container_width + gap) /
    (min_item_width + gap), so the largest valid column count is the
    floor of that, clamped to [0, item_count].
    """
    max_columns_for_width = math.floor((container_width + gap) / (min_item_width + gap))
    columns = max(0, min(max_columns_for_width, item_count))

    if columns < 1:
        return _WidthOnlyColumns(columns=1, rows=item_count, cell_width=0)

    rows = math.ceil(item_count / columns)
    cell_width = (container_width - (columns - 1) * gap) / columns

    return _WidthOnlyColumns(columns=columns, rows=rows, cell_width=cell_width)


def _balanced_cell_size(width: float, height: float) -> tuple[float, float]:
    """'balanced' cell size for a base (fill) cell of width/height.

    fit_size = min(width, height) is the largest square that fits in
    both axes — the same value 'fit' itself uses. Each axis here is
    the geometric mean of its own fill value and fit_size: the smaller
    fill dimension already equals fit_size, so that axis is unchanged;
    the larger axis is pulled toward fit_size without reaching it.

    Both axes stay within their original fill bounds by construction:
    for any x >= fit_size, sqrt(x * fit_size) <= x. That inequality is
    what guarantees the total grid size never exceeds the container.
    """
    fit_size = min(width, height)
    return math.sqrt(width * fit_size), math.sqrt(height * fit_size)


def compute_container_layout(
    container_width: float,
    container_height: Optional[float],
    item_count: int,
    strategy: LayoutStrategy = "fit",
    gap: float = _DEFAULT_GAP,
    aspect_ratio: float = _DEFAULT_ASPECT_RATIO,
    min_item_width: Optional[float] = None,
) -> LayoutResult:
    """Compute a container layout — columns, rows, and cell size — from a
    real measured container size and a known item count.

    container_height may be omitted (None) — auto-height mode — for
    the 'fit' and 'preserve-ratio' strategies specifically, and only
    when min_item_width is also set: without a known height, the usual
    column search has nothing to weigh cell_width against, so
    min_item_width becomes the sole basis for choosing how many
    columns to use, and cell_height is then derived from cell_width
    directly. 'fill' and 'balanced' cannot do this: both compute cell
    size directly from container_height, and raise FluidaConfigError
    if it's omitted.

    Raises FluidaConfigError for an invalid item_count, gap,
    aspect_ratio, min_item_width, container_width, container_height,
    or strategy — the same conditions @fluida/core's TypeScript
    implementation raises FluidaConfigError for.
    """

    if not _is_positive_integer(item_count):
        raise FluidaConfigError(
            f"Fluida container layout: item_count must be a positive integer, got {item_count!r}."
        )

    if isinstance(gap, bool) or not math.isfinite(gap) or gap < 0:
        raise FluidaConfigError(
            f"Fluida container layout: gap must be a finite, non-negative number, got {gap!r}."
        )

    if isinstance(aspect_ratio, bool) or not math.isfinite(aspect_ratio) or aspect_ratio <= 0:
        raise FluidaConfigError(
            f"Fluida container layout: aspect_ratio must be a finite number greater than 0, got {aspect_ratio!r}."
        )

    if min_item_width is not None and (
        isinstance(min_item_width, bool) or not math.isfinite(min_item_width) or min_item_width <= 0
    ):
        raise FluidaConfigError(
            f"Fluida container layout: min_item_width must be a finite number greater than 0, got {min_item_width!r}."
        )

    if isinstance(container_width, bool) or not math.isfinite(container_width) or container_width < 0:
        raise FluidaConfigError(
            f"Fluida container layout: container_width must be a finite number >= 0, got {container_width!r}."
        )

    if container_height is not None and (
        isinstance(container_height, bool)
        or not math.isfinite(container_height)
        or container_height < 0
    ):
        raise FluidaConfigError(
            f"Fluida container layout: container_height must be a finite number >= 0, got {container_height!r}."
        )

    if strategy not in _VALID_STRATEGIES:
        raise FluidaConfigError(
            f"Fluida container layout: strategy must be one of {_VALID_STRATEGIES}, got {strategy!r}."
        )

    item_count = int(item_count)

    if container_height is None:
        # Auto-height: 'fill' and 'balanced' compute cell size directly
        # from container_height, with nothing to substitute.
        if strategy not in ("fit", "preserve-ratio"):
            raise FluidaConfigError(
                f"Fluida container layout: strategy '{strategy}' requires a known "
                "container_height — only 'fit' and 'preserve-ratio' support "
                "computing a layout without one."
            )

        if min_item_width is None:
            raise FluidaConfigError(
                "Fluida container layout: computing a layout without a known "
                "container_height requires min_item_width."
            )

        width_only = _find_columns_by_width_only(container_width, item_count, gap, min_item_width)

        if width_only.cell_width <= 0:
            return LayoutResult(width_only.columns, width_only.rows, 0, 0)

        if strategy == "fit":
            return LayoutResult(
                width_only.columns, width_only.rows, width_only.cell_width, width_only.cell_width
            )

        return LayoutResult(
            width_only.columns,
            width_only.rows,
            width_only.cell_width,
            width_only.cell_width / aspect_ratio,
        )

    base = _find_best_filling_columns(
        container_width, container_height, item_count, gap, min_item_width
    )

    if base.cell_width <= 0 or base.cell_height <= 0:
        return LayoutResult(base.columns, base.rows, base.cell_width, base.cell_height)

    if strategy == "fill":
        return LayoutResult(base.columns, base.rows, base.cell_width, base.cell_height)

    if strategy == "fit":
        size = min(base.cell_width, base.cell_height)
        return LayoutResult(base.columns, base.rows, size, size)

    if strategy == "preserve-ratio":
        cell_width = min(base.cell_width, base.cell_height * aspect_ratio)
        cell_height = cell_width / aspect_ratio
        return LayoutResult(base.columns, base.rows, cell_width, cell_height)

    cell_width, cell_height = _balanced_cell_size(base.cell_width, base.cell_height)
    return LayoutResult(base.columns, base.rows, cell_width, cell_height)

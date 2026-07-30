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


@dataclass(frozen=True)
class _Candidate:
    columns: int
    rows: int
    cell_width: float
    cell_height: float


def _find_best_filling_columns(
    container_width: float,
    container_height: float,
    item_count: float,
    gap: float,
    min_item_width: Optional[float],
) -> _Candidate:
    """Mirrors findBestFillingColumns in computeContainerLayout.ts: for
    each column count from 1 up to item_count, computes the cell size
    that fills the space exactly, discards candidates that don't fit
    or don't meet min_item_width, and keeps whichever surviving
    candidate has the least width/height distortion.

    Falls back to a single column at zero size if nothing qualifies —
    including the same literal (not rounded) use of item_count for
    rows that the TypeScript implementation has in this exact spot,
    rather than a value derived independently.
    """
    best: Optional[_Candidate] = None
    best_score = math.inf

    max_columns = math.floor(item_count)
    for columns in range(1, max_columns + 1):
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
    # min_item_width — either way, a single column at zero size is
    # the honest answer: not wrong, just not something that currently
    # fits. Note item_count is used here as-is, unrounded, exactly as
    # the TypeScript implementation does in this same spot.
    return _Candidate(columns=1, rows=item_count, cell_width=0, cell_height=0)


@dataclass(frozen=True)
class _WidthOnlyColumns:
    columns: int
    rows: float
    cell_width: float


def _find_columns_by_width_only(
    container_width: float,
    item_count: float,
    gap: float,
    min_item_width: float,
) -> _WidthOnlyColumns:
    """Mirrors findColumnsByWidthOnly in computeContainerLayout.ts —
    used only when container_height isn't known, where the
    distortion-minimizing search in _find_best_filling_columns has
    nothing to compare cell_width against, so min_item_width becomes
    the sole basis for a column count instead.

    Solved directly rather than searched: the inequality
    (container_width - gap*(columns-1)) / columns >= min_item_width
    rearranges to columns <= (container_width + gap) / (min_item_width + gap),
    so the largest valid integer column count is the floor of that,
    clamped to at least 0 and at most item_count. No loop needed —
    this is a closed-form solution, not an approximation of one.
    """
    max_columns_for_width = math.floor((container_width + gap) / (min_item_width + gap))
    columns = max(0, min(max_columns_for_width, math.floor(item_count)))

    if columns < 1:
        # Not even a single column reaches min_item_width at this
        # width — the same honest "doesn't fit yet" answer
        # _find_best_filling_columns gives in the equivalent
        # situation, not a distinct error.
        return _WidthOnlyColumns(columns=1, rows=item_count, cell_width=0)

    rows = math.ceil(item_count / columns)
    cell_width = (container_width - (columns - 1) * gap) / columns

    return _WidthOnlyColumns(columns=columns, rows=rows, cell_width=cell_width)


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
    directly (equal to it, for fit; divided by aspect_ratio, for
    preserve-ratio) — never limited by a height that was never given.
    'fill' and 'balanced' cannot do this: both compute cell size
    directly from container_height, with nothing to substitute, and
    raise FluidaConfigError if it's omitted.

    Raises FluidaConfigError for a non-finite or out-of-range
    item_count, gap, aspect_ratio, or min_item_width — the exact same
    conditions @fluida/core's TypeScript implementation raises
    FluidaConfigError for, checked in the same order.

    An unrecognized strategy string is deliberately not validated at
    runtime here when container_height is known: the TypeScript
    implementation doesn't validate it either — its type system only
    enforces this at compile time — and an unrecognized value falls
    through to the same fill-shaped result in both implementations.
    When container_height is omitted, an unrecognized strategy is
    rejected for the same reason 'fill' itself is — it defaults to
    fill-shaped behavior, which auto-height cannot support.
    """

    if not math.isfinite(item_count) or item_count < 1:
        raise FluidaConfigError(
            f"Fluida container layout: item_count must be a finite number of at least 1, got {item_count}."
        )

    if not math.isfinite(gap) or gap < 0:
        raise FluidaConfigError(
            f"Fluida container layout: gap must be a finite, non-negative number, got {gap}."
        )

    if not math.isfinite(aspect_ratio) or aspect_ratio <= 0:
        raise FluidaConfigError(
            f"Fluida container layout: aspect_ratio must be a finite number greater than 0, got {aspect_ratio}."
        )

    if min_item_width is not None and (
        not math.isfinite(min_item_width) or min_item_width <= 0
    ):
        raise FluidaConfigError(
            "Fluida container layout: min_item_width must be a finite number "
            f"greater than 0, got {min_item_width}."
        )

    if container_height is None:
        if strategy not in ("fit", "preserve-ratio"):
            raise FluidaConfigError(
                f"Fluida container layout: strategy '{strategy}' requires a known "
                "container_height — only 'fit' and 'preserve-ratio' support "
                "computing a layout without one."
            )

        if min_item_width is None:
            raise FluidaConfigError(
                "Fluida container layout: computing a layout without a known "
                "container_height requires min_item_width — without either, "
                "there is no basis for choosing a column count."
            )

        width_only = _find_columns_by_width_only(container_width, item_count, gap, min_item_width)

        if width_only.cell_width <= 0:
            return LayoutResult(width_only.columns, width_only.rows, 0, 0)

        if strategy == "fit":
            return LayoutResult(
                width_only.columns, width_only.rows, width_only.cell_width, width_only.cell_width
            )

        # strategy == "preserve-ratio"
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
        # Nothing measured yet, or nothing fit — return the shape
        # as-is, at zero size, rather than applying a
        # strategy-specific formula to numbers that aren't real yet.
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

    if strategy == "balanced":
        size = math.sqrt(base.cell_width * base.cell_height)
        return LayoutResult(base.columns, base.rows, size, size)

    # Unrecognized strategy — the same fallback the TypeScript
    # switch's default case takes: behaves like 'fill'.
    return LayoutResult(base.columns, base.rows, base.cell_width, base.cell_height)

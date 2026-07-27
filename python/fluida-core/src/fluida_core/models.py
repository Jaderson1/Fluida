"""Public data types for fluida_core."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

LayoutStrategy = Literal["fit", "fill", "balanced", "preserve-ratio"]
"""The four layout strategies, identical in name and behavior to
ContainerLayoutStrategy in @fluida/core (TypeScript). As with the
TypeScript union type, this is a static hint only — nothing at
runtime rejects an unrecognized string here either; see
compute_container_layout's own docstring for why."""


@dataclass(frozen=True)
class LayoutResult:
    """The computed layout: how many columns and rows, and the size each
    cell should be. Mirrors ContainerLayoutResult in @fluida/core
    (TypeScript) field-for-field, with cellWidth/cellHeight renamed to
    the snake_case cell_width/cell_height."""

    columns: int
    rows: int
    cell_width: float
    cell_height: float


class FluidaConfigError(ValueError):
    """Raised for invalid Fluida container layout configuration.

    Mirrors FluidaConfigError in @fluida/core (TypeScript) — the same
    kind of invalid input (a non-finite or out-of-range item_count,
    gap, aspect_ratio, or min_item_width) raises this in both
    implementations. Subclasses ValueError, so it can be caught either
    specifically or as a general invalid-argument error, matching
    common Python convention.
    """

"""Loads spec/conformance/layout-cases.json — the same shared,
language-neutral cases packages/core/src/engine/layoutConformance.test.ts
checks the TypeScript implementation against — and verifies
fluida_core produces the same results, within the same declared
tolerance. Nothing here is copied by hand from the JSON file; it's
read directly, exactly as the rules for this file require."""

import json
from pathlib import Path
from typing import Any, Dict

import pytest

from fluida_core import compute_container_layout

_CONFORMANCE_FILE_PATH = (
    Path(__file__).resolve().parents[3] / "spec" / "conformance" / "layout-cases.json"
)


def _load_conformance_file() -> Dict[str, Any]:
    with _CONFORMANCE_FILE_PATH.open(encoding="utf-8") as f:
        return json.load(f)


_CONFORMANCE_FILE = _load_conformance_file()
_TOLERANCE = _CONFORMANCE_FILE["tolerance"]
_CASES = _CONFORMANCE_FILE["cases"]


def _is_within_tolerance(actual: float, expected: float) -> bool:
    """The same relative-tolerance-with-an-absolute-floor rule the
    TypeScript conformance test uses: allows up to
    max(absoluteMinimum, |expected| * relative) of difference."""
    allowed_difference = max(
        _TOLERANCE["absoluteMinimum"], abs(expected) * _TOLERANCE["relative"]
    )
    return abs(actual - expected) <= allowed_difference


def test_conformance_file_loads_at_least_fifteen_cases():
    assert len(_CASES) >= 15


@pytest.mark.parametrize("case", _CASES, ids=lambda case: case["id"])
def test_conformance_case(case: Dict[str, Any]):
    input_ = case["input"]
    options: Dict[str, Any] = dict(input_["options"])

    # The JSON's options use the same field names as the TypeScript
    # API (itemCount, aspectRatio, minItemWidth) — mapped here to
    # compute_container_layout's snake_case keyword arguments, per
    # this file's own explicit mapping rule. This mapping is the only
    # translation applied; no values are altered.
    kwargs: Dict[str, Any] = {"item_count": options["itemCount"]}
    if "strategy" in options:
        kwargs["strategy"] = options["strategy"]
    if "gap" in options:
        kwargs["gap"] = options["gap"]
    if "aspectRatio" in options:
        kwargs["aspect_ratio"] = options["aspectRatio"]
    if "minItemWidth" in options:
        kwargs["min_item_width"] = options["minItemWidth"]

    result = compute_container_layout(
        input_["containerWidth"], input_["containerHeight"], **kwargs
    )

    expected = case["expected"]

    # columns and rows: exact equality, per the conformance file's own
    # stated rule — these are discrete counts, not measurements.
    assert result.columns == expected["columns"], case["description"]
    assert result.rows == expected["rows"], case["description"]

    # cell_width and cell_height: relative tolerance with an absolute
    # floor, per the conformance file's own stated tolerance.
    assert _is_within_tolerance(result.cell_width, expected["cellWidth"]), case["description"]
    assert _is_within_tolerance(result.cell_height, expected["cellHeight"]), case["description"]

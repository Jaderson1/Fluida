"""Loads spec/conformance/layout-cases.json — the same shared,
language-neutral cases packages/core/src/engine/layoutConformance.test.ts
checks the TypeScript implementation against — and verifies
fluida_core produces the same results, within the same declared
tolerance. Nothing here is copied by hand from the JSON file; it's
read directly, exactly as the rules for this file require."""

import json
from pathlib import Path
from typing import Any, Dict, Optional, Union

import pytest

from fluida_core import FluidaConfigError, compute_container_layout

_CONFORMANCE_FILE_PATH = (
    Path(__file__).resolve().parents[3] / "spec" / "conformance" / "layout-cases.json"
)


def _load_conformance_file() -> Dict[str, Any]:
    with _CONFORMANCE_FILE_PATH.open(encoding="utf-8") as f:
        return json.load(f)


_CONFORMANCE_FILE = _load_conformance_file()
_TOLERANCE = _CONFORMANCE_FILE["tolerance"]
_CASES = _CONFORMANCE_FILE["cases"]
_INVALID_CASES = _CONFORMANCE_FILE["invalidCases"]


def _resolve_sentinel(value: Optional[Union[float, str]]) -> Optional[float]:
    """JSON has no representation for NaN/Infinity/-Infinity, so the
    conformance file spells them as the strings "NaN"/"Infinity"/
    "-Infinity" wherever an invalid case needs one. Any other value
    (a real number, or None) passes through unchanged."""
    if value == "NaN":
        return float("nan")
    if value == "Infinity":
        return float("inf")
    if value == "-Infinity":
        return float("-inf")
    return value


def _is_within_tolerance(actual: float, expected: float) -> bool:
    """The same relative-tolerance-with-an-absolute-floor rule the
    TypeScript conformance test uses: allows up to
    max(absoluteMinimum, |expected| * relative) of difference."""
    allowed_difference = max(
        _TOLERANCE["absoluteMinimum"], abs(expected) * _TOLERANCE["relative"]
    )
    return abs(actual - expected) <= allowed_difference


def _options_to_kwargs(options: Dict[str, Any]) -> Dict[str, Any]:
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
    return kwargs


def test_conformance_file_loads_at_least_fifteen_valid_cases():
    assert len(_CASES) >= 15


def test_conformance_file_loads_several_invalid_cases():
    assert len(_INVALID_CASES) >= 5


@pytest.mark.parametrize("case", _CASES, ids=lambda case: case["id"])
def test_conformance_case(case: Dict[str, Any]):
    input_ = case["input"]
    kwargs = _options_to_kwargs(input_["options"])

    result = compute_container_layout(
        _resolve_sentinel(input_["containerWidth"]),
        _resolve_sentinel(input_["containerHeight"]),
        **kwargs,
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


@pytest.mark.parametrize("case", _INVALID_CASES, ids=lambda case: case["id"])
def test_conformance_invalid_case(case: Dict[str, Any]):
    input_ = case["input"]
    kwargs = _options_to_kwargs(input_["options"])

    with pytest.raises(FluidaConfigError):
        compute_container_layout(
            _resolve_sentinel(input_["containerWidth"]),
            _resolve_sentinel(input_["containerHeight"]),
            **kwargs,
        )

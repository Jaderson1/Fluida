"""Validation tests — the same invalid-input conditions
FluidaConfigError is raised for in @fluida/core's TypeScript
implementation, checked in the same order."""

import math

import pytest

from fluida_core import FluidaConfigError, compute_container_layout


def test_raises_for_item_count_below_one():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(800, 600, item_count=0)


def test_raises_for_negative_item_count():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(800, 600, item_count=-3)


def test_raises_for_nan_item_count():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(800, 600, item_count=math.nan)


def test_raises_for_infinite_item_count():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(800, 600, item_count=math.inf)


def test_raises_for_negative_gap():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(800, 600, item_count=4, gap=-1)


def test_raises_for_nan_gap():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(800, 600, item_count=4, gap=math.nan)


def test_raises_for_infinite_gap():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(800, 600, item_count=4, gap=math.inf)


def test_does_not_raise_for_zero_gap():
    # gap=0 is valid — this specifically guards against a Python
    # implementation that mistakenly treats falsy-but-valid inputs
    # (0) the same as "not provided" (None).
    result = compute_container_layout(400, 100, item_count=4, gap=0, strategy="fill")
    assert result.cell_width == 100


def test_raises_for_non_positive_aspect_ratio():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(
            800, 600, item_count=4, strategy="preserve-ratio", aspect_ratio=0
        )


def test_raises_for_negative_aspect_ratio():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(
            800, 600, item_count=4, strategy="preserve-ratio", aspect_ratio=-1
        )


def test_raises_for_min_item_width_of_zero():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(800, 600, item_count=4, min_item_width=0)


def test_raises_for_negative_min_item_width():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(800, 600, item_count=4, min_item_width=-50)


def test_raises_for_nan_min_item_width():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(800, 600, item_count=4, min_item_width=math.nan)


def test_raises_for_infinite_min_item_width():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(800, 600, item_count=4, min_item_width=math.inf)


def test_fluida_config_error_is_a_value_error():
    # Documented, deliberate: catchable either specifically or as a
    # general invalid-argument error, matching Python convention.
    assert issubclass(FluidaConfigError, ValueError)

"""Behavioral tests mirroring computeContainerLayout.test.ts's own
hand-written cases (not the shared conformance file — that's covered
separately in test_conformance.py)."""

import math

import pytest
from fluida_core import FluidaConfigError, compute_container_layout


def test_defaults_match_fit_gap_16_aspect_ratio_1():
    with_defaults = compute_container_layout(800, 600, item_count=8)
    explicit = compute_container_layout(
        800, 600, item_count=8, strategy="fit", gap=16, aspect_ratio=1
    )
    assert with_defaults == explicit


def test_fit_produces_square_cells_that_fit_within_the_container():
    result = compute_container_layout(800, 600, item_count=8, strategy="fit")

    assert result.cell_width == result.cell_height

    grid_width = result.columns * result.cell_width + (result.columns - 1) * 16
    grid_height = result.rows * result.cell_height + (result.rows - 1) * 16
    assert grid_width <= 800 + 1e-9
    assert grid_height <= 600 + 1e-9


def test_fit_lays_out_enough_cells_for_every_item():
    result = compute_container_layout(800, 600, item_count=8, strategy="fit")
    assert result.columns * result.rows >= 8


def test_fill_uses_exactly_the_available_space_even_if_not_square():
    result = compute_container_layout(800, 600, item_count=8, strategy="fill")

    grid_width = result.columns * result.cell_width + (result.columns - 1) * 16
    grid_height = result.rows * result.cell_height + (result.rows - 1) * 16

    assert math.isclose(grid_width, 800, abs_tol=1e-5)
    assert math.isclose(grid_height, 600, abs_tol=1e-5)


def test_preserve_ratio_keeps_the_exact_configured_aspect_ratio():
    result = compute_container_layout(
        800, 600, item_count=6, strategy="preserve-ratio", aspect_ratio=2
    )
    assert math.isclose(result.cell_width / result.cell_height, 2, abs_tol=1e-5)


def test_balanced_sits_between_fit_and_fill():
    fit = compute_container_layout(900, 500, item_count=5, strategy="fit")
    fill = compute_container_layout(900, 500, item_count=5, strategy="fill")
    balanced = compute_container_layout(900, 500, item_count=5, strategy="balanced")

    assert not math.isclose(fill.cell_width, fill.cell_height, abs_tol=1e-2)

    assert balanced.cell_width == balanced.cell_height
    assert balanced.cell_width >= fit.cell_width - 1e-9
    assert balanced.cell_width <= max(fill.cell_width, fill.cell_height) + 1e-9


def test_chooses_the_column_count_that_minimizes_distortion():
    result = compute_container_layout(400, 100, item_count=4, strategy="fill", gap=0)

    assert result.columns == 4
    assert result.rows == 1
    assert math.isclose(result.cell_width, 100, abs_tol=1e-5)
    assert math.isclose(result.cell_height, 100, abs_tol=1e-5)


def test_returns_a_single_zero_size_column_when_not_yet_measured():
    result = compute_container_layout(0, 0, item_count=8)
    assert result.columns == 1
    assert result.rows == 8
    assert result.cell_width == 0
    assert result.cell_height == 0


def test_min_item_width_omitted_leaves_behavior_unchanged():
    without_option = compute_container_layout(400, 100, item_count=4, gap=0, strategy="fill")
    with_none = compute_container_layout(
        400, 100, item_count=4, gap=0, strategy="fill", min_item_width=None
    )
    assert without_option == with_none
    assert without_option.columns == 4
    assert without_option.cell_width == 100


def test_min_item_width_forces_fewer_columns():
    result = compute_container_layout(
        400, 100, item_count=4, gap=0, strategy="fill", min_item_width=150
    )
    assert result.columns == 2
    assert result.rows == 2
    assert result.cell_width == 200
    assert result.cell_height == 50


def test_min_item_width_accounts_for_gap():
    result = compute_container_layout(1200, 600, item_count=6, gap=16, min_item_width=280)
    assert result.columns == 4
    assert result.cell_width >= 280


def test_min_item_width_impossible_falls_back():
    result = compute_container_layout(
        400, 100, item_count=4, gap=0, min_item_width=10000
    )
    assert result.columns == 1
    assert result.rows == 4
    assert result.cell_width == 0
    assert result.cell_height == 0


def test_min_item_width_interacts_with_fit():
    result = compute_container_layout(
        400, 100, item_count=4, gap=0, strategy="fit", min_item_width=150
    )
    assert result.columns == 2
    assert result.cell_width == result.cell_height == 50


def test_min_item_width_interacts_with_preserve_ratio():
    result = compute_container_layout(
        400,
        100,
        item_count=4,
        gap=0,
        strategy="preserve-ratio",
        aspect_ratio=2,
        min_item_width=150,
    )
    assert result.columns == 2
    assert math.isclose(result.cell_width / result.cell_height, 2, abs_tol=1e-5)


def test_unrecognized_strategy_falls_back_to_fill_shaped_result_without_raising():
    # Deliberate: the TypeScript implementation's switch has no
    # runtime validation for strategy — an unrecognized value falls
    # through its default case to the same fill-shaped result. This
    # test exists specifically so that behavior isn't silently lost
    # if this Python port is ever "improved" to validate more strictly
    # than the implementation it's meant to match.
    fill_result = compute_container_layout(800, 600, item_count=8, strategy="fill")
    unrecognized_result = compute_container_layout(
        800, 600, item_count=8, strategy="not-a-real-strategy"  # type: ignore[arg-type]
    )
    assert unrecognized_result == fill_result


class TestAutoHeight:
    """container_height omitted (None)."""

    def test_fill_without_height_raises(self):
        with pytest.raises(FluidaConfigError):
            compute_container_layout(1200, None, item_count=6, strategy="fill")

    def test_balanced_without_height_raises(self):
        with pytest.raises(FluidaConfigError):
            compute_container_layout(1200, None, item_count=6, strategy="balanced")

    def test_fit_without_height_and_without_min_item_width_raises(self):
        with pytest.raises(FluidaConfigError):
            compute_container_layout(1200, None, item_count=6, strategy="fit")

    def test_preserve_ratio_without_height_and_without_min_item_width_raises(self):
        with pytest.raises(FluidaConfigError):
            compute_container_layout(
                1200, None, item_count=6, strategy="preserve-ratio", aspect_ratio=2
            )

    def test_fit_without_height_with_min_item_width(self):
        # Same columns/cell_width as the height-aware
        # min-item-width-accounts-for-gap conformance case for these
        # exact numbers — confirming the width-only path agrees with
        # the height-aware one whenever both are applicable.
        result = compute_container_layout(
            1200, None, item_count=6, gap=16, strategy="fit", min_item_width=280
        )
        assert result.columns == 4
        assert result.rows == 2
        assert result.cell_width == 288
        assert result.cell_height == result.cell_width

    def test_preserve_ratio_without_height_with_min_item_width(self):
        result = compute_container_layout(
            1200,
            None,
            item_count=6,
            gap=16,
            strategy="preserve-ratio",
            aspect_ratio=2,
            min_item_width=280,
        )
        assert result.columns == 4
        assert result.cell_width == 288
        assert result.cell_height == 144
        assert math.isclose(result.cell_width / result.cell_height, 2, abs_tol=1e-10)

    def test_never_exceeds_item_count(self):
        result = compute_container_layout(
            2000, None, item_count=3, gap=16, strategy="fit", min_item_width=100
        )
        assert result.columns == 3
        assert result.rows == 1

    def test_accepts_cell_width_exactly_equal_to_min_item_width(self):
        # 1000 / 5 columns, gap 0 = exactly 200 per cell, no remainder.
        result = compute_container_layout(
            1000, None, item_count=5, gap=0, strategy="fit", min_item_width=200
        )
        assert result.columns == 5
        assert result.cell_width == 200

    def test_drops_one_column_just_below_the_threshold(self):
        result = compute_container_layout(
            999, None, item_count=5, gap=0, strategy="fit", min_item_width=200
        )
        assert result.columns == 4
        assert math.isclose(result.cell_width, 249.75, abs_tol=1e-5)

    def test_still_validates_item_count(self):
        with pytest.raises(FluidaConfigError):
            compute_container_layout(
                1200, None, item_count=0, strategy="fit", min_item_width=280
            )

    def test_large_gap(self):
        result = compute_container_layout(
            1200, None, item_count=4, gap=200, strategy="fit", min_item_width=100
        )
        assert result.columns == 4
        assert result.cell_width == 150
        assert result.cell_height == 150

    def test_still_validates_aspect_ratio(self):
        with pytest.raises(FluidaConfigError):
            compute_container_layout(
                1200,
                None,
                item_count=6,
                strategy="preserve-ratio",
                aspect_ratio=0,
                min_item_width=100,
            )

    def test_falls_back_when_min_item_width_impossible_at_this_width(self):
        result = compute_container_layout(
            100, None, item_count=4, gap=16, strategy="fit", min_item_width=10000
        )
        assert result.columns == 1
        assert result.rows == 4
        assert result.cell_width == 0
        assert result.cell_height == 0

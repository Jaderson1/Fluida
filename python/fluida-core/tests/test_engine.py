"""Behavioral tests mirroring computeContainerLayout.test.ts's own
hand-written cases (not the shared conformance file — that's covered
separately in test_conformance.py)."""

import math
import random

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


def _assert_within_bounds(result, container_width, container_height, gap):
    total_grid_width = result.columns * result.cell_width + (result.columns - 1) * gap
    total_grid_height = result.rows * result.cell_height + (result.rows - 1) * gap
    tolerance = 1e-9

    assert isinstance(result.columns, int) and result.columns > 0
    assert isinstance(result.rows, int) and result.rows > 0
    assert total_grid_width <= container_width + tolerance
    assert total_grid_height <= container_height + tolerance
    assert math.isfinite(result.cell_width) and result.cell_width >= 0
    assert math.isfinite(result.cell_height) and result.cell_height >= 0


def test_balanced_wide_short_container_hand_computed():
    result = compute_container_layout(1000, 100, item_count=3, strategy="balanced", gap=0)
    assert result.columns == 3
    assert math.isclose(result.cell_width, 182.574, abs_tol=1e-3)
    assert result.cell_height == 100
    _assert_within_bounds(result, 1000, 100, 0)


def test_balanced_narrow_tall_container_hand_computed():
    result = compute_container_layout(100, 1000, item_count=3, strategy="balanced", gap=0)
    assert result.columns == 1
    assert result.cell_width == 100
    assert math.isclose(result.cell_height, 182.574, abs_tol=1e-3)
    _assert_within_bounds(result, 100, 1000, 0)


def test_balanced_square_container_needs_no_correction():
    balanced = compute_container_layout(600, 600, item_count=4, strategy="balanced", gap=0)
    fit = compute_container_layout(600, 600, item_count=4, strategy="fit", gap=0)
    fill = compute_container_layout(600, 600, item_count=4, strategy="fill", gap=0)
    assert balanced.cell_width == 300
    assert balanced.cell_height == 300
    assert balanced == fit
    assert balanced == fill


def test_balanced_between_fit_and_fill_on_the_distorted_axis():
    fit = compute_container_layout(900, 500, item_count=5, strategy="fit")
    fill = compute_container_layout(900, 500, item_count=5, strategy="fill")
    balanced = compute_container_layout(900, 500, item_count=5, strategy="balanced")

    assert fill.cell_width == fit.cell_width
    assert fill.cell_height > fit.cell_height

    assert balanced.cell_width == fit.cell_width
    assert balanced.cell_height > fit.cell_height
    assert balanced.cell_height < fill.cell_height
    _assert_within_bounds(balanced, 900, 500, 16)


def test_balanced_matches_typescript_column_count():
    result = compute_container_layout(900, 500, item_count=5, strategy="balanced", gap=16)
    assert result.columns == 4
    assert result.rows == 2


@pytest.mark.parametrize(
    "width,height,count,gap",
    [
        (40, 25, 3, 2),
        (1920, 250, 7, 8),
        (777, 333, 7, 10),
        (500, 300, 6, 0),
        (500, 300, 6, 60),
        (300, 900, 1, 16),
    ],
)
def test_balanced_never_exceeds_bounds(width, height, count, gap):
    result = compute_container_layout(width, height, item_count=count, strategy="balanced", gap=gap)
    _assert_within_bounds(result, width, height, gap)


def test_balanced_respects_min_item_width_as_column_filter_like_fit():
    fit = compute_container_layout(1200, 300, item_count=6, strategy="fit", gap=16, min_item_width=280)
    result = compute_container_layout(
        1200, 300, item_count=6, strategy="balanced", gap=16, min_item_width=280
    )
    assert result.columns == fit.columns
    assert result.cell_height == fit.cell_height
    _assert_within_bounds(result, 1200, 300, 16)


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


def test_unrecognized_strategy_raises_instead_of_falling_back_to_fill():
    with pytest.raises(FluidaConfigError):
        compute_container_layout(800, 600, item_count=8, strategy="not-a-real-strategy")  # type: ignore[arg-type]


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


class TestItemCountContract:
    def test_accepts_1_as_smallest_valid_value(self):
        compute_container_layout(500, 500, item_count=1)

    def test_accepts_a_larger_integer(self):
        compute_container_layout(500, 500, item_count=50)

    def test_accepts_a_whole_valued_float(self):
        compute_container_layout(500, 500, item_count=4.0)

    @pytest.mark.parametrize(
        "value",
        [0, -1, 1.5, float("nan"), float("inf"), float("-inf"), "4", None, True, False],
    )
    def test_rejects_invalid_values(self, value):
        with pytest.raises(FluidaConfigError):
            compute_container_layout(500, 500, item_count=value)

    def test_always_returns_integer_rows_and_columns(self):
        result = compute_container_layout(500, 500, item_count=7)
        assert isinstance(result.columns, int)
        assert isinstance(result.rows, int)


class TestDimensionValidation:
    def test_accepts_0_as_container_width(self):
        compute_container_layout(0, 500, item_count=4)

    @pytest.mark.parametrize("value", [float("nan"), float("inf"), float("-inf"), -1, True])
    def test_rejects_invalid_container_width(self, value):
        with pytest.raises(FluidaConfigError):
            compute_container_layout(value, 500, item_count=4)

    @pytest.mark.parametrize("value", [float("nan"), float("inf"), float("-inf"), -1, True])
    def test_rejects_invalid_container_height_when_provided(self, value):
        with pytest.raises(FluidaConfigError):
            compute_container_layout(500, value, item_count=4)

    def test_still_allows_container_height_none_for_auto_height(self):
        compute_container_layout(500, None, item_count=4, strategy="fit", min_item_width=100)


class TestStrategyValidation:
    @pytest.mark.parametrize("strategy", ["fill", "fit", "balanced", "preserve-ratio"])
    def test_accepts_known_strategies(self, strategy):
        compute_container_layout(500, 500, item_count=4, strategy=strategy)

    def test_rejects_unrecognized_strategy(self):
        with pytest.raises(FluidaConfigError):
            compute_container_layout(500, 500, item_count=4, strategy="not-a-real-strategy")


# A fixed seed, not a fresh one per run: reproducibility matters as
# much as variety for property-based coverage — a failure here needs
# to be the same failure for anyone who runs this file, not a flake
# that only sometimes reproduces.
_SEED = 20260804
_CASE_COUNT = 200


def _random_cases():
    rng = random.Random(_SEED)
    for _ in range(_CASE_COUNT):
        yield {
            "container_width": 10 + rng.random() * 3990,
            "container_height": 10 + rng.random() * 3990,
            "item_count": rng.randint(1, 60),
            "gap": rng.random() * 100,
        }


@pytest.mark.parametrize("case", list(_random_cases()))
def test_balanced_property_stays_within_bounds_and_never_exceeds_fill(case):
    balanced = compute_container_layout(
        case["container_width"],
        case["container_height"],
        item_count=case["item_count"],
        strategy="balanced",
        gap=case["gap"],
    )
    fill = compute_container_layout(
        case["container_width"],
        case["container_height"],
        item_count=case["item_count"],
        strategy="fill",
        gap=case["gap"],
    )

    assert math.isfinite(balanced.cell_width)
    assert math.isfinite(balanced.cell_height)
    assert isinstance(balanced.rows, int)
    assert isinstance(balanced.columns, int)
    assert balanced.rows > 0
    assert balanced.columns > 0
    assert balanced.rows * balanced.columns >= case["item_count"]

    tolerance = 1e-6
    total_grid_width = balanced.columns * balanced.cell_width + (balanced.columns - 1) * case["gap"]
    total_grid_height = balanced.rows * balanced.cell_height + (balanced.rows - 1) * case["gap"]

    if balanced.cell_width > 0:
        assert total_grid_width <= case["container_width"] + tolerance
        assert balanced.cell_width <= fill.cell_width + tolerance
    if balanced.cell_height > 0:
        assert total_grid_height <= case["container_height"] + tolerance
        assert balanced.cell_height <= fill.cell_height + tolerance

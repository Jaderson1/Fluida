"""Tests for the FluidaGrid Python wrapper — the declarative side
only. There is no browser here, so ResizeObserver/requestAnimationFrame
behavior itself is not exercised by these tests; that logic is a
direct port of the same pattern already tested in
@fluida/react's useFluidaContainerSize.test.tsx, not reimplemented or
retested here."""

from pathlib import Path

import pytest
from dash_fluida import FluidaGrid


def test_requires_item_count():
    with pytest.raises(TypeError):
        FluidaGrid(children=["a"])


def test_constructs_with_item_count():
    grid = FluidaGrid(item_count=6)
    assert grid.item_count == 6


def test_children_are_preserved():
    grid = FluidaGrid(item_count=2, children=["a", "b"])
    assert grid.children == ["a", "b"]


def test_style_is_preserved():
    style = {"border": "1px solid red"}
    grid = FluidaGrid(item_count=2, style=style)
    assert grid.style == style


def test_class_name_is_preserved():
    grid = FluidaGrid(item_count=2, className="my-grid")
    assert grid.className == "my-grid"


def test_defaults_are_not_forced_into_props_when_omitted():
    # Component.to_plotly_json only includes props that were actually
    # set (via hasattr) — strategy/gap/aspect_ratio default on the
    # frontend side, not here, so an omitted strategy should not
    # appear in the serialized props at all.
    grid = FluidaGrid(item_count=6)
    serialized = grid.to_plotly_json()
    assert "strategy" not in serialized["props"]
    assert serialized["props"]["item_count"] == 6


def test_explicit_options_are_preserved():
    grid = FluidaGrid(
        item_count=6,
        gap=16,
        min_item_width=280,
        strategy="fill",
        aspect_ratio=1.5,
        notify_layout_changes=True,
    )
    serialized = grid.to_plotly_json()
    assert serialized["props"]["gap"] == 16
    assert serialized["props"]["min_item_width"] == 280
    assert serialized["props"]["strategy"] == "fill"
    assert serialized["props"]["aspect_ratio"] == 1.5
    assert serialized["props"]["notify_layout_changes"] is True


def test_notify_layout_changes_defaults_to_absent_not_true():
    grid = FluidaGrid(item_count=6)
    serialized = grid.to_plotly_json()
    assert "notify_layout_changes" not in serialized["props"]


def test_rejects_unknown_prop():
    with pytest.raises(TypeError):
        FluidaGrid(item_count=6, not_a_real_prop=True)  # type: ignore[call-arg]


def test_serializes_with_correct_namespace_and_type():
    grid = FluidaGrid(item_count=6)
    serialized = grid.to_plotly_json()
    assert serialized["namespace"] == "dash_fluida"
    assert serialized["type"] == "FluidaGrid"


def test_js_dist_points_at_a_real_bundled_file():
    assert len(FluidaGrid._js_dist) >= 1
    main_entry = FluidaGrid._js_dist[0]
    assert main_entry["relative_package_path"] == "dash_fluida.min.js"

    package_dir = Path(__file__).resolve().parent.parent / "src" / "dash_fluida"
    bundle_path = package_dir / main_entry["relative_package_path"]
    assert bundle_path.exists(), (
        f"{bundle_path} does not exist — run "
        "`pnpm --filter dash-fluida-frontend run build` first."
    )
    assert bundle_path.stat().st_size > 0


def test_bundle_contains_the_real_core_algorithm_not_a_reimplementation():
    # A distinctive, exact string from @fluida/core's own error
    # messages — present only if the real computeContainerLayout was
    # bundled in, not reimplemented in the frontend.
    package_dir = Path(__file__).resolve().parent.parent / "src" / "dash_fluida"
    bundle_path = package_dir / "dash_fluida.min.js"
    contents = bundle_path.read_text(encoding="utf-8")
    assert "Fluida container layout: itemCount must be a finite number" in contents


def test_bundle_does_not_include_a_bundled_react():
    # React/PropTypes are meant to come from window.React/window.PropTypes
    # (provided by dash-renderer), not be bundled — a bundled React
    # alone is on the order of 100KB+, so a small bundle size is a
    # reasonable proxy confirming externalization worked.
    package_dir = Path(__file__).resolve().parent.parent / "src" / "dash_fluida"
    bundle_path = package_dir / "dash_fluida.min.js"
    assert bundle_path.stat().st_size < 20_000


def test_auto_height_is_a_recognized_prop():
    grid = FluidaGrid(item_count=4, strategy="fit", min_item_width=200, auto_height=True)
    assert grid.auto_height is True


def test_auto_height_defaults_to_absent_not_true():
    grid = FluidaGrid(item_count=4)
    serialized = grid.to_plotly_json()
    assert "auto_height" not in serialized["props"]


def test_auto_height_reaches_serialized_props():
    grid = FluidaGrid(item_count=4, strategy="fit", min_item_width=200, auto_height=True)
    serialized = grid.to_plotly_json()
    assert serialized["props"]["auto_height"] is True
    assert serialized["props"]["min_item_width"] == 200
    assert serialized["props"]["strategy"] == "fit"


def test_bundle_contains_the_auto_height_handling():
    # Confirms the compiled frontend bundle actually contains the
    # auto-height code path — not just that the Python side accepts
    # the prop. Looks for the exact Core error message that only
    # exists inside the auto-height branch of computeContainerLayout,
    # proving it was bundled in, not left out.
    package_dir = Path(__file__).resolve().parent.parent / "src" / "dash_fluida"
    bundle_path = package_dir / "dash_fluida.min.js"
    contents = bundle_path.read_text(encoding="utf-8")
    assert "requires a known containerHeight" in contents

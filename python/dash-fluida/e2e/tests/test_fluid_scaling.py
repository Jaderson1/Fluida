"""Regression coverage for the 4K/TV visual fix: text, spacing, and
the grid's own vertical footprint were all frozen at whatever they
computed to around 1440px width, regardless of how much wider the
actual viewport got beyond that. Checks real computed values at
specific viewports, not just "no error" — a font-size clamp() that
silently stopped working would still render without throwing.

Same environment limitation as test_visual_layout.py: real Chromium
is not available here (network egress to Playwright's browser CDN is
blocked in this environment) — this file is syntax- and collection-
validated, not executed against a real browser. See REVIEW_NOTES.md.
"""

import os

import pytest

playwright_sync_api = pytest.importorskip("playwright.sync_api")
from playwright.sync_api import Page  # noqa: E402

pytestmark = pytest.mark.skipif(
    os.environ.get("FLUIDA_E2E_BROWSERS_AVAILABLE") != "1",
    reason=(
        "Requires real Chromium, installed via 'playwright install chromium'. "
        "Not available in this development environment — runs in the "
        "'dash-e2e' CI job. See REVIEW_NOTES.md."
    ),
)


def _computed_font_size_px(page: Page, selector: str) -> float:
    value = page.eval_on_selector(selector, "el => getComputedStyle(el).fontSize")
    return float(value.replace("px", ""))


def test_heading_font_size_grows_between_1920_and_3840(page: Page, demo_app_url):
    """The concrete symptom reported: header h1's font-size (and every
    other fluid token) was identical at any width past ~1440px —
    1920x1080 and 3840x2160 rendered text at exactly the same size.
    """
    page.set_viewport_size({"width": 1920, "height": 1080})
    page.goto(demo_app_url)
    page.wait_for_selector("header h1")
    size_at_1920 = _computed_font_size_px(page, "header h1")

    page.set_viewport_size({"width": 3840, "height": 2160})
    page.reload()
    page.wait_for_selector("header h1")
    size_at_3840 = _computed_font_size_px(page, "header h1")

    assert size_at_3840 > size_at_1920, (
        f"header h1 font-size did not grow from 1920px ({size_at_1920}px) to "
        f"3840px ({size_at_3840}px) — the fluid clamp() may not be applied."
    )
    # Grows, but stays within the documented cap (2.75rem = 44px at the
    # default 16px root) — not "just make it huge".
    assert size_at_3840 <= 44 + 1, f"header h1 font-size ({size_at_3840}px) exceeds its documented cap"


def test_body_text_does_not_shrink_below_its_original_size_at_any_width(page: Page, demo_app_url):
    """header p had no explicit font-size before this fix — it
    inherited the browser's 16px default. The fluid token replacing
    that must not render smaller than 16px at any width; this is the
    regression this test exists specifically to catch.
    """
    for width, height in [(390, 844), (768, 1024), (1920, 1080), (3840, 2160)]:
        page.set_viewport_size({"width": width, "height": height})
        page.goto(demo_app_url)
        page.wait_for_selector("header p")
        size = _computed_font_size_px(page, "header p")
        assert size >= 16 - 0.5, f"at {width}x{height}, header p font-size ({size}px) is below its 16px floor"


def test_no_disproportionate_empty_space_at_3840x2160(page: Page, demo_app_url):
    """documentElement.scrollHeight should not vastly exceed what the
    actual rendered content occupies — a regression of the
    unconstrained 1fr row this fix caps would show up here as a huge
    gap between the last real content and the bottom of the page.
    """
    page.set_viewport_size({"width": 3840, "height": 2160})
    page.goto(demo_app_url)
    page.wait_for_selector(".panel")

    last_panel_bottom = page.eval_on_selector_all(
        ".panel", "els => Math.max(...els.map(el => el.getBoundingClientRect().bottom))"
    )
    document_scroll_height = page.evaluate("document.documentElement.scrollHeight")

    trailing_gap = document_scroll_height - last_panel_bottom
    # Some bottom margin/padding is expected and fine; a gap anywhere
    # near the height of an extra viewport is the bug this replaces.
    assert trailing_gap < 400, (
        f"{trailing_gap}px of empty space below the last panel at 3840x2160 — "
        "the capped grid-template-rows may not be applied"
    )

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


def _wait_for_layout_to_settle(page: Page, timeout_ms: int = 5000) -> None:
    """Polls document.documentElement.scrollHeight until it stops
    changing, instead of a flat sleep. Chart content resizes
    asynchronously (Plotly's own ResizeObserver, plus the
    clientside_callback that explicitly re-triggers it once
    FluidaGrid's real layout is known — see demo/app.py) — measuring
    scrollHeight before that settles would catch a real, transient
    in-between state, not the bug this test exists to catch. This
    waits for the actual condition ("the page stopped changing size"),
    not an arbitrary duration.
    """
    page.wait_for_function(
        """
        () => {
            if (window.__fluidaLastScrollHeight === undefined) {
                window.__fluidaLastScrollHeight = document.documentElement.scrollHeight;
                window.__fluidaStableCount = 0;
                return false;
            }
            const current = document.documentElement.scrollHeight;
            if (current === window.__fluidaLastScrollHeight) {
                window.__fluidaStableCount = (window.__fluidaStableCount || 0) + 1;
            } else {
                window.__fluidaStableCount = 0;
            }
            window.__fluidaLastScrollHeight = current;
            // Stable across 5 consecutive animation-frame-ish polls,
            // not just one — one matching read could be a coincidence
            // mid-transition, not settled.
            return window.__fluidaStableCount >= 5;
        }
        """,
        timeout=timeout_ms,
    )


def _find_deepest_bottom_element(page: Page) -> dict:
    """Diagnostic, not an assertion: walks every element in the
    document and reports whichever one has the largest
    getBoundingClientRect().bottom — the direct answer to "which
    element determines documentElement.scrollHeight" for whoever reads
    a failure's diagnostic JSON, rather than leaving that to be
    re-derived by hand from a screenshot.
    """
    return page.evaluate(
        """
        () => {
            let deepest = null;
            let maxBottom = -Infinity;
            for (const el of document.querySelectorAll('*')) {
                const rect = el.getBoundingClientRect();
                if (rect.bottom > maxBottom && (rect.width > 0 || rect.height > 0)) {
                    maxBottom = rect.bottom;
                    deepest = {
                        tag: el.tagName,
                        id: el.id || null,
                        className: typeof el.className === 'string' ? el.className : null,
                        bottom: rect.bottom,
                        top: rect.top,
                        height: rect.height,
                        computedHeight: getComputedStyle(el).height,
                        computedPosition: getComputedStyle(el).position,
                        computedOverflow: getComputedStyle(el).overflow,
                    };
                }
            }
            return deepest;
        }
        """
    )


def test_no_artificial_document_overflow_at_3840x2160(page: Page, demo_app_url, diagnostics_dir):
    """Detect scrollable area not explained by the viewport or real content.

    The previous metric, ``scrollHeight - last_panel_bottom``, treated
    ordinary unfilled space inside a tall viewport as overflow. Root
    ``scrollHeight`` is never smaller than the viewport, so a short page
    at 3840x2160 naturally produced a large positive value even when no
    element extended the document.

    The correct comparison is against the greater of:
    - the viewport height; and
    - the deepest rendered element's bottom edge.

    Any meaningful excess beyond that value is genuine artificial
    document overflow.
    """
    page.set_viewport_size({"width": 3840, "height": 2160})
    page.goto(demo_app_url)
    page.wait_for_selector(".panel")
    page.wait_for_selector(".js-plotly-plot svg.main-svg")
    _wait_for_layout_to_settle(page)

    viewport_height = page.evaluate("window.innerHeight")
    deepest = _find_deepest_bottom_element(page)
    document_scroll_height = page.evaluate("document.documentElement.scrollHeight")

    expected_minimum = max(viewport_height, deepest["bottom"])
    artificial_overflow = document_scroll_height - expected_minimum

    if artificial_overflow >= 100:
        import json

        diagnostic = {
            "viewportHeight": viewport_height,
            "documentScrollHeight": document_scroll_height,
            "deepestElement": deepest,
            "expectedMinimum": expected_minimum,
            "artificialOverflow": artificial_overflow,
        }
        (diagnostics_dir / "artificial-overflow.json").write_text(
            json.dumps(diagnostic, indent=2),
            encoding="utf-8",
        )
        page.screenshot(
            path=str(diagnostics_dir / "artificial-overflow-3840x2160.png"),
            full_page=True,
        )

    assert artificial_overflow < 100, (
        f"scrollHeight ({document_scroll_height}px) exceeds both the viewport "
        f"({viewport_height}px) and the deepest rendered content "
        f"({deepest['bottom']}px) by {artificial_overflow}px. "
        "See artificial-overflow.json for diagnostics."
    )

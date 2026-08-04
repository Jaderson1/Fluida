"""Shared diagnostic instrumentation for the two E2E fixture apps
(plain_app.py, plotly_app.py). Both apps use the same grid id, same
item count, same dimensions, and this same instrumentation — the only
difference between them is what's inside each card — specifically so
a Playwright test can attribute any difference in the collected
snapshot to the card content, not to anything else varying between
the two apps.
"""

from dash import Input, Output, clientside_callback, html

GRID_ID = "e2e-grid"
DEBUG_JSON_ID = "e2e-debug-json"

# Collects every metric the E2E tests need in one JS call, so a test
# gets one consistent, single-frame snapshot instead of assembling it
# from several separate page.evaluate() calls that could each observe
# a slightly different moment.
#
# Placed in index_string, not as a component in the Dash layout: Dash
# renders its layout through React, which does not execute a <script>
# tag inserted as a component the way a browser executes one parsed
# from raw HTML. index_string's %%app_entry%%/%%config%%/%%scripts%%
# placeholders sit outside that React tree, in the actual served HTML
# shell, so a <script> placed there runs the normal way.
_SNAPSHOT_SCRIPT = """
<script>
window.fluidaDebugSnapshot = function fluidaDebugSnapshot() {
  const grid = document.getElementById("%s");
  const rectOf = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  };
  const computedOf = (el) => {
    if (!el) return null;
    const s = window.getComputedStyle(el);
    return {
      transform: s.transform,
      position: s.position,
      width: s.width,
      maxWidth: s.maxWidth,
      overflow: s.overflow,
      boxSizing: s.boxSizing,
      margin: s.margin,
    };
  };

  const items = grid ? Array.from(grid.children).map((child) => ({
    rect: rectOf(child),
    computed: computedOf(child),
  })) : [];

  const plotlyGraphs = grid ? Array.from(grid.querySelectorAll(".js-plotly-plot")).map((plotEl) => {
    const svg = plotEl.querySelector("svg.main-svg");
    const canvas = plotEl.querySelector("canvas");
    return {
      container: rectOf(plotEl),
      svg: rectOf(svg),
      canvas: rectOf(canvas),
    };
  }) : [];

  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    documentScroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    bodyScroll: { width: document.body.scrollWidth, height: document.body.scrollHeight },
    gridWrapper: { rect: rectOf(grid), computed: computedOf(grid) },
    items: items,
    plotlyGraphs: plotlyGraphs,
  };
};
</script>
""" % GRID_ID


def index_string_with_instrumentation() -> str:
    return (
        """
<!DOCTYPE html>
<html>
    <head>
        {%metas%}
        <title>{%title%}</title>
        {%favicon%}
        {%css%}
    </head>
    <body>
        {%app_entry%}
        <footer>
            {%config%}
            {%scripts%}
            {%renderer%}
        </footer>
"""
        + _SNAPSHOT_SCRIPT
        + """
    </body>
</html>
"""
    )


def debug_json_element() -> html.Pre:
    # Hidden via visibility, not display:none — Plotly's own
    # ResizeObserver-based sizing (confirmed by reading the installed
    # plotly.js) treats a display:none ancestor as zero size, which
    # would make this element's own presence a confound for the very
    # thing being measured.
    return html.Pre(
        id=DEBUG_JSON_ID,
        style={"position": "absolute", "visibility": "hidden", "top": 0, "left": 0},
    )


def register_debug_callback(app, grid_id: str = GRID_ID, debug_json_id: str = DEBUG_JSON_ID) -> None:
    """Mirrors FluidaGrid's notify_layout_changes output (columns, rows,
    cellWidth, cellHeight) into a plain text element as JSON, so a
    Playwright test can read the actual computed layout Python/Dash
    received — not just what the DOM happens to look like — via a
    single, ordinary text read.
    """
    clientside_callback(
        """
        function(columns, rows, cellWidth, cellHeight) {
            return JSON.stringify({columns: columns, rows: rows, cellWidth: cellWidth, cellHeight: cellHeight});
        }
        """,
        Output(debug_json_id, "children"),
        Input(grid_id, "columns"),
        Input(grid_id, "rows"),
        Input(grid_id, "cellWidth"),
        Input(grid_id, "cellHeight"),
    )

"""Dash demo for FluidaGrid.

Cannot be visually verified from this environment — there is no
browser here. This confirms the app object builds, the layout
serializes without error, and every dcc.Graph is configured the way
this file claims — it does not confirm anything about how it actually
looks, resizes, or feels to touch once opened in a real browser.

Root cause of the "tiny green dots" and "charts too short" bugs from
the recorded video, found with real numbers before writing this file:
FluidaGrid's own container div has an internal minHeight: 200px floor
(unrelated to this demo — it's inside FluidaGrid.tsx itself, not
touched here) and no ceiling. Wherever this demo's CSS didn't give
that div an explicit height, the *height it measured itself* came from
that 200px floor divided across however many rows min_item_width (or
preserve-ratio) forced — 8 items forced into 1 column by
min_item_width, split across 200px, left ~11px per row; strategy="fit"
then takes min(cellWidth, cellHeight), producing an ~11px square lost
inside a much wider column. The same mechanism, with preserve-ratio
instead of fit, is what capped the charts section at exactly 200px
tall once it settled at a single row.

The fix applied here is the same for both sections: give FluidaGrid's
own container an explicit CSS aspect-ratio, tiered by viewport width so
it stays proportctionate to how many rows are actually expected at
that width (a container about to hold 4 items in 1 column needs to be
much taller, relative to its width, than one about to hold them in 4
columns) — computed as a genuine function of measured width, not left
to emerge from the 200px floor. min_item_width is also now set on the
charts grid itself (it wasn't before), specifically so column count
drops on narrower screens instead of always trying for 4 across.
Every one of these numbers was computed with the real
computeContainerLayout before being written here — see the values in
the PR/commit description, not reproduced as comments in every
function to keep this docstring from becoming unreadable itself.
"""

import plotly.graph_objects as go
from dash import Dash, dcc, html
from dash_fluida import FluidaGrid

# --- min_item_width comparison ---
COMPARE_ITEM_COUNT = 6
COMPARE_GAP = 16
COMPARE_MIN_ITEM_WIDTH = 150

# --- responsive charts ---
CHART_ITEM_COUNT = 4
CHART_GAP = 16
CHART_ASPECT_RATIO = 16 / 9
CHART_MIN_ITEM_WIDTH = 300

CHART_MARGIN = {"l": 36, "r": 16, "t": 16, "b": 32}
GRAPH_CONFIG = {"displayModeBar": False}


def _bar_figure() -> go.Figure:
    categories = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    values = [12, 19, 14, 22, 18, 9, 15]
    fig = go.Figure(go.Bar(x=categories, y=values, marker_color="#3b4ccf"))
    fig.update_layout(margin=CHART_MARGIN, autosize=True)
    return fig


def _line_figure() -> go.Figure:
    x = list(range(12))
    y = [4, 6, 5, 8, 11, 10, 13, 15, 14, 17, 19, 18]
    fig = go.Figure(go.Scatter(x=x, y=y, mode="lines", line={"color": "#2e933c", "width": 3}))
    fig.update_layout(margin=CHART_MARGIN, autosize=True)
    return fig


def _scatter_figure() -> go.Figure:
    x = [1, 2, 2.5, 3, 4, 4.2, 5, 6, 6.5, 7, 8, 9]
    y = [3, 4, 2.5, 5, 4, 6, 7, 6.5, 8, 7.5, 9, 8.5]
    fig = go.Figure(go.Scatter(x=x, y=y, mode="markers", marker={"color": "#c2410c", "size": 10}))
    fig.update_layout(margin=CHART_MARGIN, autosize=True)
    return fig


def _donut_figure() -> go.Figure:
    labels = ["Backend", "Frontend", "DevOps", "Docs"]
    values = [40, 28, 20, 12]
    fig = go.Figure(go.Pie(labels=labels, values=values, hole=0.55,
                           marker={"colors": ["#3b4ccf", "#2e933c", "#c2410c", "#7a5c00"]}))
    fig.update_layout(margin=CHART_MARGIN, autosize=True, legend={"orientation": "h", "y": -0.15})
    return fig


def _chart_card(chart_id: str, title: str, figure: go.Figure):
    return html.Div(
        className="chart-card",
        children=[
            html.Span(title, className="chart-card-title"),
            html.Div(
                dcc.Graph(
                    id=chart_id,
                    figure=figure,
                    responsive=True,
                    config=GRAPH_CONFIG,
                    style={"width": "100%", "height": "100%"},
                ),
                className="chart-card-body",
            ),
        ],
    )


def _cards(prefix: str, count: int):
    return [html.Div(f"{prefix} {i + 1}", className="cell") for i in range(count)]


app = Dash(__name__)

app.layout = html.Div(
    className="dash-shell",
    children=[
        html.Header(children=[
            html.H1("Fluida — Dash demo"),
            html.P("Resize the window. Every grid below measures its own container and recomputes its own layout."),
        ]),
        html.Section(className="panel grid-section", children=[
            html.H2("min_item_width — with vs. without"),
            html.P(
                f"6 items, same container. Right grid never lets a cell go below "
                f"{COMPARE_MIN_ITEM_WIDTH}px — fewer columns whenever that would matter, "
                "same column count as the left grid once the container is wide enough that "
                "it wouldn't.",
                className="panel-note",
            ),
            html.Div(className="compare-row", children=[
                html.Div(className="compare-column", children=[
                    html.H3("No min_item_width"),
                    FluidaGrid(
                        id="grid-unconstrained",
                        item_count=COMPARE_ITEM_COUNT,
                        gap=COMPARE_GAP,
                        strategy="fill",
                        className="grid compare-grid",
                        children=_cards("A", COMPARE_ITEM_COUNT),
                    ),
                ]),
                html.Div(className="compare-column", children=[
                    html.H3(f"min_item_width={COMPARE_MIN_ITEM_WIDTH}"),
                    FluidaGrid(
                        id="grid-constrained",
                        item_count=COMPARE_ITEM_COUNT,
                        gap=COMPARE_GAP,
                        strategy="fill",
                        min_item_width=COMPARE_MIN_ITEM_WIDTH,
                        className="grid compare-grid",
                        children=_cards("B", COMPARE_ITEM_COUNT),
                    ),
                ]),
            ]),
        ]),
        html.Section(className="panel grid-section charts-section", children=[
            html.H2("Responsive charts"),
            html.P(
                "4 real Plotly charts, one FluidaGrid, strategy \"preserve-ratio\" at 16:9, "
                f"min_item_width={CHART_MIN_ITEM_WIDTH} — fewer columns on narrower screens, "
                "every card's height computed from its real width, never a fixed pixel value.",
                className="panel-note",
            ),
            FluidaGrid(
                id="grid-charts",
                item_count=CHART_ITEM_COUNT,
                gap=CHART_GAP,
                strategy="preserve-ratio",
                aspect_ratio=CHART_ASPECT_RATIO,
                min_item_width=CHART_MIN_ITEM_WIDTH,
                className="grid charts-grid",
                children=[
                    _chart_card("chart-bar", "Bar", _bar_figure()),
                    _chart_card("chart-line", "Line", _line_figure()),
                    _chart_card("chart-scatter", "Scatter", _scatter_figure()),
                    _chart_card("chart-donut", "Donut", _donut_figure()),
                ],
            ),
        ]),
    ],
)

if __name__ == "__main__":
    app.run(debug=True)
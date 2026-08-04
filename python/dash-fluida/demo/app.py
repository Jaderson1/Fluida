"""Dash demo for FluidaGrid.

Two sections: a min_item_width comparison (strategy="fit"), and four
real Plotly charts laid out with strategy="preserve-ratio". Both use
auto_height=True, so every card's height comes from @fluida/core
itself — computed from the real measured width, gap, and strategy,
never a fixed pixel value or a CSS aspect-ratio guess.
"""

import plotly.graph_objects as go
from dash import Dash, Input, Output, dcc, html
from dash_fluida import FluidaGrid

# --- min_item_width comparison ---
COMPARE_ITEM_COUNT = 6
COMPARE_GAP = 16
# auto_height + "fit" always needs *some* min_item_width to have a
# basis for choosing a column count. 1px is small enough to never be
# the reason a column is rejected — it's still technically a
# constraint, hence the label below, not "no min_item_width".
COMPARE_MINIMAL_MIN_ITEM_WIDTH = 1
COMPARE_MIN_ITEM_WIDTH = 150

# --- responsive charts ---
CHART_ITEM_COUNT = 4
CHART_GAP = 16
# 4:3, not 16:9: at this demo's own 300px min_item_width, 16:9 gives
# only ~169px of cell height; after the title bar and Plotly's own
# margins, too little is left for axis ticks and the donut's legend.
# 4:3 gives ~225px instead, for the same width floor.
CHART_ASPECT_RATIO = 4 / 3
CHART_MIN_ITEM_WIDTH = 300


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
                    config={"displayModeBar": False},
                    style={"width": "100%", "height": "100%"},
                ),
                className="chart-card-body",
            ),
        ],
    )


def _bar_figure() -> go.Figure:
    categories = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    values = [12, 19, 14, 22, 18, 9, 15]
    fig = go.Figure(go.Bar(x=categories, y=values, marker_color="#3b4ccf"))
    fig.update_layout(margin={"l": 36, "r": 16, "t": 12, "b": 32}, autosize=True)
    return fig


def _line_figure() -> go.Figure:
    x = list(range(12))
    y = [4, 6, 5, 8, 11, 10, 13, 15, 14, 17, 19, 18]
    # width=3, not Plotly's default 2 — thin lines are the first thing
    # to become illegible once the card gets small.
    fig = go.Figure(go.Scatter(x=x, y=y, mode="lines", line={"color": "#2e933c", "width": 3}))
    fig.update_layout(margin={"l": 36, "r": 16, "t": 12, "b": 28}, autosize=True)
    return fig


def _scatter_figure() -> go.Figure:
    x = [1, 2, 2.5, 3, 4, 4.2, 5, 6, 6.5, 7, 8, 9]
    y = [3, 4, 2.5, 5, 4, 6, 7, 6.5, 8, 7.5, 9, 8.5]
    fig = go.Figure(
        go.Scatter(x=x, y=y, mode="markers", marker={"color": "#c2410c", "size": 9}),
    )
    fig.update_layout(margin={"l": 36, "r": 16, "t": 12, "b": 28}, autosize=True)
    return fig


def _donut_figure() -> go.Figure:
    labels = ["Backend", "Frontend", "DevOps", "Docs"]
    values = [40, 28, 20, 12]
    fig = go.Figure(
        go.Pie(
            labels=labels,
            values=values,
            hole=0.45,
            textinfo="percent",
            textposition="inside",
            marker={"colors": ["#3b4ccf", "#2e933c", "#c2410c", "#7a5c00"]},
        ),
    )
    # b=48 (not 8): a horizontal legend below the plot needs real
    # margin reserved for it, or it gets clipped — this is the actual
    # pixel space the legend renders into, not just a visual gap.
    fig.update_layout(
        margin={"l": 16, "r": 16, "t": 12, "b": 48},
        autosize=True,
        legend={
            "orientation": "h",
            "yanchor": "bottom",
            "y": -0.18,
            "xanchor": "center",
            "x": 0.5,
            "font": {"size": 11},
        },
    )
    return fig


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
            html.H2("min_item_width comparison"),
            html.P(
                "6 items, same container, both using auto_height=True. Left grid uses "
                f"a minimal min_item_width={COMPARE_MINIMAL_MIN_ITEM_WIDTH} (technically "
                "still a constraint, just one no real card is ever narrower than). Right "
                f"grid never lets a cell go below {COMPARE_MIN_ITEM_WIDTH}px — fewer "
                "columns whenever that would matter, same column count as the left grid "
                "once the container is wide enough that it wouldn't.",
                className="panel-note",
            ),
            html.Div(className="compare-row", children=[
                html.Div(className="compare-column", children=[
                    html.H3(f"min_item_width={COMPARE_MINIMAL_MIN_ITEM_WIDTH}"),
                    FluidaGrid(
                        id="grid-unconstrained",
                        item_count=COMPARE_ITEM_COUNT,
                        gap=COMPARE_GAP,
                        strategy="fit",
                        min_item_width=COMPARE_MINIMAL_MIN_ITEM_WIDTH,
                        auto_height=True,
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
                        strategy="fit",
                        min_item_width=COMPARE_MIN_ITEM_WIDTH,
                        auto_height=True,
                        className="grid compare-grid",
                        children=_cards("B", COMPARE_ITEM_COUNT),
                    ),
                ]),
            ]),
        ]),
        html.Section(className="panel grid-section charts-section", children=[
            html.H2("Responsive charts"),
            html.P(
                "4 real Plotly charts, one FluidaGrid, strategy \"preserve-ratio\" at "
                f"4:3, min_item_width={CHART_MIN_ITEM_WIDTH}, auto_height=True — every "
                "card's height comes directly from its real measured width.",
                className="panel-note",
            ),
            html.Div(className="charts-panel", children=[
                FluidaGrid(
                    id="grid-charts",
                    item_count=CHART_ITEM_COUNT,
                    gap=CHART_GAP,
                    strategy="preserve-ratio",
                    aspect_ratio=CHART_ASPECT_RATIO,
                    min_item_width=CHART_MIN_ITEM_WIDTH,
                    auto_height=True,
                    notify_layout_changes=True,
                    className="grid charts-grid",
                    children=[
                        _chart_card("chart-bar", "Bar", _bar_figure()),
                        _chart_card("chart-line", "Line", _line_figure()),
                        _chart_card("chart-scatter", "Scatter", _scatter_figure()),
                        _chart_card("chart-donut", "Donut", _donut_figure()),
                    ],
                ),
            ]),
        ]),
        # Invisible — exists only because clientside_callback requires a
        # real Output; nothing reads its own value.
        html.Div(id="chart-resize-sentinel", style={"display": "none"}),
    ],
)

# Plotly's own responsive ResizeObserver deliberately ignores its first
# notification per chart (confirmed by reading the installed plotly.js:
# `let B=!1; ...ResizeObserver((ee)=>{B?Q(ee):B=!0})` — the debounced
# resize Q only runs from the second callback onward). If a chart's
# card reaches its real, FluidaGrid-computed size within that same
# first notification — plausible, since mounting and FluidaGrid's own
# layout can resolve within the same browser frame — the chart never
# gets a second notification to actually resize on, and stays at
# whatever size it happened to render at first.
#
# This calls the same Plotly.Plots.resize the chart's own resize
# path would call, but triggered by FluidaGrid's own notify_layout_changes
# output — a real signal that the computed cell size actually changed,
# not a blind timeout or a global window listener (responsive:true
# uses ResizeObserver internally, not a window resize handler, so a
# dispatched window 'resize' event would not even reach it).
app.clientside_callback(
    """
    function(cellWidth, cellHeight, columns, rows) {
        if (typeof window.Plotly === "undefined") {
            return "";
        }
        const graphIds = ["chart-bar", "chart-line", "chart-scatter", "chart-donut"];
        for (const id of graphIds) {
            const el = document.getElementById(id);
            if (el) {
                window.Plotly.Plots.resize(el);
            }
        }
        return "";
    }
    """,
    Output("chart-resize-sentinel", "children"),
    Input("grid-charts", "cellWidth"),
    Input("grid-charts", "cellHeight"),
    Input("grid-charts", "columns"),
    Input("grid-charts", "rows"),
)

if __name__ == "__main__":
    app.run(debug=True)
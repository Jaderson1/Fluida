"""Fixture B — same grid id, item count, strategy, and dimensions as
plain_app.py, but each card contains a responsive dcc.Graph instead of
a plain div. Includes the same clientside_callback fix
python/dash-fluida/demo/app.py uses (Plotly.Plots.resize triggered by
FluidaGrid's own notify_layout_changes output), so this fixture can
also be run with that fix disabled (see FLUIDA_E2E_DISABLE_RESIZE_FIX)
to compare behavior with and without it.
"""

import os

import plotly.graph_objects as go
from dash import Dash, Input, Output, dcc, html
from dash_fluida import FluidaGrid

from .instrumentation import (
    GRID_ID,
    debug_json_element,
    index_string_with_instrumentation,
    register_debug_callback,
)

ITEM_COUNT = 4
GAP = 16
MIN_ITEM_WIDTH = 300
ASPECT_RATIO = 4 / 3


def _figure(kind: str) -> go.Figure:
    if kind == "bar":
        fig = go.Figure(go.Bar(x=["Mon", "Tue", "Wed"], y=[12, 19, 14], marker_color="#3b4ccf"))
    elif kind == "line":
        fig = go.Figure(go.Scatter(x=list(range(8)), y=[4, 6, 5, 8, 11, 10, 13, 15], mode="lines"))
    elif kind == "scatter":
        fig = go.Figure(go.Scatter(x=[1, 2, 3, 4], y=[3, 4, 2.5, 5], mode="markers"))
    else:
        fig = go.Figure(go.Pie(labels=["A", "B", "C"], values=[40, 35, 25], hole=0.45))
    fig.update_layout(margin={"l": 36, "r": 16, "t": 12, "b": 32}, autosize=True)
    return fig


def _chart_card(chart_id: str, kind: str):
    return html.Div(
        className="e2e-chart-card",
        style={"display": "flex", "flexDirection": "column", "height": "100%"},
        children=[
            html.Div(
                dcc.Graph(
                    id=chart_id,
                    figure=_figure(kind),
                    responsive=True,
                    config={"displayModeBar": False},
                    style={"width": "100%", "height": "100%"},
                ),
                style={"flex": "1 1 auto", "minWidth": 0, "minHeight": 0, "position": "relative"},
            ),
        ],
    )


app = Dash(__name__)
app.index_string = index_string_with_instrumentation()

app.layout = html.Div(
    id="e2e-shell",
    style={"maxWidth": "2000px", "margin": "0 auto", "padding": "16px"},
    children=[
        FluidaGrid(
            id=GRID_ID,
            item_count=ITEM_COUNT,
            gap=GAP,
            strategy="preserve-ratio",
            aspect_ratio=ASPECT_RATIO,
            min_item_width=MIN_ITEM_WIDTH,
            auto_height=True,
            notify_layout_changes=True,
            children=[
                _chart_card("e2e-chart-bar", "bar"),
                _chart_card("e2e-chart-line", "line"),
                _chart_card("e2e-chart-scatter", "scatter"),
                _chart_card("e2e-chart-donut", "donut"),
            ],
        ),
        debug_json_element(),
        html.Div(id="e2e-resize-sentinel", style={"display": "none"}),
    ],
)

register_debug_callback(app)

# FLUIDA_E2E_DISABLE_RESIZE_FIX=1 skips registering the resize-on-
# layout-change callback below, specifically so a test can run this
# same fixture with and without it and compare — proving the fix
# changes something real, not just that it exists.
if os.environ.get("FLUIDA_E2E_DISABLE_RESIZE_FIX") != "1":
    app.clientside_callback(
        """
        function(cellWidth, cellHeight, columns, rows) {
            if (typeof window.Plotly === "undefined") {
                return "";
            }
            const graphIds = ["e2e-chart-bar", "e2e-chart-line", "e2e-chart-scatter", "e2e-chart-donut"];
            for (const id of graphIds) {
                const el = document.getElementById(id);
                if (el) {
                    window.Plotly.Plots.resize(el);
                }
            }
            return "";
        }
        """,
        Output("e2e-resize-sentinel", "children"),
        Input(GRID_ID, "cellWidth"),
        Input(GRID_ID, "cellHeight"),
        Input(GRID_ID, "columns"),
        Input(GRID_ID, "rows"),
    )

if __name__ == "__main__":
    app.run(debug=False, port=8052)

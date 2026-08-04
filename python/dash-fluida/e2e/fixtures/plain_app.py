"""Fixture A — plain html.Div cards, no Plotly. Same grid id, item
count, strategy, and dimensions as plotly_app.py: the only thing that
differs between the two fixtures is what's inside each card. If this
fixture passes every assertion the Plotly one fails, the difference
is attributable to Plotly content specifically, not to FluidaGrid.
"""

from dash import Dash, html
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
                html.Div(
                    f"Card {i + 1}",
                    className="e2e-plain-card",
                    style={
                        "background": "#3b4ccf",
                        "color": "#fff",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "6px",
                    },
                )
                for i in range(ITEM_COUNT)
            ],
        ),
        debug_json_element(),
    ],
)

register_debug_callback(app)

if __name__ == "__main__":
    app.run(debug=False, port=8051)

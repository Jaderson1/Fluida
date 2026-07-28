"""Minimal Dash demo for FluidaGrid.

Cannot be visually verified from this environment — there is no
browser here. This confirms the app object builds and the layout
serializes without error; it does not confirm anything about how it
actually looks or behaves once opened in a real browser.
"""

from dash import Dash, html
from dash_fluida import FluidaGrid

app = Dash(__name__)

app.layout = html.Div(
    [
        html.H1("dash-fluida demo"),
        html.P(
            "Resize the browser window — FluidaGrid measures its own "
            "container, not the viewport, so this also reacts if the "
            "surrounding page layout changes without a window resize."
        ),
        FluidaGrid(
            id="grid",
            item_count=6,
            gap=16,
            min_item_width=280,
            strategy="fill",
            children=[
                html.Div(
                    f"Card {i + 1}",
                    style={
                        "background": "#3b4ccf",
                        "color": "white",
                        "display": "flex",
                        "alignItems": "center",
                        "justifyContent": "center",
                        "borderRadius": "6px",
                    },
                )
                for i in range(6)
            ],
        ),
    ],
    style={"padding": "24px", "fontFamily": "system-ui, sans-serif"},
)


if __name__ == "__main__":
    app.run(debug=True)

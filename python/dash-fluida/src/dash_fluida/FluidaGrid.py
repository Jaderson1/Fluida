import typing

from dash.development.base_component import Component, _explicitize_args

ComponentType = typing.Union[
    str, int, float, "Component", None, typing.Sequence[typing.Any]
]


class FluidaGrid(Component):
    """A FluidaGrid component.

    Measures its own real rendered size in the browser with
    ResizeObserver, coalesces updates with requestAnimationFrame, and
    lays out its children according to the same computeContainerLayout
    algorithm used by @fluida/core (TypeScript) — bundled directly into
    this component's frontend, not reimplemented.

    By default, nothing about the computed layout is sent back to the
    Python side: the measurement and calculation happen entirely in
    the browser, and only style this component's own children. Set
    notify_layout_changes=True to also receive columns/rows/cellWidth/
    cellHeight as props (useful for a callback that reacts to the
    computed layout) — even then, at most one update per animation
    frame is sent, never one per raw resize event.

    Keyword arguments:

    - children (a list of or a singular dash component, string or number; optional):
        The children of this component — the items to lay out.

    - id (string; optional):
        The ID of this component, used to identify Dash components in
        callbacks.

    - item_count (number; required):
        How many cells to lay out. Required — not inferred from
        children, since Dash's own prop serialization doesn't reliably
        distinguish real children from other falsy/structural values.

    - strategy (a value equal to: 'fit', 'fill', 'balanced', 'preserve-ratio'; default 'fit'):
        How the computed cell is sized. 'fit': square cells, the
        largest size that fits without overflow. 'fill': uses 100% of
        the space; cells may not be square. 'balanced': a middle
        ground between the two. 'preserve-ratio': cells keep
        aspect_ratio exactly, even if that leaves leftover space.

    - gap (number; default 16):
        Space between cells, in pixels.

    - aspect_ratio (number; default 1):
        width / height. Only used by the 'preserve-ratio' strategy.

    - min_item_width (number; optional):
        When set, column counts whose resulting cell would be
        narrower than this are excluded entirely. Omitted (the
        default) applies no such constraint.

    - style (dict; optional):
        Inline CSS applied to the container, merged with (and
        overriding) the layout-driven styles this component sets
        itself.

    - className (string; optional):
        CSS class applied to the container.

    - notify_layout_changes (boolean; default False):
        When True, the computed layout is also sent to the Python side
        via columns/rows/cellWidth/cellHeight, batched to at most once
        per animation frame. When False (the default), nothing about
        resize is ever sent to the server.

    - auto_height (boolean; default False):
        When True, this grid's own measured height is never fed back
        into the layout computation — the frontend computes cellHeight
        purely from the measured width, min_item_width, and strategy,
        and applies an explicit total height instead of a fixed 200px
        floor. Only works with strategy="fit" or strategy="preserve-ratio",
        and only when min_item_width is also set — "fill" and
        "balanced" raise the same error @fluida/core itself raises for
        that combination, since both need a real known height to mean
        anything. Defaults to False: existing behavior is unchanged
        unless this is set.

    - columns (number; optional):
        The computed column count. Only meaningfully populated if
        notify_layout_changes is True — read-only in practice, not
        meant to be set when constructing this component.

    - rows (number; optional):
        The computed row count. Same caveat as columns.

    - cellWidth (number; optional):
        The computed cell width, in pixels. Same caveat as columns.

    - cellHeight (number; optional):
        The computed cell height, in pixels. Same caveat as columns.
    """

    _children_props: typing.List[str] = []
    _base_nodes = ["children"]
    _namespace = "dash_fluida"
    _type = "FluidaGrid"

    _js_dist = [
        {
            "relative_package_path": "dash_fluida.min.js",
            "namespace": "dash_fluida",
        },
        {
            "relative_package_path": "dash_fluida.min.js.map",
            "namespace": "dash_fluida",
            "dynamic": True,
        },
    ]
    _css_dist: typing.List[typing.Dict[str, str]] = []

    def __init__(
        self,
        children: typing.Optional[ComponentType] = None,
        id: typing.Optional[typing.Union[str, dict]] = None,
        item_count: typing.Optional[int] = None,
        strategy: typing.Optional[str] = None,
        gap: typing.Optional[float] = None,
        aspect_ratio: typing.Optional[float] = None,
        min_item_width: typing.Optional[float] = None,
        style: typing.Optional[dict] = None,
        className: typing.Optional[str] = None,
        notify_layout_changes: typing.Optional[bool] = None,
        auto_height: typing.Optional[bool] = None,
        columns: typing.Optional[int] = None,
        rows: typing.Optional[int] = None,
        cellWidth: typing.Optional[float] = None,
        cellHeight: typing.Optional[float] = None,
        **kwargs: typing.Any,
    ) -> None:
        self._prop_names = [
            "children",
            "id",
            "item_count",
            "strategy",
            "gap",
            "aspect_ratio",
            "min_item_width",
            "style",
            "className",
            "notify_layout_changes",
            "auto_height",
            "columns",
            "rows",
            "cellWidth",
            "cellHeight",
        ]
        self._valid_wildcard_attributes: typing.List[str] = []
        self.available_properties = list(self._prop_names)
        self.available_wildcard_properties: typing.List[str] = []

        _explicit_args = kwargs.pop("_explicit_args")
        _locals = locals()
        _locals.update(kwargs)
        args = {k: _locals[k] for k in _explicit_args if k != "children"}

        if args.get("item_count") is None:
            raise TypeError(
                "FluidaGrid requires item_count — it is not optional, "
                "and not inferred from children."
            )

        super(FluidaGrid, self).__init__(children=children, **args)


setattr(FluidaGrid, "__init__", _explicitize_args(FluidaGrid.__init__))

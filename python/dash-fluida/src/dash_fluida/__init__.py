"""Dash adapter for Fluida's container-aware layout engine."""

from .FluidaGrid import FluidaGrid

__version__ = "0.1.0"

_js_dist = [
    {
        "relative_package_path": "dash_fluida.min.js",
        "namespace": "dash_fluida",
    }
]

_css_dist = []

FluidaGrid._js_dist = _js_dist
FluidaGrid._css_dist = _css_dist

__all__ = ["FluidaGrid"]
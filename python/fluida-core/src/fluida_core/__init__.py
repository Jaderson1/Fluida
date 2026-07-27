"""fluida_core — a framework-agnostic layout engine, pure Python.

No DOM, no Node.js, no browser dependency, no runtime dependencies at
all. A faithful, independently-verified port of the same algorithm
used by @fluida/core (TypeScript) — see
spec/conformance/layout-cases.json at the repository root for the
shared test cases both implementations are checked against.
"""

from .engine import compute_container_layout
from .models import FluidaConfigError, LayoutResult, LayoutStrategy

__all__ = [
    "compute_container_layout",
    "FluidaConfigError",
    "LayoutResult",
    "LayoutStrategy",
]

__version__ = "0.1.0"

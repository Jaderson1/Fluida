"""pytest fixtures that run the two Dash E2E apps (plain_app.py,
plotly_app.py) as real local servers, on fixed ports, for the
duration of each test session that needs them.
"""

import multiprocessing
import time
from pathlib import Path

import pytest
import requests

PLAIN_APP_PORT = 8051
PLOTLY_APP_PORT = 8052
DEMO_APP_PORT = 8054


def _run_plain_app():
    from e2e.fixtures.plain_app import app

    app.run(debug=False, port=PLAIN_APP_PORT, use_reloader=False)


def _run_plotly_app():
    from e2e.fixtures.plotly_app import app

    app.run(debug=False, port=PLOTLY_APP_PORT, use_reloader=False)


def _run_demo_app():
    # The real demo/app.py, not an isolated fixture — used specifically
    # to verify the demo's own CSS (fluid typography/spacing tokens),
    # which the plain/plotly fixtures above deliberately don't include.
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "demo"))
    from app import app

    app.run(debug=False, port=DEMO_APP_PORT, use_reloader=False)


def _wait_until_up(port: int, timeout_seconds: float = 15.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    last_error = None
    while time.monotonic() < deadline:
        try:
            requests.get(f"http://127.0.0.1:{port}/", timeout=1)
            return
        except requests.exceptions.RequestException as exc:
            last_error = exc
            time.sleep(0.2)
    raise RuntimeError(f"Dash server on port {port} did not start in time") from last_error


@pytest.fixture(scope="session")
def plain_app_url():
    process = multiprocessing.Process(target=_run_plain_app, daemon=True)
    process.start()
    try:
        _wait_until_up(PLAIN_APP_PORT)
        yield f"http://127.0.0.1:{PLAIN_APP_PORT}/"
    finally:
        process.terminate()
        process.join(timeout=5)


@pytest.fixture(scope="session")
def plotly_app_url():
    process = multiprocessing.Process(target=_run_plotly_app, daemon=True)
    process.start()
    try:
        _wait_until_up(PLOTLY_APP_PORT)
        yield f"http://127.0.0.1:{PLOTLY_APP_PORT}/"
    finally:
        process.terminate()
        process.join(timeout=5)


@pytest.fixture(scope="session")
def demo_app_url():
    process = multiprocessing.Process(target=_run_demo_app, daemon=True)
    process.start()
    try:
        _wait_until_up(DEMO_APP_PORT)
        yield f"http://127.0.0.1:{DEMO_APP_PORT}/"
    finally:
        process.terminate()
        process.join(timeout=5)


@pytest.fixture
def diagnostics_dir() -> Path:
    directory = Path(__file__).parent / "diagnostics"
    directory.mkdir(exist_ok=True)
    return directory

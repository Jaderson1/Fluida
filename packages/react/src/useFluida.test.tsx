import { act, cleanup, render, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';

import { FluidaProvider } from './FluidaProvider';
import { useFluida } from './useFluida';
import { useFluidaLayout } from './useFluidaLayout';

function setViewport(width: number, height: number, pixelRatio = 1): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: pixelRatio });
}

function fireResize(): void {
  window.dispatchEvent(new Event('resize'));
}

beforeEach(() => {
  setViewport(1920, 1080, 1);
});

afterEach(() => {
  cleanup();
});

describe('useFluida', () => {
  it('returns viewport, layout, and display, matching the underlying snapshot/layout', () => {
    const { result } = renderHook(() => useFluida(), { wrapper: FluidaProvider });

    expect(result.current.viewport.width).toBe(1920);
    expect(result.current.layout.breakpoint).toBe('desktop');
    expect(result.current.display).toBe(result.current.layout.display);
  });

  it('display comes from layout.display, not a separate computation — the same value, the same reference path', () => {
    const { result } = renderHook(() => useFluida(), { wrapper: FluidaProvider });

    // Identity, not just equal value: display is read directly off
    // layout, never recomputed inside this hook.
    expect(result.current.display).toBe(result.current.layout.display);
  });

  it('re-renders on a viewport-only change that does not affect any layout token', () => {
    let renderCount = 0;
    const { result } = renderHook(
      () => {
        renderCount += 1;
        return useFluida();
      },
      { wrapper: FluidaProvider },
    );

    const initialRenderCount = renderCount;
    const layoutBefore = result.current.layout;

    act(() => {
      // pixelRatio is part of the viewport snapshot but never an
      // input to computeLayout — width/height stay exactly the same,
      // so every layout token is guaranteed unchanged, unlike a width
      // change, which shifts typography.scale/spacing.page
      // continuously even by a single pixel.
      setViewport(1920, 1080, 2);
      fireResize();
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(result.current.layout).toBe(layoutBefore); // layout itself is unchanged
    expect(result.current.viewport.pixelRatio).toBe(2); // but viewport did change
  });

  it('useFluidaLayout alone does not re-render for that same viewport-only change', () => {
    let renderCount = 0;
    const { result } = renderHook(
      () => {
        renderCount += 1;
        return useFluidaLayout();
      },
      { wrapper: FluidaProvider },
    );

    const initialRenderCount = renderCount;

    act(() => {
      setViewport(1920, 1080, 2);
      fireResize();
    });

    expect(renderCount).toBe(initialRenderCount);
    expect(result.current.breakpoint).toBe('desktop');
  });

  it('returns a referentially stable object across a render that changes neither viewport nor layout', () => {
    const { result, rerender } = renderHook(() => useFluida(), { wrapper: FluidaProvider });
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});

describe('useFluida — SSR', () => {
  it('does not throw when rendered to a string, and reflects the server snapshot/layout', () => {
    function Debug() {
      const { viewport, layout, display } = useFluida();
      return (
        <div data-testid="debug">
          {JSON.stringify({ width: viewport.width, breakpoint: layout.breakpoint, display })}
        </div>
      );
    }

    const html = renderToString(
      <FluidaProvider>
        <Debug />
      </FluidaProvider>,
    );

    expect(html).toContain('width&quot;:0');
    expect(html).toContain('display&quot;:&quot;compact'); // width=0 -> breakpoint 'mobile' -> compact
  });
});

describe('useFluida — Strict Mode', () => {
  it('does not throw and returns a consistent result under Strict Mode double-invocation', () => {
    const { result } = renderHook(() => useFluida(), {
      wrapper: ({ children }) => (
        <StrictMode>
          <FluidaProvider>{children}</FluidaProvider>
        </StrictMode>
      ),
    });

    expect(result.current.layout.breakpoint).toBe('desktop');
    expect(result.current.display).toBe(result.current.layout.display);
  });

  it('mounts and unmounts cleanly under Strict Mode with no error', () => {
    const { unmount } = render(
      <StrictMode>
        <FluidaProvider>
          <Consumer />
        </FluidaProvider>
      </StrictMode>,
    );

    expect(() => unmount()).not.toThrow();
  });
});

function Consumer() {
  useFluida();
  return null;
}

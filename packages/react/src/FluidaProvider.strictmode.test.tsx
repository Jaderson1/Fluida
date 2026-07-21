import { act, cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createFluida } from '@fluida/core';

import { FluidaProvider } from './FluidaProvider';
import { useFluidaLayout } from './useFluidaLayout';

// Strict Mode's render-phase double-invocation calls the useState
// lazy initializer twice during a single mount — confirmed
// empirically, not assumed: createFluida() is genuinely called twice
// here, and only one of the two resulting instances ever actually
// gets subscribed to. Which one that is isn't safe to assume by
// position (first vs. last created) — every instance is wrapped with
// its own destroy spy at creation time, and the live one is
// identified afterward by which one actually received a subscribe()
// call, which is the only thing that reliably distinguishes "this is
// the instance React actually kept" from "this was discarded."
vi.mock('@fluida/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fluida/core')>();
  return {
    ...actual,
    createFluida: vi.fn((config) => {
      const instance = actual.createFluida(config);
      vi.spyOn(instance, 'subscribe');
      vi.spyOn(instance, 'destroy');
      return instance;
    }),
  };
});

function fireResize(): void {
  window.dispatchEvent(new Event('resize'));
}

function setViewport(width: number, height: number, pixelRatio = 1): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: pixelRatio });
}

function LayoutDebug() {
  const layout = useFluidaLayout();
  return <span data-testid="breakpoint">{layout.breakpoint}</span>;
}

function getLiveInstance(): {
  subscribe: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
} {
  const mockedCreateFluida = createFluida as unknown as ReturnType<typeof vi.fn>;
  const live = mockedCreateFluida.mock.results.find(
    (result) => (result.value.subscribe as ReturnType<typeof vi.fn>).mock.calls.length > 0,
  );

  if (!live) {
    throw new Error(
      'None of the created instances were ever subscribed to — test setup is wrong, not the component.',
    );
  }

  return live.value;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('FluidaProvider under React Strict Mode', () => {
  it(
    "[regression] a child reading useFluidaLayout() still updates after a resize " +
      "that happens after Strict Mode's mount-time effect replay",
    () => {
      setViewport(1024, 768, 1);

      render(
        <StrictMode>
          <FluidaProvider>
            <LayoutDebug />
          </FluidaProvider>
        </StrictMode>,
      );

      expect(screen.getByTestId('breakpoint').textContent).toBe('desktop');

      act(() => {
        setViewport(390, 800, 1);
        fireResize();
      });

      expect(screen.getByTestId('breakpoint').textContent).toBe('mobile');
    },
  );

  it("does not destroy the live Core instance across Strict Mode's simulated cleanup-then-setup replay", () => {
    render(
      <StrictMode>
        <FluidaProvider>
          <LayoutDebug />
        </FluidaProvider>
      </StrictMode>,
    );

    const live = getLiveInstance();
    expect(live.destroy).not.toHaveBeenCalled();
  });

  it('a genuine final unmount still destroys the live Core instance, after the deferred delay', () => {
    vi.useFakeTimers();

    const { unmount } = render(
      <StrictMode>
        <FluidaProvider>
          <LayoutDebug />
        </FluidaProvider>
      </StrictMode>,
    );

    const live = getLiveInstance();

    unmount();

    expect(live.destroy).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(live.destroy).toHaveBeenCalledTimes(1);
  });

  it('distinguishes simulated cleanup from a real unmount using the same instance and timers', () => {
    vi.useFakeTimers();

    const { unmount } = render(
      <StrictMode>
        <FluidaProvider>
          <LayoutDebug />
        </FluidaProvider>
      </StrictMode>,
    );

    const live = getLiveInstance();

    vi.runAllTimers();
    expect(live.destroy).not.toHaveBeenCalled();

    unmount();
    vi.runAllTimers();
    expect(live.destroy).toHaveBeenCalledTimes(1);
  });
});
import { act, cleanup, render } from '@testing-library/react';
import { StrictMode, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getLiveObserverFor,
  installMockResizeObserver,
  MockResizeObserver,
  removeMockResizeObserver,
} from './testUtils/mockResizeObserver';
import { useFluidaContainerSize } from './useFluidaContainerSize';

function Probe({ onSize }: { onSize: (size: { width: number; height: number }) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const size = useFluidaContainerSize(ref);
  onSize(size);
  return <div ref={ref} data-testid="probe" />;
}

afterEach(() => {
  cleanup();
  removeMockResizeObserver();
  vi.useRealTimers();
});

describe('useFluidaContainerSize', () => {
  it('starts at width 0, height 0 before any measurement arrives', () => {
    installMockResizeObserver();
    const sizes: Array<{ width: number; height: number }> = [];

    render(<Probe onSize={(size) => sizes.push(size)} />);

    expect(sizes[0]).toEqual({ width: 0, height: 0 });
  });

  it('updates when the observed element is resized, after the animation frame is flushed', () => {
    installMockResizeObserver();
    vi.useFakeTimers();
    const sizes: Array<{ width: number; height: number }> = [];

    const { getByTestId } = render(<Probe onSize={(size) => sizes.push(size)} />);
    const element = getByTestId('probe');

    const observer = getLiveObserverFor(element);
    expect(observer).toBeDefined();

    act(() => {
      observer?.trigger(640, 480);
    });

    // Not yet — the notification is deferred to the next animation
    // frame, not delivered synchronously inside the observer callback.
    expect(sizes.at(-1)).toEqual({ width: 0, height: 0 });

    act(() => {
      vi.runAllTimers();
    });

    expect(sizes.at(-1)).toEqual({ width: 640, height: 480 });
  });

  it('keeps the same reference when triggered with an identical size', () => {
    installMockResizeObserver();
    vi.useFakeTimers();
    const sizes: Array<{ width: number; height: number }> = [];

    const { getByTestId } = render(<Probe onSize={(size) => sizes.push(size)} />);
    const element = getByTestId('probe');
    const observer = getLiveObserverFor(element);

    act(() => {
      observer?.trigger(640, 480);
      vi.runAllTimers();
    });
    const first = sizes.at(-1);

    act(() => {
      observer?.trigger(640, 480);
      vi.runAllTimers();
    });
    const second = sizes.at(-1);

    expect(second).toBe(first);
  });

  it('disconnects the observer on unmount', () => {
    installMockResizeObserver();

    const { getByTestId, unmount } = render(
      <Probe onSize={() => {}} />,
    );
    const element = getByTestId('probe');
    const observer = getLiveObserverFor(element);
    expect(observer).toBeDefined();

    unmount();

    expect(observer?.disconnected).toBe(true);
  });

  it('does not throw and stays at the fallback size when ResizeObserver is unavailable', () => {
    expect(typeof ResizeObserver).toBe('undefined');

    const sizes: Array<{ width: number; height: number }> = [];

    expect(() => {
      render(<Probe onSize={(size) => sizes.push(size)} />);
    }).not.toThrow();

    expect(sizes[0]).toEqual({ width: 0, height: 0 });
  });

  it('survives React Strict Mode without leaving more than one live observer on the element', () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <StrictMode>
        <Probe onSize={() => {}} />
      </StrictMode>,
    );
    const element = getByTestId('probe');

    const liveObservers = getLiveObserverFor(element);
    expect(liveObservers).toBeDefined();

    const stillConnectedCount = MockResizeObserver.instances.filter(
      (instance) => instance.observedElement === element && !instance.disconnected,
    ).length;
    expect(stillConnectedCount).toBe(1);
  });

  describe('requestAnimationFrame coalescing', () => {
    it('delivers at most one update per frame, even if the observer fires more than once before the frame runs', () => {
      installMockResizeObserver();
      vi.useFakeTimers();
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');
      const sizes: Array<{ width: number; height: number }> = [];

      const { getByTestId } = render(<Probe onSize={(size) => sizes.push(size)} />);
      const element = getByTestId('probe');
      const observer = getLiveObserverFor(element);

      act(() => {
        observer?.trigger(100, 100);
        observer?.trigger(200, 200);
        observer?.trigger(300, 300);
      });

      expect(rafSpy).toHaveBeenCalledTimes(1);

      act(() => {
        vi.runAllTimers();
      });

      expect(sizes.at(-1)).toEqual({ width: 300, height: 300 });

      rafSpy.mockRestore();
    });

    it('produces a separate update for a resize that happens in a later, already-flushed frame', () => {
      installMockResizeObserver();
      vi.useFakeTimers();
      const sizes: Array<{ width: number; height: number }> = [];

      const { getByTestId } = render(<Probe onSize={(size) => sizes.push(size)} />);
      const element = getByTestId('probe');
      const observer = getLiveObserverFor(element);

      act(() => {
        observer?.trigger(100, 100);
        vi.runAllTimers();
      });
      expect(sizes.at(-1)).toEqual({ width: 100, height: 100 });

      act(() => {
        observer?.trigger(200, 200);
        vi.runAllTimers();
      });
      expect(sizes.at(-1)).toEqual({ width: 200, height: 200 });
    });

    it('cancels a pending frame on cleanup — the scheduled update never lands after unmount', () => {
      installMockResizeObserver();
      vi.useFakeTimers();
      const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
      const sizes: Array<{ width: number; height: number }> = [];

      const { getByTestId, unmount } = render(<Probe onSize={(size) => sizes.push(size)} />);
      const element = getByTestId('probe');
      const observer = getLiveObserverFor(element);

      act(() => {
        observer?.trigger(640, 480);
      });

      const sizesBeforeUnmount = sizes.length;

      unmount();
      expect(cancelSpy).toHaveBeenCalledTimes(1);

      act(() => {
        vi.runAllTimers();
      });

      expect(sizes.length).toBe(sizesBeforeUnmount);

      cancelSpy.mockRestore();
    });

    it('falls back to synchronous, uncoalesced notification when requestAnimationFrame is unavailable', () => {
      installMockResizeObserver();
      const originalRaf = globalThis.requestAnimationFrame;
      try {
        // @ts-expect-error - deliberately simulating an environment without rAF
        delete globalThis.requestAnimationFrame;
        const sizes: Array<{ width: number; height: number }> = [];
        const { getByTestId } = render(
          <Probe onSize={(size) => sizes.push(size)} />,
        );
        const element = getByTestId('probe');
        const observer = getLiveObserverFor(element);
        act(() => {
          observer?.trigger(640, 480);
        });
        expect(sizes.at(-1)).toEqual({
          width: 640,
          height: 480,
        });
      } finally {
        globalThis.requestAnimationFrame = originalRaf;
      }
    });
  });

  describe('hidden → visible (and back) convergence', () => {
    it.each([
      ['0 → 320', 0, 320],
      ['0 → 768', 0, 768],
      ['0 → 1920', 0, 1920],
    ])('%s: converges to the real size with no NaN/Infinity at any point', (_label, hiddenWidth, visibleWidth) => {
      installMockResizeObserver();
      vi.useFakeTimers();
      const sizes: Array<{ width: number; height: number }> = [];

      const { getByTestId } = render(<Probe onSize={(size) => sizes.push(size)} />);
      const element = getByTestId('probe');
      const observer = getLiveObserverFor(element);

      // display:none reports 0x0 through ResizeObserver — the same
      // value this hook already starts at before any measurement, so
      // this is exercising the same code path a real hidden mount
      // would, not a special case.
      act(() => {
        observer?.trigger(hiddenWidth, 0);
        vi.runAllTimers();
      });

      act(() => {
        observer?.trigger(visibleWidth, 400);
        vi.runAllTimers();
      });

      const finalSize = sizes.at(-1);
      expect(finalSize).toEqual({ width: visibleWidth, height: 400 });

      for (const size of sizes) {
        expect(Number.isFinite(size.width)).toBe(true);
        expect(Number.isFinite(size.height)).toBe(true);
      }
    });

    it.each([
      ['768 → 0 → 768', 768],
      ['1920 → 0 → 2560', 1920],
    ])('%s: hiding and reshowing converges to the final real size, without a remount', (_label, initialWidth) => {
      installMockResizeObserver();
      vi.useFakeTimers();
      const sizes: Array<{ width: number; height: number }> = [];
      const finalWidth = initialWidth === 768 ? 768 : 2560;

      const { getByTestId } = render(<Probe onSize={(size) => sizes.push(size)} />);
      const element = getByTestId('probe');
      const observer = getLiveObserverFor(element);
      const observerInstanceCountBefore = MockResizeObserver.instances.length;

      act(() => {
        observer?.trigger(initialWidth, 500);
        vi.runAllTimers();
      });
      act(() => {
        observer?.trigger(0, 0); // hidden
        vi.runAllTimers();
      });
      act(() => {
        observer?.trigger(finalWidth, 500); // visible again
        vi.runAllTimers();
      });

      expect(sizes.at(-1)).toEqual({ width: finalWidth, height: 500 });
      // No remount: the same observer instance handled the whole
      // sequence — no new ResizeObserver was created along the way.
      expect(MockResizeObserver.instances.length).toBe(observerInstanceCountBefore);
    });

    it('a size reached via hidden→visible matches a direct mount at that same size', () => {
      installMockResizeObserver();
      vi.useFakeTimers();

      const viaHidden: Array<{ width: number; height: number }> = [];
      const { getByTestId: getByTestIdA } = render(<Probe onSize={(size) => viaHidden.push(size)} />);
      const elementA = getByTestIdA('probe');
      const observerA = getLiveObserverFor(elementA);

      act(() => {
        observerA?.trigger(0, 0);
        vi.runAllTimers();
      });
      act(() => {
        observerA?.trigger(1920, 1080);
        vi.runAllTimers();
      });

      cleanup();

      const direct: Array<{ width: number; height: number }> = [];
      const { getByTestId: getByTestIdB } = render(<Probe onSize={(size) => direct.push(size)} />);
      const elementB = getByTestIdB('probe');
      const observerB = getLiveObserverFor(elementB);

      act(() => {
        observerB?.trigger(1920, 1080);
        vi.runAllTimers();
      });

      expect(viaHidden.at(-1)).toEqual(direct.at(-1));
    });
  });

  describe('resize storm (many measurements before one frame)', () => {
    it('a realistic fast-drag sequence (320→480→768→1024→1366→1920→2560) schedules exactly one frame and applies only the last value', () => {
      installMockResizeObserver();
      vi.useFakeTimers();
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');
      const sizes: Array<{ width: number; height: number }> = [];

      const { getByTestId } = render(<Probe onSize={(size) => sizes.push(size)} />);
      const element = getByTestId('probe');
      const observer = getLiveObserverFor(element);

      const sequence = [320, 480, 768, 1024, 1366, 1920, 2560];

      act(() => {
        for (const width of sequence) {
          observer?.trigger(width, 800);
        }
      });

      expect(rafSpy).toHaveBeenCalledTimes(1);

      act(() => {
        vi.runAllTimers();
      });

      expect(sizes.at(-1)).toEqual({ width: 2560, height: 800 });
      // Only two real notifications ever happened: the initial 0x0
      // mount value, and the one coalesced update for the whole
      // sequence — not one per triggered measurement.
      expect(sizes.length).toBe(2);

      rafSpy.mockRestore();
    });
  });
});
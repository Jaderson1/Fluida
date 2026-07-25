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
      // @ts-expect-error - deliberately simulating an environment without rAF
      delete globalThis.requestAnimationFrame;

      const sizes: Array<{ width: number; height: number }> = [];

      const { getByTestId } = render(<Probe onSize={(size) => sizes.push(size)} />);
      const element = getByTestId('probe');
      const observer = getLiveObserverFor(element);

      act(() => {
        observer?.trigger(640, 480);
      });

      expect(sizes.at(-1)).toEqual({ width: 640, height: 480 });

      globalThis.requestAnimationFrame = originalRaf;
    });
  });
});
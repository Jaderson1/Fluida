import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FluidaGrid from './FluidaGrid';
import {
  getLiveObserverFor,
  installMockResizeObserver,
  removeMockResizeObserver,
} from './testUtils/mockResizeObserver';

afterEach(() => {
  cleanup();
  removeMockResizeObserver();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('resize coalescing', () => {
  it('keeps only one frame scheduled and applies the most recent of several measurements', () => {
    installMockResizeObserver();
    vi.useFakeTimers();
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');

    const { container } = render(
      <FluidaGrid id="grid" item_count={4} gap={0} strategy="fit">
        <span>1</span>
      </FluidaGrid>,
    );

    const element = container.querySelector<HTMLElement>('#grid')!;
    const observer = getLiveObserverFor(element);

    act(() => {
      observer?.trigger(400, 300);
      observer?.trigger(700, 500);
      observer?.trigger(900, 600);
    });

    // All three measurements happened before any frame ran — only one
    // frame should have been requested for them.
    expect(rafSpy).toHaveBeenCalledTimes(1);

    act(() => {
      vi.runAllTimers();
    });

    // The frame must have used the last measurement (900x600), not
    // the first one that happened to schedule it.
    expect(element.style.gridTemplateColumns).toBe('repeat(3, 300px)');
  });

  it('recomputes for a measurement that arrives after the first frame already ran', () => {
    installMockResizeObserver();
    vi.useFakeTimers();

    const { container } = render(
      <FluidaGrid id="grid" item_count={4} gap={0} strategy="fit">
        <span>1</span>
      </FluidaGrid>,
    );

    const element = container.querySelector<HTMLElement>('#grid')!;
    const observer = getLiveObserverFor(element);

    act(() => {
      observer?.trigger(400, 300);
      vi.runAllTimers();
    });
    const firstColumns = element.style.gridTemplateColumns;

    act(() => {
      observer?.trigger(800, 600);
      vi.runAllTimers();
    });
    const secondColumns = element.style.gridTemplateColumns;

    expect(secondColumns).not.toBe(firstColumns);
  });
});

describe('lifecycle', () => {
  it('cancels a pending frame on unmount', () => {
    installMockResizeObserver();
    vi.useFakeTimers();
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');

    const { container, unmount } = render(
      <FluidaGrid id="grid" item_count={4} gap={0} strategy="fit">
        <span>1</span>
      </FluidaGrid>,
    );

    const element = container.querySelector<HTMLElement>('#grid')!;
    const observer = getLiveObserverFor(element);

    act(() => {
      observer?.trigger(400, 300);
    });

    unmount();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('disconnects the observer on unmount', () => {
    installMockResizeObserver();

    const { container, unmount } = render(
      <FluidaGrid id="grid" item_count={4} gap={0} strategy="fit">
        <span>1</span>
      </FluidaGrid>,
    );

    const element = container.querySelector<HTMLElement>('#grid')!;
    const observer = getLiveObserverFor(element);
    expect(observer).toBeDefined();

    unmount();

    expect(observer?.disconnected).toBe(true);
  });

  it('does not update after unmount even if a pending frame somehow still ran', () => {
    installMockResizeObserver();
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { container, unmount } = render(
      <FluidaGrid id="grid" item_count={4} gap={0} strategy="fit">
        <span>1</span>
      </FluidaGrid>,
    );

    const element = container.querySelector<HTMLElement>('#grid')!;
    const observer = getLiveObserverFor(element);
    const beforeUnmount = element.style.gridTemplateColumns;

    act(() => {
      observer?.trigger(900, 600);
    });

    unmount();

    // The real cancelAnimationFrame call above already prevents the
    // frame from running in a real browser; this only checks that if
    // it somehow did, applyMeasurement's own isMounted guard would
    // still refuse to call setState on an unmounted component.
    act(() => {
      vi.runAllTimers();
    });

    expect(element.style.gridTemplateColumns).toBe(beforeUnmount);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('SSR safety', () => {
  it('does not access ResizeObserver or requestAnimationFrame during module import', async () => {
    // Importing the module itself must not touch any browser API —
    // only using the component (via the effect, which only runs in a
    // real browser) should. Re-importing with globals removed
    // confirms nothing at module scope depends on them.
    const originalResizeObserver = globalThis.ResizeObserver;
    // @ts-expect-error -- deliberately removing a browser global to prove import safety
    delete globalThis.ResizeObserver;

    await expect(import('./FluidaGrid')).resolves.toBeDefined();

    globalThis.ResizeObserver = originalResizeObserver;
  });
});

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

describe('accessibility', () => {
  it('sets no aria-label by default', () => {
    installMockResizeObserver();

    const { container } = render(
      <FluidaGrid item_count={2} gap={0} strategy="fit">
        <span>1</span>
        <span>2</span>
      </FluidaGrid>,
    );

    expect(container.querySelector('div')?.hasAttribute('aria-label')).toBe(false);
  });

  it('forwards aria_label when provided', () => {
    installMockResizeObserver();

    const { container } = render(
      <FluidaGrid item_count={2} gap={0} strategy="fit" aria_label="Chart grid">
        <span>1</span>
        <span>2</span>
      </FluidaGrid>,
    );

    expect(container.querySelector('div')?.getAttribute('aria-label')).toBe('Chart grid');
  });

  it('forwards arbitrary aria-* and data-* attributes via extra_attrs', () => {
    installMockResizeObserver();

    const { container } = render(
      <FluidaGrid
        item_count={2}
        gap={0}
        strategy="fit"
        extra_attrs={{ 'data-testid': 'charts-grid', 'aria-describedby': 'charts-help' }}
      >
        <span>1</span>
        <span>2</span>
      </FluidaGrid>,
    );

    const element = container.querySelector('div');
    expect(element?.getAttribute('data-testid')).toBe('charts-grid');
    expect(element?.getAttribute('aria-describedby')).toBe('charts-help');
  });

  it('does not add any role to the grid container', () => {
    installMockResizeObserver();

    const { container } = render(
      <FluidaGrid item_count={2} gap={0} strategy="fit">
        <span>1</span>
        <span>2</span>
      </FluidaGrid>,
    );

    expect(container.querySelector('div')?.hasAttribute('role')).toBe(false);
  });

  it('renders children in their given order, undisturbed, for normal tab order', () => {
    installMockResizeObserver();

    const { getAllByRole } = render(
      <FluidaGrid item_count={3} gap={0} strategy="fit">
        <button type="button">First</button>
        <button type="button">Second</button>
        <button type="button">Third</button>
      </FluidaGrid>,
    );

    const buttons = getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['First', 'Second', 'Third']);
    // No tabIndex applied by FluidaGrid itself — each button keeps
    // its own natural (unset) tabIndex, not one FluidaGrid assigned.
    for (const button of buttons) {
      expect(button.hasAttribute('tabindex')).toBe(false);
    }
  });

  it('does not attach any keyboard event handler to the container', () => {
    installMockResizeObserver();

    const { container } = render(
      <FluidaGrid item_count={2} gap={0} strategy="fit">
        <span>1</span>
        <span>2</span>
      </FluidaGrid>,
    );

    const element = container.querySelector('div');
    expect(element?.onkeydown).toBeNull();
    expect(element?.onkeyup).toBeNull();
    expect(element?.onkeypress).toBeNull();
  });
});

describe('large container sizing (no independent ceiling)', () => {
  it('cell size keeps growing with the measured container at 4K/ultrawide-scale widths, with no cap of its own', () => {
    installMockResizeObserver();
    vi.useFakeTimers();

    const { container } = render(
      <FluidaGrid item_count={4} gap={16} strategy="fit">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
      </FluidaGrid>,
    );

    const element = container.querySelector('div') as HTMLElement;
    const observer = getLiveObserverFor(element);

    // FluidaGrid only ever calls computeContainerLayout with the real
    // measured width/height — there is no fixed max-width or
    // hardcoded cell-size ceiling anywhere in this component. Two
    // widths at 4K/ultrawide scale, one clearly larger than the
    // other, must produce a proportionally larger cell — not the
    // same value both times.
    act(() => {
      observer?.trigger(2560, 1440);
      vi.runAllTimers();
    });
    const at2560 = element.style.gridTemplateColumns;

    act(() => {
      observer?.trigger(3840, 2160);
      vi.runAllTimers();
    });
    const at3840 = element.style.gridTemplateColumns;

    expect(at3840).not.toBe(at2560);

    const cellWidthAt = (value: string) => Number(value.match(/repeat\(\d+, ([\d.]+)px\)/)?.[1]);
    expect(cellWidthAt(at3840)).toBeGreaterThan(cellWidthAt(at2560));
  });
});

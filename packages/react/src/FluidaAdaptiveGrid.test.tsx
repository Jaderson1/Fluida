import { act, cleanup, render } from '@testing-library/react';
import { createRef, StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FluidaAdaptiveGrid } from './FluidaAdaptiveGrid';
import {
  getLiveObserverFor,
  installMockResizeObserver,
  MockResizeObserver,
  removeMockResizeObserver,
} from './testUtils/mockResizeObserver';

afterEach(() => {
  cleanup();
  removeMockResizeObserver();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('FluidaAdaptiveGrid', () => {
  it('renders its children', () => {
    installMockResizeObserver();

    const { getByText } = render(
      <FluidaAdaptiveGrid itemCount={1}>
        <span>cell</span>
      </FluidaAdaptiveGrid>,
    );

    expect(getByText('cell')).toBeTruthy();
  });

  it('forwards a ref to the underlying div, while still measuring it internally', () => {
    installMockResizeObserver();
    const ref = createRef<HTMLDivElement>();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid itemCount={1} ref={ref} data-testid="grid">
        <span>cell</span>
      </FluidaAdaptiveGrid>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toBe(getByTestId('grid'));

    const observer = getLiveObserverFor(getByTestId('grid'));
    expect(observer).toBeDefined();
  });

  it('forwards standard div props', () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid itemCount={1} data-testid="grid" className="custom-class">
        <span>cell</span>
      </FluidaAdaptiveGrid>,
    );

    expect(getByTestId('grid').className).toBe('custom-class');
  });

  it("applies fit's square cell sizing after a real measurement", () => {
    installMockResizeObserver();
    vi.useFakeTimers();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid itemCount={4} strategy="fit" gap={0} data-testid="grid">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
      </FluidaAdaptiveGrid>,
    );

    const element = getByTestId('grid');
    const observer = getLiveObserverFor(element);

    act(() => {
      observer?.trigger(400, 100);
      vi.runAllTimers();
    });

    expect(element.style.gridTemplateColumns).toBe('repeat(4, 100px)');
    expect(element.style.gridAutoRows).toBe('100px');
  });

  it('applies a different cell shape for preserve-ratio than for fit, given the same measurement', () => {
    installMockResizeObserver();
    vi.useFakeTimers();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid
        itemCount={6}
        strategy="preserve-ratio"
        aspectRatio={2}
        gap={0}
        data-testid="grid"
      >
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
        <span>6</span>
      </FluidaAdaptiveGrid>,
    );

    const element = getByTestId('grid');
    const observer = getLiveObserverFor(element);

    act(() => {
      observer?.trigger(800, 300);
      vi.runAllTimers();
    });

    const columnsMatch = element.style.gridTemplateColumns.match(/repeat\((\d+),\s*([\d.]+)px\)/);
    const rowHeightMatch = element.style.gridAutoRows.match(/([\d.]+)px/);

    expect(columnsMatch).not.toBeNull();
    expect(rowHeightMatch).not.toBeNull();

    const cellWidth = Number(columnsMatch?.[2]);
    const cellHeight = Number(rowHeightMatch?.[1]);

    expect(cellWidth / cellHeight).toBeCloseTo(2, 1);
  });

  it('updates its grid when the measured container is resized', () => {
    installMockResizeObserver();
    vi.useFakeTimers();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid itemCount={4} strategy="fit" gap={0} data-testid="grid">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
      </FluidaAdaptiveGrid>,
    );

    const element = getByTestId('grid');
    const observer = getLiveObserverFor(element);

    act(() => {
      observer?.trigger(400, 100);
      vi.runAllTimers();
    });

    const before = element.style.gridAutoRows;

    act(() => {
      observer?.trigger(800, 200);
      vi.runAllTimers();
    });

    const after = element.style.gridAutoRows;

    expect(after).not.toBe(before);
  });

  it('throws for an itemCount below 1, via the same FluidaConfigError Core already uses', () => {
    installMockResizeObserver();

    expect(() => {
      render(
        <FluidaAdaptiveGrid itemCount={0} data-testid="grid">
          <span>cell</span>
        </FluidaAdaptiveGrid>,
      );
    }).toThrow();
  });

  describe('minItemWidth', () => {
    it('propagates minItemWidth to the underlying computation', () => {
      installMockResizeObserver();
      vi.useFakeTimers();

      const { getByTestId } = render(
        <FluidaAdaptiveGrid
          itemCount={4}
          gap={0}
          strategy="fill"
          minItemWidth={150}
          data-testid="grid"
        >
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </FluidaAdaptiveGrid>,
      );

      const element = getByTestId('grid');
      const observer = getLiveObserverFor(element);

      act(() => {
        observer?.trigger(400, 100);
        vi.runAllTimers();
      });

      expect(element.style.gridTemplateColumns).toBe('repeat(2, 200px)');
    });

    it('reduces the column count in a narrow container compared to the same container without minItemWidth', () => {
      installMockResizeObserver();
      vi.useFakeTimers();

      const withoutConstraint = render(
        <FluidaAdaptiveGrid itemCount={4} gap={0} strategy="fill" data-testid="grid-a">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </FluidaAdaptiveGrid>,
      );

      const elementA = withoutConstraint.getByTestId('grid-a');
      const observerA = getLiveObserverFor(elementA);

      act(() => {
        observerA?.trigger(400, 100);
        vi.runAllTimers();
      });

      const columnsWithoutConstraint = elementA.style.gridTemplateColumns;

      const withConstraint = render(
        <FluidaAdaptiveGrid
          itemCount={4}
          gap={0}
          strategy="fill"
          minItemWidth={150}
          data-testid="grid-b"
        >
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </FluidaAdaptiveGrid>,
      );

      const elementB = withConstraint.getByTestId('grid-b');
      const observerB = getLiveObserverFor(elementB);

      act(() => {
        observerB?.trigger(400, 100);
        vi.runAllTimers();
      });

      const columnsWithConstraint = elementB.style.gridTemplateColumns;

      expect(columnsWithoutConstraint).toBe('repeat(4, 100px)');
      expect(columnsWithConstraint).toBe('repeat(2, 200px)');
    });

    it('keeps the exact current behavior when minItemWidth is not provided', () => {
      installMockResizeObserver();
      vi.useFakeTimers();

      const { getByTestId } = render(
        <FluidaAdaptiveGrid itemCount={4} strategy="fit" gap={0} data-testid="grid">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </FluidaAdaptiveGrid>,
      );

      const element = getByTestId('grid');
      const observer = getLiveObserverFor(element);

      act(() => {
        observer?.trigger(400, 100);
        vi.runAllTimers();
      });

      expect(element.style.gridTemplateColumns).toBe('repeat(4, 100px)');
      expect(element.style.gridAutoRows).toBe('100px');
    });

    it('propagates FluidaConfigError for an invalid minItemWidth', () => {
      installMockResizeObserver();

      expect(() => {
        render(
          <FluidaAdaptiveGrid itemCount={4} minItemWidth={0} data-testid="grid">
            <span>1</span>
          </FluidaAdaptiveGrid>,
        );
      }).toThrow();
    });
  });
});

describe('height safety (regression)', () => {
  it('never sets height: 100% — the property that caused the deadlock is gone entirely', () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid itemCount={1} data-testid="grid">
        <span>cell</span>
      </FluidaAdaptiveGrid>,
    );

    expect(getByTestId('grid').style.height).toBe('');
  });

  it('applies a non-zero minHeight by default, before any real measurement exists', () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid itemCount={1} data-testid="grid">
        <span>cell</span>
      </FluidaAdaptiveGrid>,
    );

    const minHeight = Number.parseFloat(getByTestId('grid').style.minHeight);

    expect(minHeight).toBeGreaterThan(0);
  });

  it("lets a consumer's own style.height override the default minHeight", () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid itemCount={1} data-testid="grid" style={{ height: '500px' }}>
        <span>cell</span>
      </FluidaAdaptiveGrid>,
    );

    expect(getByTestId('grid').style.height).toBe('500px');
  });

  it("lets a consumer's own style.minHeight override the default", () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid itemCount={1} data-testid="grid" style={{ minHeight: '10px' }}>
        <span>cell</span>
      </FluidaAdaptiveGrid>,
    );

    expect(getByTestId('grid').style.minHeight).toBe('10px');
  });
});

describe('itemCount vs. rendered children (development warning)', () => {
  it('warns in development when itemCount does not match the number of children', () => {
    installMockResizeObserver();

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <FluidaAdaptiveGrid itemCount={3}>
        <span>1</span>
        <span>2</span>
      </FluidaAdaptiveGrid>,
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('itemCount={3}');
  });

  it('does not double-log the same mismatch under Strict Mode double-invocation', () => {
    installMockResizeObserver();

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <StrictMode>
        <FluidaAdaptiveGrid itemCount={3}>
          <span>1</span>
          <span>2</span>
        </FluidaAdaptiveGrid>
      </StrictMode>,
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does not warn when itemCount matches the number of children', () => {
    installMockResizeObserver();

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <FluidaAdaptiveGrid itemCount={2}>
        <span>1</span>
        <span>2</span>
      </FluidaAdaptiveGrid>,
    );

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not throw when itemCount and children disagree', () => {
    installMockResizeObserver();

    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => {
      render(
        <FluidaAdaptiveGrid itemCount={5}>
          <span>1</span>
        </FluidaAdaptiveGrid>,
      );
    }).not.toThrow();
  });

  describe('autoHeight', () => {
    it('keeps existing behavior exactly when autoHeight is absent', () => {
      installMockResizeObserver();
      vi.useFakeTimers();

      const { getByTestId } = render(
        <FluidaAdaptiveGrid itemCount={4} strategy="fit" gap={0} data-testid="grid">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </FluidaAdaptiveGrid>,
      );

      const element = getByTestId('grid');
      const observer = getLiveObserverFor(element);

      act(() => {
        observer?.trigger(400, 100);
        vi.runAllTimers();
      });

      // Same values @fluida/react has always produced here — the
      // 200px minHeight floor, not an explicit computed height.
      expect(element.style.minHeight).toBe('200px');
      expect(element.style.height).toBe('');
      expect(element.style.gridTemplateColumns).toBe('repeat(4, 100px)');

      vi.useRealTimers();
    });

    it('when true, computes a layout independent of the measured height, and applies an explicit height', () => {
      installMockResizeObserver();
      vi.useFakeTimers();

      const { getByTestId } = render(
        <FluidaAdaptiveGrid
          itemCount={6}
          gap={16}
          strategy="fit"
          minItemWidth={280}
          autoHeight
          data-testid="grid"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i}>{i}</span>
          ))}
        </FluidaAdaptiveGrid>,
      );

      const element = getByTestId('grid');
      const observer = getLiveObserverFor(element);

      // Height reported by the observer is deliberately something the
      // layout should NOT depend on at all in autoHeight mode — an
      // absurdly small height, to make it obvious if it were still
      // being used.
      act(() => {
        observer?.trigger(1200, 1);
        vi.runAllTimers();
      });

      // Same columns/cellWidth as the Core-level auto-height test for
      // these exact numbers (1200 width, gap 16, minItemWidth 280,
      // itemCount 6) — verified there directly against
      // computeContainerLayout.
      expect(element.style.gridTemplateColumns).toBe('repeat(4, 288px)');
      expect(element.style.gridAutoRows).toBe('288px');

      // rows(2) * cellHeight(288) + (rows-1)(1) * gap(16) = 592 —
      // computed locally by the component, applied as an explicit
      // height, not left to the 200px floor.
      expect(element.style.height).toBe('592px');
      expect(element.style.minHeight).toBe('');

      vi.useRealTimers();
    });

    it('recomputes after a width change, still ignoring measured height', () => {
      installMockResizeObserver();
      vi.useFakeTimers();

      const { getByTestId } = render(
        <FluidaAdaptiveGrid
          itemCount={6}
          gap={16}
          strategy="fit"
          minItemWidth={280}
          autoHeight
          data-testid="grid"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i}>{i}</span>
          ))}
        </FluidaAdaptiveGrid>,
      );

      const element = getByTestId('grid');
      const observer = getLiveObserverFor(element);

      act(() => {
        observer?.trigger(1200, 1);
        vi.runAllTimers();
      });
      const columnsBefore = element.style.gridTemplateColumns;

      act(() => {
        observer?.trigger(2000, 1);
        vi.runAllTimers();
      });
      const columnsAfter = element.style.gridTemplateColumns;

      expect(columnsAfter).not.toBe(columnsBefore);

      vi.useRealTimers();
    });

    it('does not create a ResizeObserver notification loop — settles after one update per real resize', () => {
      installMockResizeObserver();
      vi.useFakeTimers();
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');

      const { getByTestId } = render(
        <FluidaAdaptiveGrid
          itemCount={6}
          gap={16}
          strategy="fit"
          minItemWidth={280}
          autoHeight
          data-testid="grid"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i}>{i}</span>
          ))}
        </FluidaAdaptiveGrid>,
      );

      const element = getByTestId('grid');
      const observer = getLiveObserverFor(element);

      act(() => {
        observer?.trigger(1200, 1);
        vi.runAllTimers();
      });

      const callsAfterFirstResize = rafSpy.mock.calls.length;

      // Advancing timers further, with no further real resize, must
      // not schedule any more frames — applying the computed height
      // via style does not itself trigger the component's own
      // ResizeObserver into observing itself, since height is applied
      // as an explicit style value, not left for the browser to
      // report back as a "new" measurement requiring recomputation.
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(rafSpy.mock.calls.length).toBe(callsAfterFirstResize);

      rafSpy.mockRestore();
      vi.useRealTimers();
    });

    it('throws the same FluidaConfigError as Core for fill + autoHeight', () => {
      installMockResizeObserver();

      // Validation happens before any column-selection logic, so this
      // throws on the very first render — the measured size (0x0
      // initially) never even factors in.
      expect(() => {
        render(
          <FluidaAdaptiveGrid
            itemCount={6}
            strategy="fill"
            minItemWidth={280}
            autoHeight
            data-testid="grid"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i}>{i}</span>
            ))}
          </FluidaAdaptiveGrid>,
        );
      }).toThrow();
    });

    it('throws the same FluidaConfigError as Core for fit + autoHeight without minItemWidth', () => {
      installMockResizeObserver();

      expect(() => {
        render(
          <FluidaAdaptiveGrid itemCount={6} strategy="fit" autoHeight data-testid="grid">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i}>{i}</span>
            ))}
          </FluidaAdaptiveGrid>,
        );
      }).toThrow();
    });

    it('cleanup still disconnects the observer correctly with autoHeight active', () => {
      installMockResizeObserver();

      const { getByTestId, unmount } = render(
        <FluidaAdaptiveGrid
          itemCount={6}
          gap={16}
          strategy="fit"
          minItemWidth={280}
          autoHeight
          data-testid="grid"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i}>{i}</span>
          ))}
        </FluidaAdaptiveGrid>,
      );

      const element = getByTestId('grid');
      const observer = getLiveObserverFor(element);
      expect(observer).toBeDefined();

      unmount();

      expect(observer?.disconnected).toBe(true);
    });

    it('a ResizeObserver callback delivered after unmount does not warn, throw, or update anything', () => {
      installMockResizeObserver();
      vi.useFakeTimers();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { getByTestId, unmount } = render(
        <FluidaAdaptiveGrid itemCount={4} strategy="fit" gap={0} data-testid="grid">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i}>{i}</span>
          ))}
        </FluidaAdaptiveGrid>,
      );

      const element = getByTestId('grid');
      const observer = getLiveObserverFor(element);

      // A real resize to establish a stable, known layout before the
      // race — otherwise there's nothing to distinguish "unaffected
      // by the late callback" from "just never rendered anything".
      act(() => {
        observer?.trigger(400, 400);
        vi.runAllTimers();
      });
      const columnsBeforeUnmount = element.style.gridTemplateColumns;

      unmount();

      // The mock's own trigger() calls its callback unconditionally,
      // disconnected or not — deliberately simulating the case a real
      // browser is supposed to prevent but where relying on that
      // alone would be fragile: a callback already queued (e.g. in a
      // microtask) before disconnect() ran, delivered after.
      expect(() => {
        act(() => {
          observer?.trigger(900, 900);
          vi.runAllTimers();
        });
      }).not.toThrow();

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      // The unmounted element's own style never changes as a result —
      // there's nothing left for the late callback to have updated.
      expect(element.style.gridTemplateColumns).toBe(columnsBeforeUnmount);

      vi.useRealTimers();
    });
  });
});

describe('Strict Mode hardening (mount/unmount/remount + resize + late callback)', () => {
  it('mount, resize, unmount, remount, resize again — exactly one live observer at every point, no orphans', () => {
    installMockResizeObserver();
    vi.useFakeTimers();

    const { getByTestId, unmount } = render(
      <StrictMode>
        <FluidaAdaptiveGrid itemCount={4} strategy="fit" gap={0} data-testid="grid">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i}>{i}</span>
          ))}
        </FluidaAdaptiveGrid>
      </StrictMode>,
    );

    const countLiveObservers = (element: Element) =>
      MockResizeObserver.instances.filter((i) => i.observedElement === element && !i.disconnected).length;

    const element = getByTestId('grid');
    expect(countLiveObservers(element)).toBe(1);

    act(() => {
      getLiveObserverFor(element)?.trigger(800, 800);
      vi.runAllTimers();
    });
    expect(countLiveObservers(element)).toBe(1);

    unmount();
    expect(MockResizeObserver.instances.some((i) => i.observedElement === element && !i.disconnected)).toBe(
      false,
    );

    // A genuine remount — a fresh render() after unmount(), not
    // rerender() on the now-torn-down root.
    const { getByTestId: getByTestIdAfterRemount } = render(
      <StrictMode>
        <FluidaAdaptiveGrid itemCount={4} strategy="fit" gap={0} data-testid="grid">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i}>{i}</span>
          ))}
        </FluidaAdaptiveGrid>
      </StrictMode>,
    );
    const remountedElement = getByTestIdAfterRemount('grid');

    act(() => {
      getLiveObserverFor(remountedElement)?.trigger(1200, 1200);
      vi.runAllTimers();
    });
    expect(countLiveObservers(remountedElement)).toBe(1);
  });

  it('a callback delivered after unmount, under Strict Mode, updates nothing and throws nothing', () => {
    installMockResizeObserver();
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getByTestId, unmount } = render(
      <StrictMode>
        <FluidaAdaptiveGrid itemCount={4} strategy="fit" gap={0} data-testid="grid">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i}>{i}</span>
          ))}
        </FluidaAdaptiveGrid>
      </StrictMode>,
    );

    const element = getByTestId('grid');
    const observer = getLiveObserverFor(element);

    act(() => {
      observer?.trigger(500, 500);
      vi.runAllTimers();
    });
    const columnsBeforeUnmount = element.style.gridTemplateColumns;

    unmount();

    expect(() => {
      act(() => {
        observer?.trigger(1600, 1600);
        vi.runAllTimers();
      });
    }).not.toThrow();

    expect(element.style.gridTemplateColumns).toBe(columnsBeforeUnmount);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('accessibility', () => {
  it('sets no role or aria-label unless the consumer provides one', () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid itemCount={2} gap={0} strategy="fit" data-testid="grid">
        <span>1</span>
        <span>2</span>
      </FluidaAdaptiveGrid>,
    );

    const element = getByTestId('grid');
    expect(element.hasAttribute('role')).toBe(false);
    expect(element.hasAttribute('aria-label')).toBe(false);
  });

  it('forwards arbitrary aria-* and data-* attributes', () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid
        itemCount={2}
        gap={0}
        strategy="fit"
        data-testid="grid"
        aria-label="Chart grid"
        aria-describedby="charts-help"
      >
        <span>1</span>
        <span>2</span>
      </FluidaAdaptiveGrid>,
    );

    const element = getByTestId('grid');
    expect(element.getAttribute('aria-label')).toBe('Chart grid');
    expect(element.getAttribute('aria-describedby')).toBe('charts-help');
  });

  it('renders children in their given order with no tabIndex of its own, for normal keyboard focus order', () => {
    installMockResizeObserver();

    const { getAllByRole } = render(
      <FluidaAdaptiveGrid itemCount={3} gap={0} strategy="fit">
        <button type="button">First</button>
        <button type="button">Second</button>
        <button type="button">Third</button>
      </FluidaAdaptiveGrid>,
    );

    const buttons = getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['First', 'Second', 'Third']);
    for (const button of buttons) {
      expect(button.hasAttribute('tabindex')).toBe(false);
    }
  });

  it('does not attach any keyboard event handler to the container', () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid itemCount={2} gap={0} strategy="fit" data-testid="grid">
        <span>1</span>
        <span>2</span>
      </FluidaAdaptiveGrid>,
    );

    const element = getByTestId('grid');
    expect(element.onkeydown).toBeNull();
    expect(element.onkeyup).toBeNull();
    expect(element.onkeypress).toBeNull();
  });
});

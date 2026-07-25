import { act, cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FluidaAdaptiveGrid } from './FluidaAdaptiveGrid';
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
      <FluidaAdaptiveGrid
        itemCount={1}
        data-testid="grid"
        className="custom-class"
      >
        <span>cell</span>
      </FluidaAdaptiveGrid>,
    );

    expect(getByTestId('grid').className).toBe('custom-class');
  });

  it("applies fit's square cell sizing after a real measurement", () => {
    installMockResizeObserver();
    vi.useFakeTimers();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid
        itemCount={4}
        strategy="fit"
        gap={0}
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

    const columnsMatch = element.style.gridTemplateColumns.match(
      /repeat\((\d+),\s*([\d.]+)px\)/,
    );
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
      <FluidaAdaptiveGrid
        itemCount={4}
        strategy="fit"
        gap={0}
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

      expect(element.style.gridTemplateColumns).toBe(
        'repeat(2, 200px)',
      );
    });

    it('reduces the column count in a narrow container compared to the same container without minItemWidth', () => {
      installMockResizeObserver();
      vi.useFakeTimers();

      const withoutConstraint = render(
        <FluidaAdaptiveGrid
          itemCount={4}
          gap={0}
          strategy="fill"
          data-testid="grid-a"
        >
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

      const columnsWithoutConstraint =
        elementA.style.gridTemplateColumns;

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

      const columnsWithConstraint =
        elementB.style.gridTemplateColumns;

      expect(columnsWithoutConstraint).toBe('repeat(4, 100px)');
      expect(columnsWithConstraint).toBe('repeat(2, 200px)');
    });

    it('keeps the exact current behavior when minItemWidth is not provided', () => {
      installMockResizeObserver();
      vi.useFakeTimers();

      const { getByTestId } = render(
        <FluidaAdaptiveGrid
          itemCount={4}
          strategy="fit"
          gap={0}
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

      expect(element.style.gridTemplateColumns).toBe(
        'repeat(4, 100px)',
      );
      expect(element.style.gridAutoRows).toBe('100px');
    });

    it('propagates FluidaConfigError for an invalid minItemWidth', () => {
      installMockResizeObserver();

      expect(() => {
        render(
          <FluidaAdaptiveGrid
            itemCount={4}
            minItemWidth={0}
            data-testid="grid"
          >
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

    const minHeight = Number.parseFloat(
      getByTestId('grid').style.minHeight,
    );

    expect(minHeight).toBeGreaterThan(0);
  });

  it("lets a consumer's own style.height override the default minHeight", () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid
        itemCount={1}
        data-testid="grid"
        style={{ height: '500px' }}
      >
        <span>cell</span>
      </FluidaAdaptiveGrid>,
    );

    expect(getByTestId('grid').style.height).toBe('500px');
  });

  it("lets a consumer's own style.minHeight override the default", () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid
        itemCount={1}
        data-testid="grid"
        style={{ minHeight: '10px' }}
      >
        <span>cell</span>
      </FluidaAdaptiveGrid>,
    );

    expect(getByTestId('grid').style.minHeight).toBe('10px');
  });
});

describe('itemCount vs. rendered children (development warning)', () => {
  it('warns in development when itemCount does not match the number of children', () => {
    installMockResizeObserver();

    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    render(
      <FluidaAdaptiveGrid itemCount={3}>
        <span>1</span>
        <span>2</span>
      </FluidaAdaptiveGrid>,
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('itemCount={3}');
  });

  it('does not warn when itemCount matches the number of children', () => {
    installMockResizeObserver();

    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

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
});
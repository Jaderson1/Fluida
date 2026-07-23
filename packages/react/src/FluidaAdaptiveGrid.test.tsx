import { act, cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { FluidaAdaptiveGrid } from './FluidaAdaptiveGrid';
import {
  getLiveObserverFor,
  installMockResizeObserver,
  removeMockResizeObserver,
} from './testUtils/mockResizeObserver';

afterEach(() => {
  cleanup();
  removeMockResizeObserver();
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
      <FluidaAdaptiveGrid itemCount={4} ref={ref} data-testid="grid">
        cells
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
      <FluidaAdaptiveGrid itemCount={4} data-testid="grid" className="custom-class">
        cells
      </FluidaAdaptiveGrid>,
    );

    expect(getByTestId('grid').className).toBe('custom-class');
  });

  it("applies fit's square cell sizing after a real measurement", () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid itemCount={4} strategy="fit" gap={0} data-testid="grid">
        cells
      </FluidaAdaptiveGrid>,
    );

    const element = getByTestId('grid');
    const observer = getLiveObserverFor(element);

    act(() => {
      observer?.trigger(400, 100);
    });

    expect(element.style.gridTemplateColumns).toBe('repeat(4, 100px)');
    expect(element.style.gridAutoRows).toBe('100px');
  });

  it('applies a different cell shape for preserve-ratio than for fit, given the same measurement', () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <FluidaAdaptiveGrid
        itemCount={6}
        strategy="preserve-ratio"
        aspectRatio={2}
        gap={0}
        data-testid="grid"
      >
        cells
      </FluidaAdaptiveGrid>,
    );

    const element = getByTestId('grid');
    const observer = getLiveObserverFor(element);

    act(() => {
      observer?.trigger(800, 300);
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

    const { getByTestId } = render(
      <FluidaAdaptiveGrid itemCount={4} strategy="fit" gap={0} data-testid="grid">
        cells
      </FluidaAdaptiveGrid>,
    );

    const element = getByTestId('grid');
    const observer = getLiveObserverFor(element);

    act(() => {
      observer?.trigger(400, 100);
    });
    const before = element.style.gridAutoRows;

    act(() => {
      observer?.trigger(800, 200);
    });
    const after = element.style.gridAutoRows;

    expect(after).not.toBe(before);
  });

  it('throws for an itemCount below 1, via the same FluidaConfigError Core already uses', () => {
    installMockResizeObserver();

    expect(() => {
      render(
        <FluidaAdaptiveGrid itemCount={0} data-testid="grid">
          cells
        </FluidaAdaptiveGrid>,
      );
    }).toThrow();
  });
});
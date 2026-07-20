import { act, cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FluidaGrid } from './FluidaGrid';
import { FluidaProvider } from './FluidaProvider';

function setViewport(width: number, height: number, pixelRatio = 1): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: pixelRatio });
}

function fireResize(): void {
  window.dispatchEvent(new Event('resize'));
}

beforeEach(() => {
  setViewport(390, 800, 1); // mobile: 4 columns
});

afterEach(() => {
  cleanup();
});

describe('FluidaGrid', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <FluidaProvider>
        <FluidaGrid>
          <span>cell</span>
        </FluidaGrid>
      </FluidaProvider>,
    );

    expect(getByText('cell')).toBeTruthy();
  });

  it("applies Core's column count using overflow-safe minmax(0, 1fr) tracks", () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaGrid data-testid="grid">cells</FluidaGrid>
      </FluidaProvider>,
    );

    const element = getByTestId('grid');

    expect(element.style.display).toBe('grid');
    expect(element.style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
  });

  it('does not use a bare 1fr track, which has no overflow protection', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaGrid data-testid="grid">cells</FluidaGrid>
      </FluidaProvider>,
    );

    expect(getByTestId('grid').style.gridTemplateColumns).toMatch(
      /minmax\(0,\s*1fr\)/,
    );
  });

  it('applies gap and width from Core tokens', () => {
    setViewport(320, 600, 1); // exact default minimumWidth: page = minimumPadding = 16
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaGrid data-testid="grid">cells</FluidaGrid>
      </FluidaProvider>,
    );

    const element = getByTestId('grid');
    expect(element.style.gap).toBe('16px');
    expect(element.style.width).toBe('100%');
  });

  it('forwards a ref to the underlying div', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <FluidaProvider>
        <FluidaGrid ref={ref}>cells</FluidaGrid>
      </FluidaProvider>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('updates the column count after a resize that crosses a breakpoint', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaGrid data-testid="grid">cells</FluidaGrid>
      </FluidaProvider>,
    );

    expect(getByTestId('grid').style.gridTemplateColumns).toBe(
      'repeat(4, minmax(0, 1fr))',
    );

    act(() => {
      setViewport(1200, 800, 1); // desktop: 12 columns
      fireResize();
    });

    expect(getByTestId('grid').style.gridTemplateColumns).toBe(
      'repeat(12, minmax(0, 1fr))',
    );
  });
});
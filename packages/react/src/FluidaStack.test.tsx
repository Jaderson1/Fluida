import { act, cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { FluidaProvider } from './FluidaProvider';
import { FluidaStack } from './FluidaStack';

function setViewport(width: number, height: number, pixelRatio = 1): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: pixelRatio });
}

function fireResize(): void {
  window.dispatchEvent(new Event('resize'));
}

afterEach(() => {
  cleanup();
});

describe('FluidaStack', () => {
  it('renders its children', () => {
    setViewport(1024, 768, 1);
    const { getByText } = render(
      <FluidaProvider>
        <FluidaStack>
          <span>item</span>
        </FluidaStack>
      </FluidaProvider>,
    );

    expect(getByText('item')).toBeTruthy();
  });

  it('defaults to column direction', () => {
    setViewport(1024, 768, 1);
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaStack data-testid="stack">item</FluidaStack>
      </FluidaProvider>,
    );

    expect(getByTestId('stack').style.flexDirection).toBe('column');
  });

  it('respects an explicit row direction at a non-mobile breakpoint', () => {
    setViewport(1024, 768, 1);
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaStack data-testid="stack" direction="row">
          item
        </FluidaStack>
      </FluidaProvider>,
    );

    expect(getByTestId('stack').style.flexDirection).toBe('row');
  });

  it("defaults gap to Core's spacing.page token", () => {
    setViewport(320, 600, 1);
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaStack data-testid="stack">item</FluidaStack>
      </FluidaProvider>,
    );

    expect(getByTestId('stack').style.gap).toBe('16px');
  });

  it('lets an explicit gap prop override the Core-derived default', () => {
    setViewport(320, 600, 1);
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaStack data-testid="stack" gap={40}>
          item
        </FluidaStack>
      </FluidaProvider>,
    );

    expect(getByTestId('stack').style.gap).toBe('40px');
  });

  it("forces column direction when stackOnMobile is set and Core's breakpoint is mobile", () => {
    setViewport(390, 800, 1);
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaStack data-testid="stack" direction="row" stackOnMobile>
          item
        </FluidaStack>
      </FluidaProvider>,
    );

    expect(getByTestId('stack').style.flexDirection).toBe('column');
  });

  it('does not force column at a non-mobile breakpoint even with stackOnMobile set', () => {
    setViewport(1200, 800, 1);
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaStack data-testid="stack" direction="row" stackOnMobile>
          item
        </FluidaStack>
      </FluidaProvider>,
    );

    expect(getByTestId('stack').style.flexDirection).toBe('row');
  });

  it('switches direction after a resize crosses into the mobile breakpoint', () => {
    setViewport(1200, 800, 1);
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaStack data-testid="stack" direction="row" stackOnMobile>
          item
        </FluidaStack>
      </FluidaProvider>,
    );

    expect(getByTestId('stack').style.flexDirection).toBe('row');

    act(() => {
      setViewport(390, 800, 1);
      fireResize();
    });

    expect(getByTestId('stack').style.flexDirection).toBe('column');
  });

  it('forwards a ref to the underlying div', () => {
    setViewport(1024, 768, 1);
    const ref = createRef<HTMLDivElement>();

    render(
      <FluidaProvider>
        <FluidaStack ref={ref}>item</FluidaStack>
      </FluidaProvider>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
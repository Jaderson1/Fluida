import { act, cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FluidaContainer } from './FluidaContainer';
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
  setViewport(1024, 768, 1);
});

afterEach(() => {
  cleanup();
});

describe('FluidaContainer', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <FluidaProvider>
        <FluidaContainer>content</FluidaContainer>
      </FluidaProvider>,
    );

    expect(getByText('content')).toBeTruthy();
  });

  it('applies width, max-width, horizontal padding, centering and border-box from Core tokens', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaContainer data-testid="container">content</FluidaContainer>
      </FluidaProvider>,
    );

    const element = getByTestId('container');

    expect(element.style.width).toBe('100%');
    expect(element.style.maxWidth).toBe('960px'); // desktop tier at 1024px
    expect(element.style.paddingLeft).toBe(
      element.style.paddingRight,
    );
    expect(element.style.marginLeft).toBe('auto');
    expect(element.style.marginRight).toBe('auto');
    expect(element.style.boxSizing).toBe('border-box');
  });

  it('forwards a ref to the underlying div', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <FluidaProvider>
        <FluidaContainer ref={ref}>content</FluidaContainer>
      </FluidaProvider>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('forwards standard div props', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaContainer data-testid="container" className="custom-class">
          content
        </FluidaContainer>
      </FluidaProvider>,
    );

    expect(getByTestId('container').className).toBe('custom-class');
  });

  it('lets a consumer override individual style properties', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaContainer data-testid="container" style={{ maxWidth: 500 }}>
          content
        </FluidaContainer>
      </FluidaProvider>,
    );

    expect(getByTestId('container').style.maxWidth).toBe('500px');
  });

  it('updates maxWidth after a resize that crosses a container tier', () => {
    setViewport(320, 600, 1); // mobile container tier: 480
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaContainer data-testid="container">content</FluidaContainer>
      </FluidaProvider>,
    );

    expect(getByTestId('container').style.maxWidth).toBe('480px');

    act(() => {
      setViewport(1536, 900, 1); // widest default container tier: 1320
      fireResize();
    });

    expect(getByTestId('container').style.maxWidth).toBe('1320px');
  });
});
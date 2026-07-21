import { act, cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FluidaProvider } from './FluidaProvider';
import { FluidaText } from './FluidaText';

function setViewport(width: number, height: number, pixelRatio = 1): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: pixelRatio });
}

function fireResize(): void {
  window.dispatchEvent(new Event('resize'));
}

beforeEach(() => {
  setViewport(320, 600, 1); // exact default minimumWidth: scale = 1
});

afterEach(() => {
  cleanup();
});

describe('FluidaText', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <FluidaProvider>
        <FluidaText>content</FluidaText>
      </FluidaProvider>,
    );

    expect(getByText('content')).toBeTruthy();
  });

  it("defaults to a 'p' element", () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaText data-testid="text">content</FluidaText>
      </FluidaProvider>,
    );

    expect(getByTestId('text').tagName).toBe('P');
  });

  it('renders the element requested via the as prop', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaText as="h1" data-testid="text">
          content
        </FluidaText>
      </FluidaProvider>,
    );

    expect(getByTestId('text').tagName).toBe('H1');
  });

  it("applies Core's typography.scale as font-size, in rem", () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaText data-testid="text">content</FluidaText>
      </FluidaProvider>,
    );

    expect(getByTestId('text').style.fontSize).toBe('1rem');
  });

  it('exposes the scale as a --fluida-type-scale custom property', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaText data-testid="text">content</FluidaText>
      </FluidaProvider>,
    );

    expect(
      getByTestId('text').style.getPropertyValue('--fluida-type-scale'),
    ).toBe('1');
  });

  it('forwards a ref to the underlying element', () => {
    const ref = createRef<HTMLElement>();

    render(
      <FluidaProvider>
        <FluidaText ref={ref}>content</FluidaText>
      </FluidaProvider>,
    );

    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });

  it('forwards standard HTML props', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaText data-testid="text" className="custom-class">
          content
        </FluidaText>
      </FluidaProvider>,
    );

    expect(getByTestId('text').className).toBe('custom-class');
  });

  it('lets a consumer override the font-size directly', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaText data-testid="text" style={{ fontSize: '3rem' }}>
          content
        </FluidaText>
      </FluidaProvider>,
    );

    expect(getByTestId('text').style.fontSize).toBe('3rem');
  });

  it('updates font-size after a resize that changes the scale', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaText data-testid="text">content</FluidaText>
      </FluidaProvider>,
    );

    expect(getByTestId('text').style.fontSize).toBe('1rem');

    act(() => {
      setViewport(1440, 900, 1); // exact default maximumWidth: scale = 1.25
      fireResize();
    });

    expect(getByTestId('text').style.fontSize).toBe('1.25rem');
  });
});
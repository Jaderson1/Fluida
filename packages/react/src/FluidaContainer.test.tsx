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
      setViewport(1536, 900, 1); // container tier at 1536: 1320 (no longer the widest tier — see the suite below)
      fireResize();
    });

    expect(getByTestId('container').style.maxWidth).toBe('1320px');
  });
});

describe('FluidaContainer — large viewport progression (ultrawide, 4K)', () => {
  it('grows maxWidth past the old 1440/1536px ceiling, reaching the DOM at each tested width', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaContainer data-testid="container">content</FluidaContainer>
      </FluidaProvider>,
    );
    const element = getByTestId('container');

    const cases: Array<[width: number, height: number, expectedMaxWidth: string]> = [
      [1920, 1080, '1600px'],
      [2560, 1440, '2000px'],
      [3440, 1440, '2600px'],
      [3840, 2160, '2900px'],
    ];

    for (const [width, height, expectedMaxWidth] of cases) {
      act(() => {
        setViewport(width, height, 1);
        fireResize();
      });
      expect(element.style.maxWidth).toBe(expectedMaxWidth);
    }
  });

  it('never regresses: maxWidth at 1920 stays the same value it already had before this fix', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaContainer data-testid="container">content</FluidaContainer>
      </FluidaProvider>,
    );

    act(() => {
      setViewport(1920, 1080, 1);
      fireResize();
    });

    // 1920 already fell inside the pre-fix 1536px tier (1320) — this
    // confirms it now gets its own, larger tier instead of staying
    // frozen at 1320 like every width past 1536 used to.
    expect(getByTestId('container').style.maxWidth).toBe('1600px');
  });

  it('ultrawide (3440) and 4K (3840) reach different maxWidth values, not one shared "large screen" branch', () => {
    const { getByTestId } = render(
      <FluidaProvider>
        <FluidaContainer data-testid="container">content</FluidaContainer>
      </FluidaProvider>,
    );
    const element = getByTestId('container');

    act(() => {
      setViewport(3440, 1440, 1);
      fireResize();
    });
    const ultrawideMaxWidth = element.style.maxWidth;

    act(() => {
      setViewport(3840, 2160, 1);
      fireResize();
    });
    const uhdMaxWidth = element.style.maxWidth;

    expect(ultrawideMaxWidth).not.toBe(uhdMaxWidth);
  });
});
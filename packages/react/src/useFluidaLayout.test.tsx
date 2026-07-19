import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FluidaProvider } from './FluidaProvider';
import { FluidaReactError } from './FluidaContext';
import { useFluidaLayout } from './useFluidaLayout';

function setViewport(width: number, height: number, pixelRatio = 1): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  });
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: pixelRatio,
  });
}

function fireResize(): void {
  window.dispatchEvent(new Event('resize'));
}

function LayoutDebug({ onRender }: { onRender?: () => void }) {
  const layout = useFluidaLayout();
  onRender?.();
  return <span data-testid="breakpoint">{layout.breakpoint}</span>;
}

beforeEach(() => {
  setViewport(390, 800, 1);
});

afterEach(() => {
  cleanup();
});

describe('useFluidaLayout', () => {
  it('throws a FluidaReactError when used outside a FluidaProvider', () => {
    expect(() => render(<LayoutDebug />)).toThrow(FluidaReactError);
  });

  it('reflects the layout derived from the real viewport inside a FluidaProvider', () => {
    render(
      <FluidaProvider>
        <LayoutDebug />
      </FluidaProvider>,
    );

    expect(screen.getByTestId('breakpoint').textContent).toBe('mobile');
  });

  it('updates after a resize that crosses a breakpoint', () => {
    render(
      <FluidaProvider>
        <LayoutDebug />
      </FluidaProvider>,
    );

    expect(screen.getByTestId('breakpoint').textContent).toBe('mobile');

    act(() => {
      setViewport(1200, 800, 1);
      fireResize();
    });

    expect(screen.getByTestId('breakpoint').textContent).toBe('desktop');
  });

  it('does not re-render when only pixelRatio changes', () => {
    const renderSpy = vi.fn();

    render(
      <FluidaProvider>
        <LayoutDebug onRender={renderSpy} />
      </FluidaProvider>,
    );

    const callsBefore = renderSpy.mock.calls.length;

    act(() => {
      setViewport(390, 800, 2);
      fireResize();
    });

    expect(renderSpy.mock.calls.length).toBe(callsBefore);
  });
});
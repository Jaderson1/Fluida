import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FluidaProvider } from './FluidaProvider';
import { FluidaReactError } from './FluidaContext';
import { useFluidaSnapshot } from './useFluidaSnapshot';

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

function SnapshotDebug({ onRender }: { onRender?: () => void }) {
  const snapshot = useFluidaSnapshot();
  onRender?.();
  return <span data-testid="width">{snapshot.width}</span>;
}

beforeEach(() => {
  setViewport(800, 600, 1);
});

afterEach(() => {
  cleanup();
});

describe('useFluidaSnapshot', () => {
  it('throws a FluidaReactError when used outside a FluidaProvider', () => {
    expect(() => render(<SnapshotDebug />)).toThrow(FluidaReactError);
  });

  it('reflects the real viewport inside a FluidaProvider', () => {
    setViewport(1024, 768, 1);

    render(
      <FluidaProvider>
        <SnapshotDebug />
      </FluidaProvider>,
    );

    expect(screen.getByTestId('width').textContent).toBe('1024');
  });

  it('updates after a real resize event', () => {
    render(
      <FluidaProvider>
        <SnapshotDebug />
      </FluidaProvider>,
    );

    expect(screen.getByTestId('width').textContent).toBe('800');

    act(() => {
      setViewport(1200, 800, 1);
      fireResize();
    });

    expect(screen.getByTestId('width').textContent).toBe('1200');
  });

  it('re-renders when only pixelRatio changes', () => {
    const renderSpy = vi.fn();

    render(
      <FluidaProvider>
        <SnapshotDebug onRender={renderSpy} />
      </FluidaProvider>,
    );

    const callsBefore = renderSpy.mock.calls.length;

    act(() => {
      setViewport(800, 600, 2);
      fireResize();
    });

    expect(renderSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
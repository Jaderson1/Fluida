import { act, cleanup, render } from '@testing-library/react';
import { StrictMode, useRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  getLiveObserverFor,
  installMockResizeObserver,
  MockResizeObserver,
  removeMockResizeObserver,
} from './testUtils/mockResizeObserver';
import { useFluidaContainerSize } from './useFluidaContainerSize';

function Probe({ onSize }: { onSize: (size: { width: number; height: number }) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const size = useFluidaContainerSize(ref);
  onSize(size);
  return <div ref={ref} data-testid="probe" />;
}

afterEach(() => {
  cleanup();
  removeMockResizeObserver();
});

describe('useFluidaContainerSize', () => {
  it('starts at width 0, height 0 before any measurement arrives', () => {
    installMockResizeObserver();
    const sizes: Array<{ width: number; height: number }> = [];

    render(<Probe onSize={(size) => sizes.push(size)} />);

    expect(sizes[0]).toEqual({ width: 0, height: 0 });
  });

  it('updates when the observed element is resized', () => {
    installMockResizeObserver();
    const sizes: Array<{ width: number; height: number }> = [];

    const { getByTestId } = render(<Probe onSize={(size) => sizes.push(size)} />);
    const element = getByTestId('probe');

    const observer = getLiveObserverFor(element);
    expect(observer).toBeDefined();

    act(() => {
      observer?.trigger(640, 480);
    });

    expect(sizes.at(-1)).toEqual({ width: 640, height: 480 });
  });

  it('keeps the same reference when triggered with an identical size', () => {
    installMockResizeObserver();
    const sizes: Array<{ width: number; height: number }> = [];

    const { getByTestId } = render(<Probe onSize={(size) => sizes.push(size)} />);
    const element = getByTestId('probe');
    const observer = getLiveObserverFor(element);

    act(() => {
      observer?.trigger(640, 480);
    });
    const first = sizes.at(-1);

    act(() => {
      observer?.trigger(640, 480);
    });
    const second = sizes.at(-1);

    expect(second).toBe(first);
  });

  it('disconnects the observer on unmount', () => {
    installMockResizeObserver();

    const { getByTestId, unmount } = render(
      <Probe onSize={() => {}} />,
    );
    const element = getByTestId('probe');
    const observer = getLiveObserverFor(element);
    expect(observer).toBeDefined();

    unmount();

    expect(observer?.disconnected).toBe(true);
  });

  it('does not throw and stays at the fallback size when ResizeObserver is unavailable', () => {
    expect(typeof ResizeObserver).toBe('undefined');

    const sizes: Array<{ width: number; height: number }> = [];

    expect(() => {
      render(<Probe onSize={(size) => sizes.push(size)} />);
    }).not.toThrow();

    expect(sizes[0]).toEqual({ width: 0, height: 0 });
  });

  it('survives React Strict Mode without leaving more than one live observer on the element', () => {
    installMockResizeObserver();

    const { getByTestId } = render(
      <StrictMode>
        <Probe onSize={() => {}} />
      </StrictMode>,
    );
    const element = getByTestId('probe');

    const liveObservers = getLiveObserverFor(element);
    expect(liveObservers).toBeDefined();

    const stillConnectedCount = MockResizeObserver.instances.filter(
      (instance) => instance.observedElement === element && !instance.disconnected,
    ).length;
    expect(stillConnectedCount).toBe(1);
  });
});
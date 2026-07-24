import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FluidaAdaptiveGrid } from './FluidaAdaptiveGrid';
import {
  installMockResizeObserver,
  removeMockResizeObserver,
} from './testUtils/mockResizeObserver';

afterEach(() => {
  cleanup();
  removeMockResizeObserver();
  vi.restoreAllMocks();
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
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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
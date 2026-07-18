import { describe, expect, it } from 'vitest';

import { computeLayout } from './computeLayout';

describe('computeLayout', () => {
  it('produces the default mobile layout', () => {
    const layout = computeLayout(390);
    expect(layout.breakpoint).toBe('mobile');
    expect(layout.grid.columns).toBe(4);
    expect(layout.spacing.page).toBeGreaterThanOrEqual(16);
    expect(layout.typography.scale).toBeGreaterThanOrEqual(1);
    expect(layout.container.maxWidth).toBe(480);
  });

  it('produces the default tablet layout', () => {
    const layout = computeLayout(800);
    expect(layout.breakpoint).toBe('tablet');
    expect(layout.grid.columns).toBe(8);
    expect(layout.container.maxWidth).toBe(720);
  });

  it('produces the default desktop layout', () => {
    const layout = computeLayout(1200);
    expect(layout.breakpoint).toBe('desktop');
    expect(layout.grid.columns).toBe(12);
    expect(layout.container.maxWidth).toBe(960);
  });

  it('respects custom breakpoints, changing classification versus defaults', () => {
    const layout = computeLayout(650, {
      breakpoints: { mobile: 0, tablet: 600, desktop: 900 },
    });

    expect(layout.breakpoint).toBe('tablet');
    expect(layout.grid.columns).toBe(8);
  });

  it('keeps container tiers independent from column breakpoints', () => {
    const layout = computeLayout(650, {
      breakpoints: { mobile: 0, tablet: 600, desktop: 900 },
    });

    expect(layout.breakpoint).toBe('tablet');
    expect(layout.container.maxWidth).toBe(640); // default container tier for 650px, unaffected by the custom breakpoint
  });

  it('respects custom spacing and typography configuration', () => {
    const config = {
      spacing: { minimumWidth: 300, maximumWidth: 900, minimumPadding: 8, maximumPadding: 24 },
      typography: { minimumWidth: 300, maximumWidth: 900, minimumScale: 0.9, maximumScale: 1.1 },
    };

    expect(computeLayout(300, config).spacing.page).toBe(8);
    expect(computeLayout(900, config).spacing.page).toBe(24);
    expect(computeLayout(600, config).spacing.page).toBeCloseTo(16, 5);

    expect(computeLayout(300, config).typography.scale).toBeCloseTo(0.9, 5);
    expect(computeLayout(900, config).typography.scale).toBeCloseTo(1.1, 5);
    expect(computeLayout(600, config).typography.scale).toBeCloseTo(1.0, 5);
  });

  it('respects a fully custom container configuration', () => {
    const config = {
      container: {
        tiers: [
          { minimumWidth: 0, containerMaxWidth: 400 },
          { minimumWidth: 600, containerMaxWidth: 800 },
        ],
      },
    };

    expect(computeLayout(300, config).container.maxWidth).toBe(400);
    expect(computeLayout(700, config).container.maxWidth).toBe(800);
  });

  it('uses default engine config when none is provided', () => {
    expect(computeLayout(390)).toEqual(computeLayout(390, {}));
  });
});
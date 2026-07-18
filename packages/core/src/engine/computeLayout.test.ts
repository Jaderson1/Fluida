import { describe, expect, it } from 'vitest';

import { computeLayout } from './computeLayout';

describe('computeLayout', () => {
  it('produces the default mobile layout', () => {
    const layout = computeLayout(390);
    expect(layout.breakpoint).toBe('mobile');
    expect(layout.grid.columns).toBe(4);
    expect(layout.spacing.page).toBeGreaterThanOrEqual(16);
    expect(layout.typography.scale).toBeGreaterThanOrEqual(1);
  });

  it('produces the default tablet layout', () => {
    const layout = computeLayout(800);
    expect(layout.breakpoint).toBe('tablet');
    expect(layout.grid.columns).toBe(8);
  });

  it('produces the default desktop layout', () => {
    const layout = computeLayout(1200);
    expect(layout.breakpoint).toBe('desktop');
    expect(layout.grid.columns).toBe(12);
  });

  it('respects custom breakpoints, changing classification versus defaults', () => {
    const layout = computeLayout(650, {
      breakpoints: { mobile: 0, tablet: 600, desktop: 900 },
    });

    // 650px is "mobile" under the default breakpoints (tablet starts
    // at 768) but "tablet" under this custom configuration (tablet
    // starts at 600) — the case that actually proves config is used.
    expect(layout.breakpoint).toBe('tablet');
    expect(layout.grid.columns).toBe(8);
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

  it('uses default engine config when none is provided', () => {
    expect(computeLayout(390)).toEqual(computeLayout(390, {}));
  });
});
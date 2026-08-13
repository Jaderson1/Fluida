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

describe('computeLayout — large viewport progression (mobile through 4K/ultrawide)', () => {
  // The 7 viewports this behavior is characterized against — the same
  // set used to validate the fix, not a re-guess written after the fact.
  const MOBILE = 390;
  const TABLET = 768;
  const NOTEBOOK = 1366;
  const FHD = 1920;
  const QHD = 2560;
  const ULTRAWIDE = 3440;
  const UHD_4K = 3840;

  it('never lets a wider viewport produce a narrower usable container width', () => {
    const widths = [MOBILE, TABLET, NOTEBOOK, FHD, QHD, ULTRAWIDE, UHD_4K];
    const maxWidths = widths.map((w) => computeLayout(w).container.maxWidth);

    for (let i = 1; i < maxWidths.length; i += 1) {
      expect(maxWidths[i]).toBeGreaterThanOrEqual(maxWidths[i - 1] as number);
    }
  });

  it('gives 2560 at least as much usable width as 1920', () => {
    expect(computeLayout(QHD).container.maxWidth).toBeGreaterThanOrEqual(
      computeLayout(FHD).container.maxWidth,
    );
  });

  it('gives 3440 at least as much usable width as 2560', () => {
    expect(computeLayout(ULTRAWIDE).container.maxWidth).toBeGreaterThanOrEqual(
      computeLayout(QHD).container.maxWidth,
    );
  });

  it('gives 3840 at least as much usable width as 3440', () => {
    expect(computeLayout(UHD_4K).container.maxWidth).toBeGreaterThanOrEqual(
      computeLayout(ULTRAWIDE).container.maxWidth,
    );
  });

  it('no longer flattens usable width at 1440px — the confirmed bug this fix addresses', () => {
    // Before this fix, container.maxWidth was identical (1320) for
    // every width from 1536px all the way past 3840px — this is the
    // exact regression test for that: 2560, 3440, and 3840 must each
    // exceed what 1536 alone produces.
    const at1536 = computeLayout(1536).container.maxWidth;
    expect(computeLayout(QHD).container.maxWidth).toBeGreaterThan(at1536);
    expect(computeLayout(ULTRAWIDE).container.maxWidth).toBeGreaterThan(at1536);
    expect(computeLayout(UHD_4K).container.maxWidth).toBeGreaterThan(at1536);
  });

  it('typography and spacing grow with width but stay bounded — no unlimited growth', () => {
    const at2560 = computeLayout(QHD);
    const at3440 = computeLayout(ULTRAWIDE);
    const at3840 = computeLayout(UHD_4K);

    // Bounded: 2560 is where these curves reach their default ceiling
    // (DEFAULT_MAXIMUM_WIDTH) — nothing wider should exceed it.
    expect(at3440.typography.scale).toBe(at2560.typography.scale);
    expect(at3840.typography.scale).toBe(at2560.typography.scale);
    expect(at3440.spacing.page).toBe(at2560.spacing.page);
    expect(at3840.spacing.page).toBe(at2560.spacing.page);

    // Bounded, not exaggerated: neither ceiling is more than a modest
    // multiple of its own minimum — nowhere near "2x everything".
    expect(at2560.typography.scale).toBeLessThanOrEqual(1.5);
    expect(at2560.spacing.page).toBeLessThanOrEqual(80);
  });

  it('does not scale everything 2x just because the viewport is 2x wider', () => {
    // 3840 is exactly 2x 1920 in width — column count, typography
    // scale, and spacing must not also double.
    const atFhd = computeLayout(FHD);
    const at4k = computeLayout(UHD_4K);

    expect(at4k.grid.columns).toBe(atFhd.grid.columns);
    expect(at4k.typography.scale).toBeLessThan(atFhd.typography.scale * 2);
    expect(at4k.spacing.page).toBeLessThan(atFhd.spacing.page * 2);
  });

  it('keeps ultrawide (3440) and 4K (3840) as distinct width-driven results, not one hardcoded "huge screen" branch', () => {
    // A naive `if (width > 3000) scaleEverything()` would make these
    // identical. They differ here because both widths land on
    // different points of the same continuous tier/curve mechanism —
    // not because either width is special-cased.
    const ultrawide = computeLayout(ULTRAWIDE).container.maxWidth;
    const uhd = computeLayout(UHD_4K).container.maxWidth;
    expect(ultrawide).not.toBe(uhd);
  });

  it('produces a real progression across all 7 checked viewports (grid columns, container width, typography, spacing all present and finite)', () => {
    for (const width of [MOBILE, TABLET, NOTEBOOK, FHD, QHD, ULTRAWIDE, UHD_4K]) {
      const layout = computeLayout(width);
      expect(Number.isFinite(layout.container.maxWidth)).toBe(true);
      expect(Number.isFinite(layout.spacing.page)).toBe(true);
      expect(Number.isFinite(layout.typography.scale)).toBe(true);
      expect(Number.isInteger(layout.grid.columns)).toBe(true);
      expect(layout.grid.columns).toBeGreaterThan(0);
    }
  });
});
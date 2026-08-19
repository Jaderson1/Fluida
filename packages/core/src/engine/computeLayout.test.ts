import { describe, expect, it } from 'vitest';

import { computeLayout } from './computeLayout';

// 1080 is the height-bonus floor — passing it keeps every test in
// this first block testing width behavior only, unaffected by the
// height bonus this file's second half is dedicated to.
const NO_HEIGHT_BONUS = 1080;

describe('computeLayout', () => {
  it('produces the default mobile layout', () => {
    const layout = computeLayout(390, NO_HEIGHT_BONUS);
    expect(layout.breakpoint).toBe('mobile');
    expect(layout.grid.columns).toBe(4);
    expect(layout.spacing.page).toBeGreaterThanOrEqual(16);
    expect(layout.typography.scale).toBeGreaterThanOrEqual(1);
    expect(layout.container.maxWidth).toBe(480);
  });

  it('produces the default tablet layout', () => {
    const layout = computeLayout(800, NO_HEIGHT_BONUS);
    expect(layout.breakpoint).toBe('tablet');
    expect(layout.grid.columns).toBe(8);
    expect(layout.container.maxWidth).toBe(720);
  });

  it('produces the default desktop layout', () => {
    const layout = computeLayout(1200, NO_HEIGHT_BONUS);
    expect(layout.breakpoint).toBe('desktop');
    expect(layout.grid.columns).toBe(12);
    expect(layout.container.maxWidth).toBe(960);
  });

  it('respects custom breakpoints, changing classification versus defaults', () => {
    const layout = computeLayout(650, NO_HEIGHT_BONUS, {
      breakpoints: { mobile: 0, tablet: 600, desktop: 900 },
    });

    expect(layout.breakpoint).toBe('tablet');
    expect(layout.grid.columns).toBe(8);
  });

  it('keeps container tiers independent from column breakpoints', () => {
    const layout = computeLayout(650, NO_HEIGHT_BONUS, {
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

    expect(computeLayout(300, NO_HEIGHT_BONUS, config).spacing.page).toBe(8);
    expect(computeLayout(900, NO_HEIGHT_BONUS, config).spacing.page).toBe(24);
    expect(computeLayout(600, NO_HEIGHT_BONUS, config).spacing.page).toBeCloseTo(16, 5);

    expect(computeLayout(300, NO_HEIGHT_BONUS, config).typography.scale).toBeCloseTo(0.9, 5);
    expect(computeLayout(900, NO_HEIGHT_BONUS, config).typography.scale).toBeCloseTo(1.1, 5);
    expect(computeLayout(600, NO_HEIGHT_BONUS, config).typography.scale).toBeCloseTo(1.0, 5);
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

    expect(computeLayout(300, NO_HEIGHT_BONUS, config).container.maxWidth).toBe(400);
    expect(computeLayout(700, NO_HEIGHT_BONUS, config).container.maxWidth).toBe(800);
  });

  it('uses default engine config when none is provided', () => {
    expect(computeLayout(390, NO_HEIGHT_BONUS)).toEqual(computeLayout(390, NO_HEIGHT_BONUS, {}));
  });
});

describe('computeLayout — large viewport progression (mobile through 4K/ultrawide)', () => {
  const MOBILE = 390;
  const TABLET = 768;
  const NOTEBOOK = 1366;
  const FHD = 1920;
  const QHD = 2560;
  const ULTRAWIDE = 3440;
  const UHD_4K = 3840;

  it('never lets a wider viewport produce a narrower usable container width', () => {
    const widths = [MOBILE, TABLET, NOTEBOOK, FHD, QHD, ULTRAWIDE, UHD_4K];
    const maxWidths = widths.map((w) => computeLayout(w, NO_HEIGHT_BONUS).container.maxWidth);

    for (let i = 1; i < maxWidths.length; i += 1) {
      expect(maxWidths[i]).toBeGreaterThanOrEqual(maxWidths[i - 1] as number);
    }
  });

  it('gives 2560 at least as much usable width as 1920', () => {
    expect(computeLayout(QHD, NO_HEIGHT_BONUS).container.maxWidth).toBeGreaterThanOrEqual(
      computeLayout(FHD, NO_HEIGHT_BONUS).container.maxWidth,
    );
  });

  it('gives 3440 at least as much usable width as 2560', () => {
    expect(computeLayout(ULTRAWIDE, NO_HEIGHT_BONUS).container.maxWidth).toBeGreaterThanOrEqual(
      computeLayout(QHD, NO_HEIGHT_BONUS).container.maxWidth,
    );
  });

  it('gives 3840 at least as much usable width as 3440', () => {
    expect(computeLayout(UHD_4K, NO_HEIGHT_BONUS).container.maxWidth).toBeGreaterThanOrEqual(
      computeLayout(ULTRAWIDE, NO_HEIGHT_BONUS).container.maxWidth,
    );
  });

  it('no longer flattens usable width at 1440px — the confirmed bug this fix addresses', () => {
    const at1536 = computeLayout(1536, NO_HEIGHT_BONUS).container.maxWidth;
    expect(computeLayout(QHD, NO_HEIGHT_BONUS).container.maxWidth).toBeGreaterThan(at1536);
    expect(computeLayout(ULTRAWIDE, NO_HEIGHT_BONUS).container.maxWidth).toBeGreaterThan(at1536);
    expect(computeLayout(UHD_4K, NO_HEIGHT_BONUS).container.maxWidth).toBeGreaterThan(at1536);
  });

  it('typography and spacing grow with width but stay bounded — no unlimited growth', () => {
    const at2560 = computeLayout(QHD, NO_HEIGHT_BONUS);
    const at3440 = computeLayout(ULTRAWIDE, NO_HEIGHT_BONUS);
    const at3840 = computeLayout(UHD_4K, NO_HEIGHT_BONUS);

    expect(at3440.typography.scale).toBe(at2560.typography.scale);
    expect(at3840.typography.scale).toBe(at2560.typography.scale);
    expect(at3440.spacing.page).toBe(at2560.spacing.page);
    expect(at3840.spacing.page).toBe(at2560.spacing.page);

    expect(at2560.typography.scale).toBeLessThanOrEqual(1.5);
    expect(at2560.spacing.page).toBeLessThanOrEqual(80);
  });

  it('does not scale everything 2x just because the viewport is 2x wider', () => {
    const atFhd = computeLayout(FHD, NO_HEIGHT_BONUS);
    const at4k = computeLayout(UHD_4K, NO_HEIGHT_BONUS);

    expect(at4k.grid.columns).toBe(atFhd.grid.columns);
    expect(at4k.typography.scale).toBeLessThan(atFhd.typography.scale * 2);
    expect(at4k.spacing.page).toBeLessThan(atFhd.spacing.page * 2);
  });

  it('keeps ultrawide (3440) and 4K (3840) container width as distinct width-driven results, not one hardcoded "huge screen" branch', () => {
    const ultrawide = computeLayout(ULTRAWIDE, NO_HEIGHT_BONUS).container.maxWidth;
    const uhd = computeLayout(UHD_4K, NO_HEIGHT_BONUS).container.maxWidth;
    expect(ultrawide).not.toBe(uhd);
  });

  it('produces a real progression across all 7 checked viewports (grid columns, container width, typography, spacing all present and finite)', () => {
    for (const width of [MOBILE, TABLET, NOTEBOOK, FHD, QHD, ULTRAWIDE, UHD_4K]) {
      const layout = computeLayout(width, NO_HEIGHT_BONUS);
      expect(Number.isFinite(layout.container.maxWidth)).toBe(true);
      expect(Number.isFinite(layout.spacing.page)).toBe(true);
      expect(Number.isFinite(layout.typography.scale)).toBe(true);
      expect(Number.isInteger(layout.grid.columns)).toBe(true);
      expect(layout.grid.columns).toBeGreaterThan(0);
    }
  });
});

describe('computeLayout — height-aware typography/spacing (real device dimensions)', () => {
  it.each([
    ['390x844 (mobile)', 390, 844],
    ['768x1024 (tablet)', 768, 1024],
    ['1366x768 (notebook)', 1366, 768],
    ['1920x800 (short notebook)', 1920, 800],
    ['1920x1080 (FHD)', 1920, 1080],
    ['2560x1440 (QHD)', 2560, 1440],
    ['3440x1440 (ultrawide)', 3440, 1440],
    ['3840x1440 (4K width, ultrawide height)', 3840, 1440],
    ['3840x2160 (4K)', 3840, 2160],
  ])('%s produces finite, sane values', (_label, width, height) => {
    const layout = computeLayout(width, height);
    expect(Number.isFinite(layout.typography.scale)).toBe(true);
    expect(Number.isFinite(layout.spacing.page)).toBe(true);
    expect(layout.typography.scale).toBeGreaterThanOrEqual(1);
    expect(layout.spacing.page).toBeGreaterThanOrEqual(16);
  });

  it('container.maxWidth is identical between 3840x1440 and 3840x2160 — height never touches it', () => {
    const ultrawideHeight = computeLayout(3840, 1440);
    const uhd = computeLayout(3840, 2160);
    expect(ultrawideHeight.container.maxWidth).toBe(uhd.container.maxWidth);
    expect(ultrawideHeight.container.maxWidth).toBe(2900); // the width-only tier value, unchanged by this fix
  });

  it('typography and spacing differ moderately between 3840x1440 and 3840x2160', () => {
    const ultrawideHeight = computeLayout(3840, 1440);
    const uhd = computeLayout(3840, 2160);

    expect(uhd.typography.scale).toBeGreaterThan(ultrawideHeight.typography.scale);
    expect(uhd.spacing.page).toBeGreaterThan(ultrawideHeight.spacing.page);

    expect(uhd.typography.scale - ultrawideHeight.typography.scale).toBeLessThanOrEqual(0.08);
    expect(uhd.spacing.page - ultrawideHeight.spacing.page).toBeLessThanOrEqual(12);
  });

  it('2560x1440 and 3440x1440 receive the same typography/spacing — same height, same bonus', () => {
    const qhd = computeLayout(2560, 1440);
    const ultrawide = computeLayout(3440, 1440);
    expect(qhd.typography.scale).toBe(ultrawide.typography.scale);
    expect(qhd.spacing.page).toBe(ultrawide.spacing.page);
    expect(qhd.container.maxWidth).not.toBe(ultrawide.container.maxWidth);
  });

  it('1080p receives no height bonus — exact parity with the pre-height-aware value', () => {
    const fhd = computeLayout(1920, 1080);
    const fhdNoBonus = computeLayout(1920, 0);
    expect(fhd.typography.scale).toBe(fhdNoBonus.typography.scale);
    expect(fhd.spacing.page).toBe(fhdNoBonus.spacing.page);
  });

  it('a short, wide notebook screen (1920x800) receives no height bonus', () => {
    const shortNotebook = computeLayout(1920, 800);
    const fhd = computeLayout(1920, 1080);
    expect(shortNotebook.typography.scale).toBe(fhd.typography.scale);
    expect(shortNotebook.spacing.page).toBe(fhd.spacing.page);
  });

  it('same width, increasing height, never decreases typography or spacing', () => {
    const heights = [800, 1080, 1400];
    const results = heights.map((h) => computeLayout(1920, h));

    for (let i = 1; i < results.length; i += 1) {
      const current = results[i] as ReturnType<typeof computeLayout>;
      const previous = results[i - 1] as ReturnType<typeof computeLayout>;
      expect(current.typography.scale).toBeGreaterThanOrEqual(previous.typography.scale);
      expect(current.spacing.page).toBeGreaterThanOrEqual(previous.spacing.page);
    }
  });

  it('same height, increasing width, never decreases container width', () => {
    const widths = [1920, 3440, 3840];
    const results = widths.map((w) => computeLayout(w, 1440));

    for (let i = 1; i < results.length; i += 1) {
      const current = results[i] as ReturnType<typeof computeLayout>;
      const previous = results[i - 1] as ReturnType<typeof computeLayout>;
      expect(current.container.maxWidth).toBeGreaterThanOrEqual(previous.container.maxWidth);
    }
  });

  it('mobile portrait never receives a bonus for being tall relative to its own width', () => {
    const mobile = computeLayout(390, 844);
    const mobileTaller = computeLayout(390, 2000);
    expect(mobile.typography.scale).toBe(mobileTaller.typography.scale);
    expect(mobile.spacing.page).toBe(mobileTaller.spacing.page);
  });

  it('does not grow past the bonus ceiling for any height beyond 2160', () => {
    const uhd = computeLayout(3840, 2160);
    const beyondUhd = computeLayout(3840, 4000);
    expect(uhd.typography.scale).toBe(beyondUhd.typography.scale);
    expect(uhd.spacing.page).toBe(beyondUhd.spacing.page);
  });
});

describe('computeLayout — display (integration)', () => {
  it.each([
    ['390x844 (mobile)', 390, 844, 'compact'],
    ['768x1024 (tablet)', 768, 1024, 'compact'],
    ['1366x768 (notebook)', 1366, 768, 'standard'],
    ['1920x800 (short notebook)', 1920, 800, 'large'],
    ['1920x1080 (FHD)', 1920, 1080, 'large'],
    ['2560x1440 (QHD)', 2560, 1440, 'large'],
    ['3440x1440 (ultrawide)', 3440, 1440, 'large'],
    ['3840x1440 (4K width, ultrawide height)', 3840, 1440, 'large'],
    ['3840x2160 (4K)', 3840, 2160, 'ultra'],
  ] as const)('%s -> display = %s', (_label, width, height, expected) => {
    expect(computeLayout(width, height).display).toBe(expected);
  });

  it('3440x1440 and 3840x2160 are not the same display class — width alone never decides ultra', () => {
    expect(computeLayout(3440, 1440).display).not.toBe(computeLayout(3840, 2160).display);
  });

  it('a very wide but short viewport never reaches ultra from width alone', () => {
    expect(computeLayout(10000, 800).display).toBe('large');
  });

  describe('boundary transitions at width=1920, height=1080, height=2160', () => {
    it('width 1919 -> 1920 at a height below the bonus floor: standard -> large', () => {
      expect(computeLayout(1919, 800).display).toBe('standard');
      expect(computeLayout(1920, 800).display).toBe('large');
    });

    it('height crossing 1080 does not change display — 1080 is the height-bonus floor, not a display-class boundary', () => {
      expect(computeLayout(1920, 1079).display).toBe('large');
      expect(computeLayout(1920, 1080).display).toBe('large');
      expect(computeLayout(1920, 1081).display).toBe('large');
    });

    it('height 2159 -> 2160 at a qualifying width: large -> ultra', () => {
      expect(computeLayout(1920, 2159).display).toBe('large');
      expect(computeLayout(1920, 2160).display).toBe('ultra');
    });
  });

  it('display never regresses to a lower class as width grows at a fixed height, and never flickers back at higher widths', () => {
    const order: Record<string, number> = { compact: 0, standard: 1, large: 2, ultra: 3 };
    const widths = [390, 768, 1366, 1920, 2560, 3440, 3840];
    let previousRank = -1;
    for (const width of widths) {
      const rank = order[computeLayout(width, 2160).display] as number;
      expect(rank).toBeGreaterThanOrEqual(previousRank);
      previousRank = rank;
    }
  });
});

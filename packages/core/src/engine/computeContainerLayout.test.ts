import { describe, expect, it } from 'vitest';

import { FluidaConfigError } from '../resolveFluidaConfig';
import { computeContainerLayout } from './computeContainerLayout';

describe('computeContainerLayout', () => {
  it('defaults to the fit strategy, gap 16, aspectRatio 1', () => {
    const withDefaults = computeContainerLayout(800, 600, { itemCount: 8 });
    const explicit = computeContainerLayout(800, 600, {
      itemCount: 8,
      strategy: 'fit',
      gap: 16,
      aspectRatio: 1,
    });

    expect(withDefaults).toEqual(explicit);
  });

  it('fit produces square cells that fit within the container', () => {
    const result = computeContainerLayout(800, 600, { itemCount: 8, strategy: 'fit' });

    expect(result.cellWidth).toBe(result.cellHeight);

    const gridWidth = result.columns * result.cellWidth + (result.columns - 1) * 16;
    const gridHeight = result.rows * result.cellHeight + (result.rows - 1) * 16;
    expect(gridWidth).toBeLessThanOrEqual(800 + 1e-9);
    expect(gridHeight).toBeLessThanOrEqual(600 + 1e-9);
  });

  it('fit lays out enough cells for every item', () => {
    const result = computeContainerLayout(800, 600, { itemCount: 8, strategy: 'fit' });
    expect(result.columns * result.rows).toBeGreaterThanOrEqual(8);
  });

  it('fill uses exactly the available space in both axes, even if the cell is not square', () => {
    const result = computeContainerLayout(800, 600, { itemCount: 8, strategy: 'fill' });

    const gridWidth = result.columns * result.cellWidth + (result.columns - 1) * 16;
    const gridHeight = result.rows * result.cellHeight + (result.rows - 1) * 16;

    expect(gridWidth).toBeCloseTo(800, 5);
    expect(gridHeight).toBeCloseTo(600, 5);
  });

  it('preserve-ratio keeps the exact configured aspect ratio', () => {
    const result = computeContainerLayout(800, 600, {
      itemCount: 6,
      strategy: 'preserve-ratio',
      aspectRatio: 2,
    });

    expect(result.cellWidth / result.cellHeight).toBeCloseTo(2, 5);
  });

  it('balanced sits between fit (the smaller, square size) and fill (the larger dimension)', () => {
    const fit = computeContainerLayout(900, 500, { itemCount: 5, strategy: 'fit' });
    const fill = computeContainerLayout(900, 500, { itemCount: 5, strategy: 'fill' });
    const balanced = computeContainerLayout(900, 500, { itemCount: 5, strategy: 'balanced' });

    expect(fill.cellWidth).not.toBeCloseTo(fill.cellHeight, 2);

    expect(balanced.cellWidth).toBe(balanced.cellHeight);
    expect(balanced.cellWidth).toBeGreaterThanOrEqual(fit.cellWidth - 1e-9);
    expect(balanced.cellWidth).toBeLessThanOrEqual(
      Math.max(fill.cellWidth, fill.cellHeight) + 1e-9,
    );
  });

  it('chooses the column count that minimizes cell distortion, verified against a hand-computed case', () => {
    const result = computeContainerLayout(400, 100, {
      itemCount: 4,
      strategy: 'fill',
      gap: 0,
    });

    expect(result.columns).toBe(4);
    expect(result.rows).toBe(1);
    expect(result.cellWidth).toBeCloseTo(100, 5);
    expect(result.cellHeight).toBeCloseTo(100, 5);
  });

  it('returns a single zero-size column when the container has no measured size yet', () => {
    const result = computeContainerLayout(0, 0, { itemCount: 8 });

    expect(result).toEqual({ columns: 1, rows: 8, cellWidth: 0, cellHeight: 0 });
  });

  it('throws FluidaConfigError for itemCount below 1', () => {
    expect(() => computeContainerLayout(800, 600, { itemCount: 0 })).toThrow(
      FluidaConfigError,
    );
  });

  it('throws FluidaConfigError for a negative gap', () => {
    expect(() =>
      computeContainerLayout(800, 600, { itemCount: 4, gap: -1 }),
    ).toThrow(FluidaConfigError);
  });

  it('throws FluidaConfigError for a non-positive aspectRatio', () => {
    expect(() =>
      computeContainerLayout(800, 600, {
        itemCount: 4,
        strategy: 'preserve-ratio',
        aspectRatio: 0,
      }),
    ).toThrow(FluidaConfigError);
  });

  describe('minItemWidth', () => {
    it('leaves behavior exactly unchanged when omitted', () => {
      const withoutOption = computeContainerLayout(400, 100, {
        itemCount: 4,
        gap: 0,
        strategy: 'fill',
      });
      const withUndefined = computeContainerLayout(400, 100, {
        itemCount: 4,
        gap: 0,
        strategy: 'fill',
        minItemWidth: undefined,
      });

      expect(withUndefined).toEqual(withoutOption);
      expect(withoutOption).toEqual({ columns: 4, rows: 1, cellWidth: 100, cellHeight: 100 });
    });

    it('forces fewer columns when the minimum width demands it', () => {
      // Without minItemWidth, 4 columns of 100px each is the fill
      // answer (verified by the test above). 150 rules 4 out (100 
      // 150) and 3 out (~133.33 < 150), leaving 2 columns of 200px
      // as the widest still-eligible option.
      const result = computeContainerLayout(400, 100, {
        itemCount: 4,
        gap: 0,
        strategy: 'fill',
        minItemWidth: 150,
      });

      expect(result).toEqual({ columns: 2, rows: 2, cellWidth: 200, cellHeight: 50 });
    });

    it('accounts for gap when checking a candidate against minItemWidth', () => {
      // 6 items, 1200px wide, gap 16: 5 columns would need
      // (1200 - 4*16) / 5 = 227.2px per cell — below 280 — so 5
      // columns must be excluded, and 4 columns (288px, comfortably
      // over 280) is what's left to win.
      const result = computeContainerLayout(1200, 600, {
        itemCount: 6,
        gap: 16,
        minItemWidth: 280,
      });

      expect(result.columns).toBe(4);
      expect(result.cellWidth).toBeGreaterThanOrEqual(280);
    });

    it('falls back to the standard not-yet-fitting shape when no column count reaches minItemWidth', () => {
      const result = computeContainerLayout(400, 100, {
        itemCount: 4,
        gap: 0,
        minItemWidth: 10000,
      });

      expect(result).toEqual({ columns: 1, rows: 4, cellWidth: 0, cellHeight: 0 });
    });

    it('throws FluidaConfigError for minItemWidth of 0', () => {
      expect(() =>
        computeContainerLayout(800, 600, { itemCount: 4, minItemWidth: 0 }),
      ).toThrow(FluidaConfigError);
    });

    it('throws FluidaConfigError for a negative minItemWidth', () => {
      expect(() =>
        computeContainerLayout(800, 600, { itemCount: 4, minItemWidth: -50 }),
      ).toThrow(FluidaConfigError);
    });

    it('throws FluidaConfigError for a NaN minItemWidth', () => {
      expect(() =>
        computeContainerLayout(800, 600, { itemCount: 4, minItemWidth: Number.NaN }),
      ).toThrow(FluidaConfigError);
    });

    it('throws FluidaConfigError for an Infinity minItemWidth', () => {
      expect(() =>
        computeContainerLayout(800, 600, {
          itemCount: 4,
          minItemWidth: Number.POSITIVE_INFINITY,
        }),
      ).toThrow(FluidaConfigError);
    });

    it("interacts with the 'fit' strategy: fit still squares off whatever candidate minItemWidth left eligible", () => {
      const result = computeContainerLayout(400, 100, {
        itemCount: 4,
        gap: 0,
        strategy: 'fit',
        minItemWidth: 150,
      });

      // Same eligible candidate as the fill test above (2 columns,
      // 200x50) — 'fit' then squares it to the smaller dimension.
      expect(result.columns).toBe(2);
      expect(result.cellWidth).toBe(result.cellHeight);
      expect(result.cellWidth).toBe(50);
    });

    it("interacts with 'preserve-ratio': the aspect ratio is honored on top of the minItemWidth-filtered candidate", () => {
      const result = computeContainerLayout(400, 100, {
        itemCount: 4,
        gap: 0,
        strategy: 'preserve-ratio',
        aspectRatio: 2,
        minItemWidth: 150,
      });

      expect(result.columns).toBe(2);
      expect(result.cellWidth / result.cellHeight).toBeCloseTo(2, 5);
    });
  });

  describe('auto-height (containerHeight omitted)', () => {
    it('throws FluidaConfigError for fill without a known height', () => {
      expect(() =>
        computeContainerLayout(1200, undefined, { itemCount: 6, strategy: 'fill' }),
      ).toThrow(FluidaConfigError);
    });

    it('throws FluidaConfigError for balanced without a known height', () => {
      expect(() =>
        computeContainerLayout(1200, undefined, { itemCount: 6, strategy: 'balanced' }),
      ).toThrow(FluidaConfigError);
    });

    it('throws FluidaConfigError for fit without a known height and without minItemWidth', () => {
      expect(() =>
        computeContainerLayout(1200, undefined, { itemCount: 6, strategy: 'fit' }),
      ).toThrow(FluidaConfigError);
    });

    it('throws FluidaConfigError for preserve-ratio without a known height and without minItemWidth', () => {
      expect(() =>
        computeContainerLayout(1200, undefined, {
          itemCount: 6,
          strategy: 'preserve-ratio',
          aspectRatio: 2,
        }),
      ).toThrow(FluidaConfigError);
    });

    it('fit without height, with minItemWidth: correct columns, square cells, independent of any external height', () => {
      const result = computeContainerLayout(1200, undefined, {
        itemCount: 6,
        gap: 16,
        strategy: 'fit',
        minItemWidth: 280,
      });

      // Same columns/cellWidth as the height-aware conformance case
      // for these exact numbers (1200, gap 16, minItemWidth 280,
      // itemCount 6) — verified in spec/conformance/layout-cases.json
      // — confirming the width-only path agrees with the height-aware
      // one whenever both are applicable.
      expect(result.columns).toBe(4);
      expect(result.rows).toBe(2);
      expect(result.cellWidth).toBe(288);
      expect(result.cellHeight).toBe(result.cellWidth);
    });

    it('preserve-ratio without height, with minItemWidth: correct columns, exact aspect ratio', () => {
      const result = computeContainerLayout(1200, undefined, {
        itemCount: 6,
        gap: 16,
        strategy: 'preserve-ratio',
        aspectRatio: 2,
        minItemWidth: 280,
      });

      expect(result.columns).toBe(4);
      expect(result.cellWidth).toBe(288);
      expect(result.cellHeight).toBe(144);
      expect(result.cellWidth / result.cellHeight).toBeCloseTo(2, 10);
    });

    it('never chooses more columns than itemCount, even when width would allow it', () => {
      const result = computeContainerLayout(2000, undefined, {
        itemCount: 3,
        gap: 16,
        strategy: 'fit',
        minItemWidth: 100,
      });

      expect(result.columns).toBe(3);
      expect(result.rows).toBe(1);
    });

    it('accepts a column count whose cellWidth equals minItemWidth exactly', () => {
      // 1000 / 5 columns, gap 0 = exactly 200 per cell, no remainder.
      const result = computeContainerLayout(1000, undefined, {
        itemCount: 5,
        gap: 0,
        strategy: 'fit',
        minItemWidth: 200,
      });

      expect(result.columns).toBe(5);
      expect(result.cellWidth).toBe(200);
    });

    it('drops to one fewer column when width falls even slightly short of the threshold', () => {
      // One pixel narrower than the exact-fit case above — 5 columns
      // would need exactly 200 each; 999 no longer reaches that.
      const result = computeContainerLayout(999, undefined, {
        itemCount: 5,
        gap: 0,
        strategy: 'fit',
        minItemWidth: 200,
      });

      expect(result.columns).toBe(4);
      expect(result.cellWidth).toBeCloseTo(249.75, 5);
    });

    it('still validates itemCount the same way as the height-aware path', () => {
      expect(() =>
        computeContainerLayout(1200, undefined, {
          itemCount: 0,
          strategy: 'fit',
          minItemWidth: 280,
        }),
      ).toThrow(FluidaConfigError);
    });

    it('computes correctly with a large gap', () => {
      const result = computeContainerLayout(1200, undefined, {
        itemCount: 4,
        gap: 200,
        strategy: 'fit',
        minItemWidth: 100,
      });

      expect(result.columns).toBe(4);
      expect(result.cellWidth).toBe(150);
      expect(result.cellHeight).toBe(150);
    });

    it('still validates aspectRatio the same way as the height-aware path', () => {
      expect(() =>
        computeContainerLayout(1200, undefined, {
          itemCount: 6,
          strategy: 'preserve-ratio',
          aspectRatio: 0,
          minItemWidth: 100,
        }),
      ).toThrow(FluidaConfigError);
    });

    it('falls back to the same not-yet-fitting shape when minItemWidth is impossible at this width', () => {
      const result = computeContainerLayout(100, undefined, {
        itemCount: 4,
        gap: 16,
        strategy: 'fit',
        minItemWidth: 10000,
      });

      expect(result.columns).toBe(1);
      expect(result.rows).toBe(4);
      expect(result.cellWidth).toBe(0);
      expect(result.cellHeight).toBe(0);
    });
  });
});
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

  describe('balanced', () => {
    function assertWithinBounds(
      result: { columns: number; rows: number; cellWidth: number; cellHeight: number },
      containerWidth: number,
      containerHeight: number,
      gap: number,
    ) {
      const totalGridWidth = result.columns * result.cellWidth + (result.columns - 1) * gap;
      const totalGridHeight = result.rows * result.cellHeight + (result.rows - 1) * gap;
      const tolerance = 1e-9;

      expect(Number.isInteger(result.columns)).toBe(true);
      expect(Number.isInteger(result.rows)).toBe(true);
      expect(result.columns).toBeGreaterThan(0);
      expect(result.rows).toBeGreaterThan(0);
      expect(totalGridWidth).toBeLessThanOrEqual(containerWidth + tolerance);
      expect(totalGridHeight).toBeLessThanOrEqual(containerHeight + tolerance);
      expect(Number.isFinite(result.cellWidth)).toBe(true);
      expect(Number.isFinite(result.cellHeight)).toBe(true);
      expect(result.cellWidth).toBeGreaterThanOrEqual(0);
      expect(result.cellHeight).toBeGreaterThanOrEqual(0);
    }

    it('a wide, short container never lets total height exceed the container (hand-computed)', () => {
      const result = computeContainerLayout(1000, 100, {
        itemCount: 3,
        strategy: 'balanced',
        gap: 0,
      });
      expect(result.columns).toBe(3);
      expect(result.cellWidth).toBeCloseTo(182.574, 3);
      expect(result.cellHeight).toBe(100);
      assertWithinBounds(result, 1000, 100, 0);
    });

    it('a narrow, tall container never lets total width exceed the container (hand-computed)', () => {
      const result = computeContainerLayout(100, 1000, {
        itemCount: 3,
        strategy: 'balanced',
        gap: 0,
      });
      expect(result.columns).toBe(1);
      expect(result.cellWidth).toBe(100);
      expect(result.cellHeight).toBeCloseTo(182.574, 3);
      assertWithinBounds(result, 100, 1000, 0);
    });

    it('a square container needs no correction — balanced equals fit equals fill (hand-computed)', () => {
      const balanced = computeContainerLayout(600, 600, {
        itemCount: 4,
        strategy: 'balanced',
        gap: 0,
      });
      const fit = computeContainerLayout(600, 600, { itemCount: 4, strategy: 'fit', gap: 0 });
      const fill = computeContainerLayout(600, 600, { itemCount: 4, strategy: 'fill', gap: 0 });
      expect(balanced.cellWidth).toBe(300);
      expect(balanced.cellHeight).toBe(300);
      expect(balanced).toEqual(fit);
      expect(balanced).toEqual(fill);
      assertWithinBounds(balanced, 600, 600, 0);
    });

    it('is strictly between fit and fill on whichever axis fill actually distorts', () => {
      const fit = computeContainerLayout(900, 500, { itemCount: 5, strategy: 'fit' });
      const fill = computeContainerLayout(900, 500, { itemCount: 5, strategy: 'fill' });
      const balanced = computeContainerLayout(900, 500, { itemCount: 5, strategy: 'balanced' });

      // width is already the smaller (constraining) base dimension here,
      // so it comes back unchanged; height is the one fill stretched,
      // and balanced pulls it partway back toward fit's square value.
      expect(fill.cellWidth).toBe(fit.cellWidth);
      expect(fill.cellHeight).toBeGreaterThan(fit.cellHeight);

      expect(balanced.cellWidth).toBe(fit.cellWidth);
      expect(balanced.cellHeight).toBeGreaterThan(fit.cellHeight);
      expect(balanced.cellHeight).toBeLessThan(fill.cellHeight);
      assertWithinBounds(balanced, 900, 500, 16);
    });

    it('respects minItemWidth as a column-selection filter the same way fit does', () => {
      // minItemWidth filters which column count is eligible before any
      // strategy transforms the cell — it does not re-clamp the final
      // cell afterward. fit has the same property: its own min(width,
      // height) can also land below minItemWidth when height is the
      // smaller axis, exactly as shown here for comparison.
      const fit = computeContainerLayout(1200, 300, {
        itemCount: 6,
        strategy: 'fit',
        gap: 16,
        minItemWidth: 280,
      });
      const result = computeContainerLayout(1200, 300, {
        itemCount: 6,
        strategy: 'balanced',
        gap: 16,
        minItemWidth: 280,
      });
      expect(result.columns).toBe(fit.columns);
      expect(result.cellHeight).toBe(fit.cellHeight);
      assertWithinBounds(result, 1200, 300, 16);
    });

    it('produces the same column count as fluida-core (Python) for the same inputs', () => {
      // Cross-checked manually against python/fluida-core's own balanced
      // test for the same numbers — both implementations use the same
      // geometric-mean-with-fitSize construction.
      const result = computeContainerLayout(900, 500, {
        itemCount: 5,
        strategy: 'balanced',
        gap: 16,
      });
      expect(result.columns).toBe(4);
      expect(result.rows).toBe(2);
    });

    it('never exceeds bounds for a small container', () => {
      const result = computeContainerLayout(40, 25, { itemCount: 3, strategy: 'balanced', gap: 2 });
      assertWithinBounds(result, 40, 25, 2);
    });

    it('never exceeds bounds for an asymmetric container', () => {
      const result = computeContainerLayout(1920, 250, {
        itemCount: 7,
        strategy: 'balanced',
        gap: 8,
      });
      assertWithinBounds(result, 1920, 250, 8);
    });

    it('never exceeds bounds for a prime itemCount', () => {
      const result = computeContainerLayout(777, 333, {
        itemCount: 7,
        strategy: 'balanced',
        gap: 10,
      });
      assertWithinBounds(result, 777, 333, 10);
      expect(result.columns * result.rows).toBeGreaterThanOrEqual(7);
    });

    it('never exceeds bounds with gap 0', () => {
      const result = computeContainerLayout(500, 300, {
        itemCount: 6,
        strategy: 'balanced',
        gap: 0,
      });
      assertWithinBounds(result, 500, 300, 0);
    });

    it('never exceeds bounds with a large gap relative to the container', () => {
      const result = computeContainerLayout(500, 300, {
        itemCount: 6,
        strategy: 'balanced',
        gap: 60,
      });
      assertWithinBounds(result, 500, 300, 60);
    });

    it('handles a single item without exceeding bounds', () => {
      const result = computeContainerLayout(300, 900, {
        itemCount: 1,
        strategy: 'balanced',
        gap: 16,
      });
      assertWithinBounds(result, 300, 900, 16);
    });
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
    expect(() => computeContainerLayout(800, 600, { itemCount: 0 })).toThrow(FluidaConfigError);
  });

  it('throws FluidaConfigError for a negative gap', () => {
    expect(() => computeContainerLayout(800, 600, { itemCount: 4, gap: -1 })).toThrow(
      FluidaConfigError,
    );
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
      expect(() => computeContainerLayout(800, 600, { itemCount: 4, minItemWidth: 0 })).toThrow(
        FluidaConfigError,
      );
    });

    it('throws FluidaConfigError for a negative minItemWidth', () => {
      expect(() => computeContainerLayout(800, 600, { itemCount: 4, minItemWidth: -50 })).toThrow(
        FluidaConfigError,
      );
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

  describe('itemCount contract', () => {
    it('accepts 1 as the smallest valid value', () => {
      expect(() => computeContainerLayout(500, 500, { itemCount: 1 })).not.toThrow();
    });

    it('accepts a larger integer', () => {
      expect(() => computeContainerLayout(500, 500, { itemCount: 50 })).not.toThrow();
    });

    it.each([
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      -Infinity,
      '4' as unknown as number,
      true as unknown as number,
    ])('rejects %p', (value) => {
      expect(() => computeContainerLayout(500, 500, { itemCount: value })).toThrow(
        FluidaConfigError,
      );
    });

    it('always returns integer rows and columns', () => {
      const result = computeContainerLayout(500, 500, { itemCount: 7 });
      expect(Number.isInteger(result.rows)).toBe(true);
      expect(Number.isInteger(result.columns)).toBe(true);
    });
  });

  describe('dimension validation', () => {
    it('accepts 0 as containerWidth (not yet measured)', () => {
      expect(() => computeContainerLayout(0, 500, { itemCount: 4 })).not.toThrow();
    });

    it.each([NaN, Infinity, -Infinity, -1])('rejects containerWidth of %p', (value) => {
      expect(() => computeContainerLayout(value, 500, { itemCount: 4 })).toThrow(FluidaConfigError);
    });

    it.each([NaN, Infinity, -Infinity, -1])(
      'rejects containerHeight of %p when provided',
      (value) => {
        expect(() => computeContainerLayout(500, value, { itemCount: 4 })).toThrow(
          FluidaConfigError,
        );
      },
    );

    it('still allows containerHeight to be omitted (auto-height)', () => {
      expect(() =>
        computeContainerLayout(500, undefined, {
          itemCount: 4,
          strategy: 'fit',
          minItemWidth: 100,
        }),
      ).not.toThrow();
    });
  });

  describe('strategy validation', () => {
    it.each(['fill', 'fit', 'balanced', 'preserve-ratio'] as const)('accepts %s', (strategy) => {
      expect(() => computeContainerLayout(500, 500, { itemCount: 4, strategy })).not.toThrow();
    });

    it('rejects an unrecognized strategy instead of falling back to fill', () => {
      expect(() =>
        computeContainerLayout(500, 500, {
          itemCount: 4,
          strategy: 'not-a-real-strategy' as never,
        }),
      ).toThrow(FluidaConfigError);
    });
  });

  describe('balanced — property-based coverage', () => {
    // mulberry32: a small, deterministic PRNG — not cryptographic, not
    // imported from anywhere, just enough to generate the same 200
    // "random" cases on every run, in every environment, forever.
    // Property-based testing needs reproducibility as much as it
    // needs variety; a seed pinned in source code is what guarantees
    // a failure here is reproducible by anyone, not a one-off flake.
    function mulberry32(seed: number): () => number {
      let a = seed;
      return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    const SEED = 20260804;
    const CASE_COUNT = 200;
    const rand = mulberry32(SEED);

    interface RandomCase {
      readonly containerWidth: number;
      readonly containerHeight: number;
      readonly itemCount: number;
      readonly gap: number;
    }

    function randomCase(): RandomCase {
      return {
        containerWidth: 10 + rand() * 3990, // 10..4000
        containerHeight: 10 + rand() * 3990,
        itemCount: 1 + Math.floor(rand() * 60), // 1..60
        gap: rand() * 100, // 0..100
      };
    }

    const cases: RandomCase[] = Array.from({ length: CASE_COUNT }, randomCase);

    it.each(cases.map((c, i) => [i, c] as const))('case %i stays within bounds and never exceeds fill', (_i, testCase) => {
      const { containerWidth, containerHeight, itemCount, gap } = testCase;

      const balanced = computeContainerLayout(containerWidth, containerHeight, {
        itemCount,
        strategy: 'balanced',
        gap,
      });
      const fill = computeContainerLayout(containerWidth, containerHeight, {
        itemCount,
        strategy: 'fill',
        gap,
      });

      expect(Number.isFinite(balanced.cellWidth)).toBe(true);
      expect(Number.isFinite(balanced.cellHeight)).toBe(true);
      expect(Number.isInteger(balanced.rows)).toBe(true);
      expect(Number.isInteger(balanced.columns)).toBe(true);
      expect(balanced.rows).toBeGreaterThan(0);
      expect(balanced.columns).toBeGreaterThan(0);
      expect(balanced.rows * balanced.columns).toBeGreaterThanOrEqual(itemCount);

      const tolerance = 1e-6;
      const totalGridWidth = balanced.columns * balanced.cellWidth + (balanced.columns - 1) * gap;
      const totalGridHeight = balanced.rows * balanced.cellHeight + (balanced.rows - 1) * gap;

      // Only meaningful once something actually fits — the degenerate
      // zero-size fallback is covered by its own tests elsewhere and
      // trivially satisfies every bound here regardless.
      if (balanced.cellWidth > 0) {
        expect(totalGridWidth).toBeLessThanOrEqual(containerWidth + tolerance);
        expect(balanced.cellWidth).toBeLessThanOrEqual(fill.cellWidth + tolerance);
      }
      if (balanced.cellHeight > 0) {
        expect(totalGridHeight).toBeLessThanOrEqual(containerHeight + tolerance);
        expect(balanced.cellHeight).toBeLessThanOrEqual(fill.cellHeight + tolerance);
      }
    });
  });
});

describe('extreme container widths (0 through 10000)', () => {
  const EXTREME_WIDTHS = [0, 1, 10, 100, 320, 768, 1920, 3840, 10000];
  const STRATEGIES = ['fit', 'fill', 'balanced', 'preserve-ratio'] as const;

  it.each(EXTREME_WIDTHS.flatMap((width) => STRATEGIES.map((strategy) => [width, strategy] as const)))(
    'width=%s, strategy=%s: no NaN, no Infinity, no negative dimension',
    (width, strategy) => {
      const result = computeContainerLayout(width, width, {
        itemCount: 5,
        strategy,
        aspectRatio: 16 / 9,
        gap: 16,
      });

      expect(Number.isFinite(result.columns)).toBe(true);
      expect(Number.isFinite(result.rows)).toBe(true);
      expect(Number.isFinite(result.cellWidth)).toBe(true);
      expect(Number.isFinite(result.cellHeight)).toBe(true);
      expect(result.columns).toBeGreaterThan(0);
      expect(result.rows).toBeGreaterThan(0);
      expect(result.cellWidth).toBeGreaterThanOrEqual(0);
      expect(result.cellHeight).toBeGreaterThanOrEqual(0);
    },
  );

  it('0px is treated as a transitional not-yet-measured state, not a configuration error', () => {
    expect(() => computeContainerLayout(0, 0, { itemCount: 4 })).not.toThrow();
    const result = computeContainerLayout(0, 0, { itemCount: 4 });
    expect(result.cellWidth).toBe(0);
    expect(result.cellHeight).toBe(0);
    expect(result.columns).toBeGreaterThan(0);
  });

  it('column count grows monotonically as width grows from 0 to 10000, for a fixed itemCount', () => {
    const columns = EXTREME_WIDTHS.map(
      (width) => computeContainerLayout(width, 800, { itemCount: 20, strategy: 'fit' }).columns,
    );
    for (let i = 1; i < columns.length; i += 1) {
      expect(columns[i]).toBeGreaterThanOrEqual(columns[i - 1] as number);
    }
  });

  it('width=10000 with a tiny minItemWidth produces a sane, bounded result, not a runaway column count', () => {
    const result = computeContainerLayout(10000, undefined, {
      itemCount: 5,
      strategy: 'fit',
      minItemWidth: 1,
    });
    // Never more columns than there are items, regardless of how
    // many a purely width/minItemWidth-driven count could allow.
    expect(result.columns).toBeLessThanOrEqual(5);
    expect(Number.isFinite(result.cellWidth)).toBe(true);
  });

  it('extreme height (10000) behaves the same way extreme width does — no special-casing by axis', () => {
    const result = computeContainerLayout(800, 10000, {
      itemCount: 5,
      strategy: 'fill',
      gap: 16,
    });
    expect(Number.isFinite(result.cellHeight)).toBe(true);
    expect(result.cellHeight).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';

import { computeDisplayClass } from './computeDisplayClass';

const LARGE_MIN_WIDTH = 1920;

describe('computeDisplayClass', () => {
  it('is always compact for mobile and tablet, regardless of width or heightBonusProgress', () => {
    expect(computeDisplayClass('mobile', 5000, 1, LARGE_MIN_WIDTH)).toBe('compact');
    expect(computeDisplayClass('tablet', 5000, 1, LARGE_MIN_WIDTH)).toBe('compact');
  });

  it('is standard for desktop below the large-display width threshold', () => {
    expect(computeDisplayClass('desktop', LARGE_MIN_WIDTH - 1, 0, LARGE_MIN_WIDTH)).toBe('standard');
  });

  it('is large at the large-display width threshold with no height bonus', () => {
    expect(computeDisplayClass('desktop', LARGE_MIN_WIDTH, 0, LARGE_MIN_WIDTH)).toBe('large');
  });

  it('is large for any heightBonusProgress below 1, once width qualifies', () => {
    expect(computeDisplayClass('desktop', LARGE_MIN_WIDTH, 0.999, LARGE_MIN_WIDTH)).toBe('large');
  });

  it('is ultra only once heightBonusProgress reaches exactly 1', () => {
    expect(computeDisplayClass('desktop', LARGE_MIN_WIDTH, 1, LARGE_MIN_WIDTH)).toBe('ultra');
  });

  it('never reaches ultra from width alone, no matter how wide, if heightBonusProgress is 0', () => {
    expect(computeDisplayClass('desktop', 100000, 0, LARGE_MIN_WIDTH)).toBe('large');
  });

  describe('boundary transitions (width=1920, height=1080, height=2160)', () => {
    it('1919 vs 1920 width: standard, then large — the exact width boundary', () => {
      expect(computeDisplayClass('desktop', 1919, 0, LARGE_MIN_WIDTH)).toBe('standard');
      expect(computeDisplayClass('desktop', 1920, 0, LARGE_MIN_WIDTH)).toBe('large');
    });

    it('heightBonusProgress computed at height=1079 vs 1080 vs 1081 stays large throughout — 1080 is the height-bonus floor, not the display-class boundary', () => {
      // Progress is 0 at and below 1080 (the floor), and only barely
      // above 0 at 1081 — none of that crosses display's own
      // threshold, which is progress===1, not progress>0.
      expect(computeDisplayClass('desktop', 1920, 0, LARGE_MIN_WIDTH)).toBe('large');
      expect(computeDisplayClass('desktop', 1920, 0.0009, LARGE_MIN_WIDTH)).toBe('large');
    });

    it('heightBonusProgress at 0.999 vs 1.0: large, then ultra — the exact height-ceiling boundary (height=2159 vs 2160)', () => {
      expect(computeDisplayClass('desktop', 1920, 0.999, LARGE_MIN_WIDTH)).toBe('large');
      expect(computeDisplayClass('desktop', 1920, 1, LARGE_MIN_WIDTH)).toBe('ultra');
    });
  });

  it('is stable for values well away from any threshold (not flickering near a boundary)', () => {
    for (const width of [1920, 2000, 2500]) {
      for (const progress of [0.4, 0.5, 0.6]) {
        expect(computeDisplayClass('desktop', width, progress, LARGE_MIN_WIDTH)).toBe('large');
      }
    }
  });
});

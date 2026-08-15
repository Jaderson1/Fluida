import { describe, expect, it } from 'vitest';

import {
  computeHeightBonusProgress,
  HEIGHT_BONUS_MAXIMUM_HEIGHT,
  HEIGHT_BONUS_MINIMUM_HEIGHT,
  HEIGHT_BONUS_MINIMUM_WIDTH,
} from './computeHeightBonusProgress';

describe('computeHeightBonusProgress', () => {
  it('is 0 below the width floor, at any height', () => {
    expect(computeHeightBonusProgress(HEIGHT_BONUS_MINIMUM_WIDTH - 1, 5000)).toBe(0);
    expect(computeHeightBonusProgress(390, 5000)).toBe(0);
  });

  it('is 0 at exactly the width floor with height at or below the height floor', () => {
    expect(computeHeightBonusProgress(HEIGHT_BONUS_MINIMUM_WIDTH, HEIGHT_BONUS_MINIMUM_HEIGHT)).toBe(0);
    expect(computeHeightBonusProgress(HEIGHT_BONUS_MINIMUM_WIDTH, 0)).toBe(0);
  });

  it('is 1 at the height ceiling, once width qualifies', () => {
    expect(computeHeightBonusProgress(HEIGHT_BONUS_MINIMUM_WIDTH, HEIGHT_BONUS_MAXIMUM_HEIGHT)).toBe(1);
  });

  it('does not exceed 1 for height beyond the ceiling', () => {
    expect(computeHeightBonusProgress(HEIGHT_BONUS_MINIMUM_WIDTH, HEIGHT_BONUS_MAXIMUM_HEIGHT + 1000)).toBe(1);
  });

  it('is exactly 0.5 at the midpoint height', () => {
    const midpoint = (HEIGHT_BONUS_MINIMUM_HEIGHT + HEIGHT_BONUS_MAXIMUM_HEIGHT) / 2;
    expect(computeHeightBonusProgress(HEIGHT_BONUS_MINIMUM_WIDTH, midpoint)).toBe(0.5);
  });

  it('width above the floor behaves the same as width at the floor — only the floor itself gates it', () => {
    expect(computeHeightBonusProgress(3840, 1620)).toBe(
      computeHeightBonusProgress(HEIGHT_BONUS_MINIMUM_WIDTH, 1620),
    );
  });
});

import { describe, expect, it } from 'vitest';

import { computeSpacing } from './computeSpacing';

describe('computeSpacing', () => {
  it('returns the minimum padding at the default minimum width', () => {
    expect(computeSpacing(320).page).toBe(16);
  });

  it('returns an intermediate padding at the previous (now-intermediate) 1440px point', () => {
    // Same reasoning as computeTypography's equivalent test: progress
    // = (1440-320)/(2560-320) = 0.5, page = 16 + 0.5*(64-16) = 40.
    expect(computeSpacing(1440).page).toBe(40);
  });

  it('returns the maximum padding at the default maximum width', () => {
    expect(computeSpacing(2560).page).toBe(64);
  });

  it('clamps beyond the default maximum width', () => {
    expect(computeSpacing(3840).page).toBe(64);
  });

  it('respects a fully custom configuration', () => {
    const config = {
      minimumWidth: 400,
      maximumWidth: 800,
      minimumPadding: 8,
      maximumPadding: 24,
    };

    expect(computeSpacing(400, config).page).toBe(8);
    expect(computeSpacing(800, config).page).toBe(24);
    expect(computeSpacing(600, config).page).toBeCloseTo(16, 5);
  });

  it('falls back to defaults for any field omitted from a partial config', () => {
    const result = computeSpacing(320, { minimumPadding: 10, maximumPadding: 20 });
    expect(result.page).toBe(10);
  });
});
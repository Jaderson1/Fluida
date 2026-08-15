import { describe, expect, it } from 'vitest';

import { computeSpacing } from './computeSpacing';

const NO_HEIGHT_BONUS = 1080;

describe('computeSpacing — width behavior (no height bonus)', () => {
  it('returns the minimum padding at the default minimum width', () => {
    expect(computeSpacing(320, NO_HEIGHT_BONUS).page).toBe(16);
  });

  it('returns an intermediate padding at the previous (now-intermediate) 1440px point', () => {
    // progress = (1440-320)/(2560-320) = 0.5, page = 16 + 0.5*(64-16) = 40.
    expect(computeSpacing(1440, NO_HEIGHT_BONUS).page).toBe(40);
  });

  it('returns the maximum padding at the default maximum width', () => {
    expect(computeSpacing(2560, NO_HEIGHT_BONUS).page).toBe(64);
  });

  it('clamps beyond the default maximum width', () => {
    expect(computeSpacing(3840, NO_HEIGHT_BONUS).page).toBe(64);
  });

  it('respects a fully custom configuration', () => {
    const config = {
      minimumWidth: 400,
      maximumWidth: 800,
      minimumPadding: 8,
      maximumPadding: 24,
    };

    expect(computeSpacing(400, NO_HEIGHT_BONUS, config).page).toBe(8);
    expect(computeSpacing(800, NO_HEIGHT_BONUS, config).page).toBe(24);
    expect(computeSpacing(600, NO_HEIGHT_BONUS, config).page).toBeCloseTo(16, 5);
  });

  it('falls back to defaults for any field omitted from a partial config', () => {
    const result = computeSpacing(320, NO_HEIGHT_BONUS, { minimumPadding: 10, maximumPadding: 20 });
    expect(result.page).toBe(10);
  });
});

describe('computeSpacing — height bonus', () => {
  it('adds nothing below the 1920px width floor, at any height', () => {
    expect(computeSpacing(1366, 2160).page).toBe(computeSpacing(1366, 1080).page);
    expect(computeSpacing(390, 2160).page).toBe(computeSpacing(390, 844).page);
  });

  it('reaches the full +12 bonus at the 2160px height ceiling', () => {
    const base = computeSpacing(3840, 1080).page;
    const withFullBonus = computeSpacing(3840, 2160).page;
    expect(withFullBonus).toBeCloseTo(base + 12, 10);
  });

  it('does not grow past the ceiling for height beyond 2160', () => {
    expect(computeSpacing(3840, 2160).page).toBe(computeSpacing(3840, 3000).page);
  });
});

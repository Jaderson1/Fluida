import { describe, expect, it } from 'vitest';

import { computeTypography } from './computeTypography';

// 1080 is the height-bonus floor (see computeHeightBonusProgress.ts) —
// passing it here keeps every test below testing width behavior only,
// with zero height bonus, regardless of width.
const NO_HEIGHT_BONUS = 1080;

describe('computeTypography — width behavior (no height bonus)', () => {
  it('returns the minimum scale at the default minimum width', () => {
    expect(computeTypography(320, NO_HEIGHT_BONUS).scale).toBe(1);
  });

  it('returns an intermediate scale at the previous (now-intermediate) 1440px point', () => {
    // progress = (1440-320)/(2560-320) = 0.5, scale = 1 + 0.5*(1.4-1) = 1.2.
    expect(computeTypography(1440, NO_HEIGHT_BONUS).scale).toBe(1.2);
  });

  it('returns the maximum scale at the default maximum width', () => {
    expect(computeTypography(2560, NO_HEIGHT_BONUS).scale).toBe(1.4);
  });

  it('clamps beyond the default maximum width', () => {
    expect(computeTypography(3840, NO_HEIGHT_BONUS).scale).toBe(1.4);
  });

  it('respects a fully custom configuration', () => {
    const config = {
      minimumWidth: 400,
      maximumWidth: 800,
      minimumScale: 0.9,
      maximumScale: 1.1,
    };

    expect(computeTypography(400, NO_HEIGHT_BONUS, config).scale).toBe(0.9);
    expect(computeTypography(800, NO_HEIGHT_BONUS, config).scale).toBe(1.1);
    expect(computeTypography(600, NO_HEIGHT_BONUS, config).scale).toBeCloseTo(1.0, 5);
  });

  it('falls back to defaults for any field omitted from a partial config', () => {
    const result = computeTypography(320, NO_HEIGHT_BONUS, { maximumScale: 2 });

    expect(result.scale).toBe(1);
  });
});

describe('computeTypography — height bonus', () => {
  it('adds nothing below the 1920px width floor, at any height', () => {
    expect(computeTypography(1366, 2160).scale).toBe(computeTypography(1366, 1080).scale);
    expect(computeTypography(390, 2160).scale).toBe(computeTypography(390, 844).scale);
  });

  it('adds nothing at exactly the 1080px height floor', () => {
    const withBonusHeight = computeTypography(1920, 1080).scale;
    const zeroHeightForComparison = computeTypography(1920, 0).scale; // below floor, clamps the same as 1080
    expect(withBonusHeight).toBe(zeroHeightForComparison);
  });

  it('reaches the full +0.08 bonus at the 2160px height ceiling', () => {
    const base = computeTypography(3840, 1080).scale; // width-only value, no bonus
    const withFullBonus = computeTypography(3840, 2160).scale;
    expect(withFullBonus).toBeCloseTo(base + 0.08, 10);
  });

  it('does not grow past the ceiling for height beyond 2160', () => {
    expect(computeTypography(3840, 2160).scale).toBe(computeTypography(3840, 3000).scale);
  });

  it('gives an intermediate bonus for an intermediate height', () => {
    // width=3840 (>=1920, qualifies), height=1620 is the midpoint of
    // 1080..2160 — bonus progress 0.5, so scale should sit exactly
    // halfway between the no-bonus and full-bonus values.
    const noBonus = computeTypography(3840, 1080).scale;
    const fullBonus = computeTypography(3840, 2160).scale;
    const midBonus = computeTypography(3840, 1620).scale;
    expect(midBonus).toBeCloseTo((noBonus + fullBonus) / 2, 10);
  });
});

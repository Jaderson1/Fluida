import { describe, expect, it } from 'vitest';

import { computeTypography } from './computeTypography';

describe('computeTypography', () => {
  it('returns the minimum scale at the default minimum width', () => {
    expect(computeTypography(320).scale).toBe(1);
  });

  it('returns an intermediate scale at the previous (now-intermediate) 1440px point', () => {
    // 1440 used to be the default maximum width itself — now it's the
    // midpoint of a wider curve. This value is a real interpolation
    // result, not a re-guess: progress = (1440-320)/(2560-320) = 0.5,
    // scale = 1 + 0.5*(1.4-1) = 1.2.
    expect(computeTypography(1440).scale).toBe(1.2);
  });

  it('returns the maximum scale at the default maximum width', () => {
    expect(computeTypography(2560).scale).toBe(1.4);
  });

  it('clamps beyond the default maximum width', () => {
    expect(computeTypography(3840).scale).toBe(1.4);
  });

  it('respects a fully custom configuration', () => {
    const config = {
      minimumWidth: 400,
      maximumWidth: 800,
      minimumScale: 0.9,
      maximumScale: 1.1,
    };

    expect(computeTypography(400, config).scale).toBe(0.9);
    expect(computeTypography(800, config).scale).toBe(1.1);
    expect(computeTypography(600, config).scale).toBeCloseTo(1.0, 5);
  });

  it('falls back to defaults for any field omitted from a partial config', () => {
    const result = computeTypography(320, { maximumScale: 2 });

    expect(result.scale).toBe(1);
  });
});
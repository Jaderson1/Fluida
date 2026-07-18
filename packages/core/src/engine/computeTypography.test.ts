import { describe, expect, it } from 'vitest';

import { computeTypography } from './computeTypography';

describe('computeTypography', () => {
  it('returns the minimum scale at the default minimum width', () => {
    expect(computeTypography(320).scale).toBe(1);
  });

  it('returns the maximum scale at the default maximum width', () => {
    expect(computeTypography(1440).scale).toBe(1.25);
  });

  it('clamps beyond the default maximum width', () => {
    expect(computeTypography(2000).scale).toBe(1.25);
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
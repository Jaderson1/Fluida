import { describe, expect, it } from 'vitest';

import { computeSpacing } from './computeSpacing';

describe('computeSpacing', () => {
  it('returns the minimum padding at the default minimum width', () => {
    expect(computeSpacing(320).page).toBe(16);
  });

  it('returns the maximum padding at the default maximum width', () => {
    expect(computeSpacing(1440).page).toBe(48);
  });

  it('clamps beyond the default maximum width', () => {
    expect(computeSpacing(2000).page).toBe(48);
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
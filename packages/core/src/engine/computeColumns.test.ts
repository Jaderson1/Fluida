import { describe, expect, it } from 'vitest';

import { computeColumns } from './computeColumns';
import type { Breakpoint } from './types';

describe('computeColumns', () => {
  it('maps each known breakpoint to its column count', () => {
    expect(computeColumns('mobile')).toBe(4);
    expect(computeColumns('tablet')).toBe(8);
    expect(computeColumns('desktop')).toBe(12);
  });

  it('falls back to the mobile column count for a value outside Breakpoint', () => {
    const unrecognized = 'ultrawide' as Breakpoint;

    expect(computeColumns(unrecognized)).toBe(4);
  });
});
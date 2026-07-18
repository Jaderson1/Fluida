import { describe, expect, it } from 'vitest';

import { computeBreakpoint } from './computeBreakpoint';
import { DEFAULT_BREAKPOINTS } from './defaultBreakpoints';
import type { Breakpoints } from './types';

describe('computeBreakpoint', () => {
  it('classifies a width within the mobile range', () => {
    expect(computeBreakpoint(390, DEFAULT_BREAKPOINTS)).toBe('mobile');
  });

  it('classifies a width within the tablet range', () => {
    expect(computeBreakpoint(800, DEFAULT_BREAKPOINTS)).toBe('tablet');
  });

  it('classifies a width within the desktop range', () => {
    expect(computeBreakpoint(1200, DEFAULT_BREAKPOINTS)).toBe('desktop');
  });

  it('treats a width exactly at a threshold as belonging to the higher tier', () => {
    expect(computeBreakpoint(768, DEFAULT_BREAKPOINTS)).toBe('tablet');
    expect(computeBreakpoint(1024, DEFAULT_BREAKPOINTS)).toBe('desktop');
  });

  it('classifies a width one pixel below a threshold as the lower tier', () => {
    expect(computeBreakpoint(767, DEFAULT_BREAKPOINTS)).toBe('mobile');
    expect(computeBreakpoint(1023, DEFAULT_BREAKPOINTS)).toBe('tablet');
  });

  it('clamps a width below every threshold to the smallest tier', () => {
    expect(computeBreakpoint(100, DEFAULT_BREAKPOINTS)).toBe('mobile');
  });

  it('produces the same result regardless of key order in the breakpoints object', () => {
    const unordered: Breakpoints = {
      desktop: 1024,
      mobile: 0,
      tablet: 768,
    };

    expect(computeBreakpoint(390, unordered)).toBe('mobile');
    expect(computeBreakpoint(800, unordered)).toBe('tablet');
    expect(computeBreakpoint(1200, unordered)).toBe('desktop');
  });

  it('throws when no breakpoints are configured', () => {
    expect(() => computeBreakpoint(500, {} as Breakpoints)).toThrow(
      'At least one breakpoint must be configured.',
    );
  });

  it('does not crash on a partial breakpoints object reaching it at runtime', () => {
    const partial = { mobile: 0 } as Breakpoints;

    expect(computeBreakpoint(500, partial)).toBe('mobile');
  });
});
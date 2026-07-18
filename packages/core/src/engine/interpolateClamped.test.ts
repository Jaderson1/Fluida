import { describe, expect, it } from 'vitest';

import { interpolateClamped } from './interpolateClamped';

describe('interpolateClamped', () => {
  it('clamps to the output minimum below the input range', () => {
    expect(
      interpolateClamped({
        value: 100,
        inputMinimum: 320,
        inputMaximum: 1440,
        outputMinimum: 16,
        outputMaximum: 48,
      }),
    ).toBe(16);
  });

  it('clamps to the output maximum above the input range', () => {
    expect(
      interpolateClamped({
        value: 2000,
        inputMinimum: 320,
        inputMaximum: 1440,
        outputMinimum: 16,
        outputMaximum: 48,
      }),
    ).toBe(48);
  });

  it('interpolates linearly inside the range', () => {
    const midpoint = interpolateClamped({
      value: 880, // exact midpoint of 320..1440
      inputMinimum: 320,
      inputMaximum: 1440,
      outputMinimum: 0,
      outputMaximum: 100,
    });

    expect(midpoint).toBeCloseTo(50, 5);
  });

  it('supports an inverted output range (value decreasing as input increases)', () => {
    const atMinimum = interpolateClamped({
      value: 320,
      inputMinimum: 320,
      inputMaximum: 1440,
      outputMinimum: 48,
      outputMaximum: 16,
    });

    const atMaximum = interpolateClamped({
      value: 1440,
      inputMinimum: 320,
      inputMaximum: 1440,
      outputMinimum: 48,
      outputMaximum: 16,
    });

    expect(atMinimum).toBe(48);
    expect(atMaximum).toBe(16);
  });

  it('throws when the input range is invalid (max equal to min)', () => {
    expect(() =>
      interpolateClamped({
        value: 500,
        inputMinimum: 320,
        inputMaximum: 320,
        outputMinimum: 16,
        outputMaximum: 48,
      }),
    ).toThrow('The maximum input value must be greater than the minimum input value.');
  });

  it('throws when the input range is invalid (max less than min)', () => {
    expect(() =>
      interpolateClamped({
        value: 500,
        inputMinimum: 1440,
        inputMaximum: 320,
        outputMinimum: 16,
        outputMaximum: 48,
      }),
    ).toThrow('The maximum input value must be greater than the minimum input value.');
  });
});
import { describe, expect, it } from 'vitest';

import { FluidaConfigError } from '../resolveFluidaConfig';
import { computeContainerLayout } from './computeContainerLayout';

describe('computeContainerLayout', () => {
  it('defaults to the fit strategy, gap 16, aspectRatio 1', () => {
    const withDefaults = computeContainerLayout(800, 600, { itemCount: 8 });
    const explicit = computeContainerLayout(800, 600, {
      itemCount: 8,
      strategy: 'fit',
      gap: 16,
      aspectRatio: 1,
    });

    expect(withDefaults).toEqual(explicit);
  });

  it('fit produces square cells that fit within the container', () => {
    const result = computeContainerLayout(800, 600, { itemCount: 8, strategy: 'fit' });

    expect(result.cellWidth).toBe(result.cellHeight);

    const gridWidth = result.columns * result.cellWidth + (result.columns - 1) * 16;
    const gridHeight = result.rows * result.cellHeight + (result.rows - 1) * 16;
    expect(gridWidth).toBeLessThanOrEqual(800 + 1e-9);
    expect(gridHeight).toBeLessThanOrEqual(600 + 1e-9);
  });

  it('fit lays out enough cells for every item', () => {
    const result = computeContainerLayout(800, 600, { itemCount: 8, strategy: 'fit' });
    expect(result.columns * result.rows).toBeGreaterThanOrEqual(8);
  });

  it('fill uses exactly the available space in both axes, even if the cell is not square', () => {
    const result = computeContainerLayout(800, 600, { itemCount: 8, strategy: 'fill' });

    const gridWidth = result.columns * result.cellWidth + (result.columns - 1) * 16;
    const gridHeight = result.rows * result.cellHeight + (result.rows - 1) * 16;

    expect(gridWidth).toBeCloseTo(800, 5);
    expect(gridHeight).toBeCloseTo(600, 5);
  });

  it('preserve-ratio keeps the exact configured aspect ratio', () => {
    const result = computeContainerLayout(800, 600, {
      itemCount: 6,
      strategy: 'preserve-ratio',
      aspectRatio: 2,
    });

    expect(result.cellWidth / result.cellHeight).toBeCloseTo(2, 5);
  });

  it('balanced sits between fit (the smaller, square size) and fill (the larger dimension)', () => {
    const fit = computeContainerLayout(900, 500, { itemCount: 5, strategy: 'fit' });
    const fill = computeContainerLayout(900, 500, { itemCount: 5, strategy: 'fill' });
    const balanced = computeContainerLayout(900, 500, { itemCount: 5, strategy: 'balanced' });

    expect(fill.cellWidth).not.toBeCloseTo(fill.cellHeight, 2);

    expect(balanced.cellWidth).toBe(balanced.cellHeight);
    expect(balanced.cellWidth).toBeGreaterThanOrEqual(fit.cellWidth - 1e-9);
    expect(balanced.cellWidth).toBeLessThanOrEqual(
      Math.max(fill.cellWidth, fill.cellHeight) + 1e-9,
    );
  });

  it('chooses the column count that minimizes cell distortion, verified against a hand-computed case', () => {
    const result = computeContainerLayout(400, 100, {
      itemCount: 4,
      strategy: 'fill',
      gap: 0,
    });

    expect(result.columns).toBe(4);
    expect(result.rows).toBe(1);
    expect(result.cellWidth).toBeCloseTo(100, 5);
    expect(result.cellHeight).toBeCloseTo(100, 5);
  });

  it('returns a single zero-size column when the container has no measured size yet', () => {
    const result = computeContainerLayout(0, 0, { itemCount: 8 });

    expect(result).toEqual({ columns: 1, rows: 8, cellWidth: 0, cellHeight: 0 });
  });

  it('throws FluidaConfigError for itemCount below 1', () => {
    expect(() => computeContainerLayout(800, 600, { itemCount: 0 })).toThrow(
      FluidaConfigError,
    );
  });

  it('throws FluidaConfigError for a negative gap', () => {
    expect(() =>
      computeContainerLayout(800, 600, { itemCount: 4, gap: -1 }),
    ).toThrow(FluidaConfigError);
  });

  it('throws FluidaConfigError for a non-positive aspectRatio', () => {
    expect(() =>
      computeContainerLayout(800, 600, {
        itemCount: 4,
        strategy: 'preserve-ratio',
        aspectRatio: 0,
      }),
    ).toThrow(FluidaConfigError);
  });
});
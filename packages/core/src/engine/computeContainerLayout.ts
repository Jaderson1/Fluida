import type { ContainerLayoutOptions, ContainerLayoutResult } from './types';
import { FluidaConfigError } from '../resolveFluidaConfig';

const DEFAULT_GAP = 16;
const DEFAULT_ASPECT_RATIO = 1;

interface CandidateColumns {
  readonly columns: number;
  readonly rows: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
}

/**
 * Finds the column count (from 1 up to itemCount) that fills the
 * available space exactly (no leftover in either axis, by
 * definition) while producing the least-distorted — closest to
 * square — cell. This is the base every strategy below builds on:
 * 'fill' returns it as-is; the others apply a different sizing rule
 * on top of the same chosen column count.
 */
function findBestFillingColumns(
  containerWidth: number,
  containerHeight: number,
  itemCount: number,
  gap: number,
): CandidateColumns {
  let best: CandidateColumns | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let columns = 1; columns <= itemCount; columns += 1) {
    const rows = Math.ceil(itemCount / columns);

    const cellWidth = (containerWidth - (columns - 1) * gap) / columns;
    const cellHeight = (containerHeight - (rows - 1) * gap) / rows;

    if (cellWidth <= 0 || cellHeight <= 0) continue;

    const score = Math.abs(cellWidth - cellHeight);

    if (score < bestScore) {
      bestScore = score;
      best = { columns, rows, cellWidth, cellHeight };
    }
  }

  // No candidate produced a positive size — the container isn't
  // measured yet (e.g. width/height are 0, the SSR fallback). A
  // single column at zero size is the honest answer: not wrong,
  // just not yet known.
  return (
    best ?? {
      columns: 1,
      rows: itemCount,
      cellWidth: 0,
      cellHeight: 0,
    }
  );
}

export function computeContainerLayout(
  containerWidth: number,
  containerHeight: number,
  options: ContainerLayoutOptions,
): ContainerLayoutResult {
  const { itemCount, strategy = 'fit', gap = DEFAULT_GAP, aspectRatio = DEFAULT_ASPECT_RATIO } = options;

  if (!Number.isFinite(itemCount) || itemCount < 1) {
    throw new FluidaConfigError(
      `Fluida container layout: itemCount must be a finite number of at least 1, got ${itemCount}.`,
    );
  }

  if (!Number.isFinite(gap) || gap < 0) {
    throw new FluidaConfigError(
      `Fluida container layout: gap must be a finite, non-negative number, got ${gap}.`,
    );
  }

  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new FluidaConfigError(
      `Fluida container layout: aspectRatio must be a finite number greater than 0, got ${aspectRatio}.`,
    );
  }

  const base = findBestFillingColumns(containerWidth, containerHeight, itemCount, gap);

  if (base.cellWidth <= 0 || base.cellHeight <= 0) {
    // Nothing measured yet — return the shape as-is, at zero size,
    // rather than applying a strategy-specific formula to numbers
    // that aren't real yet.
    return base;
  }

  switch (strategy) {
    case 'fill': {
      return base;
    }

    case 'fit': {
      const size = Math.min(base.cellWidth, base.cellHeight);
      return { columns: base.columns, rows: base.rows, cellWidth: size, cellHeight: size };
    }

    case 'preserve-ratio': {
      const cellWidth = Math.min(base.cellWidth, base.cellHeight * aspectRatio);
      const cellHeight = cellWidth / aspectRatio;
      return { columns: base.columns, rows: base.rows, cellWidth, cellHeight };
    }

    case 'balanced': {
      const size = Math.sqrt(base.cellWidth * base.cellHeight);
      return { columns: base.columns, rows: base.rows, cellWidth: size, cellHeight: size };
    }

    default: {
      // Unreachable for valid ContainerLayoutStrategy values; falls
      // back to the safest, most conservative choice rather than
      // returning undefined at runtime for a caller bypassing the
      // type system (e.g. plain JS, or a future Dash bridge).
      return base;
    }
  }
}
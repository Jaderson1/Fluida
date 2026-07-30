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
 *
 * minItemWidth, when set, discards any column count whose resulting
 * cellWidth would fall below it, before that candidate is even
 * scored — it restricts which column counts are eligible, it does
 * not change how the winner among the eligible ones is chosen. A
 * narrower container has fewer columns survive this filter, which is
 * what naturally drives the column count down as the container gets
 * narrower, without a separate "stacking" code path.
 */
function findBestFillingColumns(
  containerWidth: number,
  containerHeight: number,
  itemCount: number,
  gap: number,
  minItemWidth?: number,
): CandidateColumns {
  let best: CandidateColumns | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let columns = 1; columns <= itemCount; columns += 1) {
    const rows = Math.ceil(itemCount / columns);

    const cellWidth = (containerWidth - (columns - 1) * gap) / columns;
    const cellHeight = (containerHeight - (rows - 1) * gap) / rows;

    if (cellWidth <= 0 || cellHeight <= 0) continue;
    if (minItemWidth !== undefined && cellWidth < minItemWidth) continue;

    const score = Math.abs(cellWidth - cellHeight);

    if (score < bestScore) {
      bestScore = score;
      best = { columns, rows, cellWidth, cellHeight };
    }
  }

  // No candidate produced a positive size, or none met minItemWidth —
  // either way, a single column at zero size is the honest answer:
  // not wrong, just not something that currently fits.
  return (
    best ?? {
      columns: 1,
      rows: itemCount,
      cellWidth: 0,
      cellHeight: 0,
    }
  );
}

interface WidthOnlyColumns {
  readonly columns: number;
  readonly rows: number;
  readonly cellWidth: number;
}

/**
 * Chooses the largest column count (bounded by itemCount) whose
 * resulting cellWidth still meets minItemWidth — used only when
 * containerHeight isn't known, where the distortion-minimizing search
 * in findBestFillingColumns has nothing to compare cellWidth against,
 * so minItemWidth becomes the sole basis for a column count instead.
 *
 * Solved directly rather than searched: the inequality
 * (containerWidth - gap*(columns-1)) / columns >= minItemWidth
 * rearranges to columns <= (containerWidth + gap) / (minItemWidth + gap),
 * so the largest valid integer column count is the floor of that,
 * clamped to at least 0 and at most itemCount. No loop needed — this
 * is a closed-form solution, not an approximation of one.
 */
function findColumnsByWidthOnly(
  containerWidth: number,
  itemCount: number,
  gap: number,
  minItemWidth: number,
): WidthOnlyColumns {
  const maxColumnsForWidth = Math.floor((containerWidth + gap) / (minItemWidth + gap));
  const columns = Math.max(0, Math.min(maxColumnsForWidth, itemCount));

  if (columns < 1) {
    // Not even a single column reaches minItemWidth at this width —
    // the same honest "doesn't fit yet" answer findBestFillingColumns
    // gives in the equivalent situation, not a distinct error.
    return { columns: 1, rows: itemCount, cellWidth: 0 };
  }

  const rows = Math.ceil(itemCount / columns);
  const cellWidth = (containerWidth - (columns - 1) * gap) / columns;

  return { columns, rows, cellWidth };
}

export function computeContainerLayout(
  containerWidth: number,
  containerHeight: number | undefined,
  options: ContainerLayoutOptions,
): ContainerLayoutResult {
  const {
    itemCount,
    strategy = 'fit',
    gap = DEFAULT_GAP,
    aspectRatio = DEFAULT_ASPECT_RATIO,
    minItemWidth,
  } = options;

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

  if (minItemWidth !== undefined && (!Number.isFinite(minItemWidth) || minItemWidth <= 0)) {
    throw new FluidaConfigError(
      `Fluida container layout: minItemWidth must be a finite number greater than 0, got ${minItemWidth}.`,
    );
  }

  if (containerHeight === undefined) {
    // Auto-height: no known containerHeight to divide into rows, so
    // only strategies whose cell shape doesn't fundamentally depend
    // on a height value can proceed — 'fill' and 'balanced' compute
    // cellHeight directly from containerHeight, with nothing to
    // substitute; an unrecognized strategy string defaults to
    // fill-shaped behavior elsewhere in this function and is rejected
    // here for the same reason 'fill' itself is.
    if (strategy !== 'fit' && strategy !== 'preserve-ratio') {
      throw new FluidaConfigError(
        `Fluida container layout: strategy '${strategy}' requires a known containerHeight — only 'fit' and 'preserve-ratio' support computing a layout without one.`,
      );
    }

    if (minItemWidth === undefined) {
      throw new FluidaConfigError(
        'Fluida container layout: computing a layout without a known containerHeight requires minItemWidth — without either, there is no basis for choosing a column count.',
      );
    }

    const widthOnly = findColumnsByWidthOnly(containerWidth, itemCount, gap, minItemWidth);

    if (widthOnly.cellWidth <= 0) {
      return { columns: widthOnly.columns, rows: widthOnly.rows, cellWidth: 0, cellHeight: 0 };
    }

    if (strategy === 'fit') {
      return {
        columns: widthOnly.columns,
        rows: widthOnly.rows,
        cellWidth: widthOnly.cellWidth,
        cellHeight: widthOnly.cellWidth,
      };
    }

    // strategy === 'preserve-ratio'
    return {
      columns: widthOnly.columns,
      rows: widthOnly.rows,
      cellWidth: widthOnly.cellWidth,
      cellHeight: widthOnly.cellWidth / aspectRatio,
    };
  }

  const base = findBestFillingColumns(containerWidth, containerHeight, itemCount, gap, minItemWidth);

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

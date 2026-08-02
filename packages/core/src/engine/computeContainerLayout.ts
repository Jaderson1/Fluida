import type { ContainerLayoutOptions, ContainerLayoutResult } from './types';
import { FluidaConfigError } from '../resolveFluidaConfig';

const DEFAULT_GAP = 16;
const DEFAULT_ASPECT_RATIO = 1;
const VALID_STRATEGIES = ['fill', 'fit', 'balanced', 'preserve-ratio'] as const;

interface CandidateColumns {
  readonly columns: number;
  readonly rows: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
}

/**
 * Finds the column count (from 1 up to itemCount) that fills the
 * available space exactly while producing the least-distorted cell.
 * This is the base every strategy below builds on: 'fill' returns it
 * as-is; the others apply a different sizing rule on the same chosen
 * column count.
 *
 * minItemWidth, when set, discards any column count whose resulting
 * cellWidth would fall below it, before that candidate is scored — a
 * narrower container has fewer columns survive this filter, which is
 * what drives the column count down as the container narrows.
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
 * above has nothing to compare cellWidth against.
 *
 * Solved directly: (containerWidth - gap*(columns-1)) / columns >=
 * minItemWidth rearranges to columns <= (containerWidth + gap) /
 * (minItemWidth + gap), so the largest valid column count is the
 * floor of that, clamped to [0, itemCount].
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
    return { columns: 1, rows: itemCount, cellWidth: 0 };
  }

  const rows = Math.ceil(itemCount / columns);
  const cellWidth = (containerWidth - (columns - 1) * gap) / columns;

  return { columns, rows, cellWidth };
}

/**
 * 'balanced' cell size for a base (fill) cell of width/height.
 *
 * fitSize = min(width, height) is the largest square that fits in
 * both axes — the same value 'fit' itself uses. Each axis here is the
 * geometric mean of its own fill value and fitSize: the smaller of
 * the two fill dimensions already equals fitSize, so that axis comes
 * back unchanged; the larger axis is pulled toward fitSize without
 * reaching it, landing partway between 'fill' (no correction) and
 * 'fit' (full correction to a square).
 *
 * This keeps both axes within their original fill bounds by
 * construction: for any x >= fitSize, sqrt(x * fitSize) <= x. That
 * inequality is what guarantees totalGridWidth/Height never exceed
 * the container — not a check added after the fact.
 */
function balancedCellSize(
  width: number,
  height: number,
): { cellWidth: number; cellHeight: number } {
  const fitSize = Math.min(width, height);
  return {
    cellWidth: Math.sqrt(width * fitSize),
    cellHeight: Math.sqrt(height * fitSize),
  };
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

  if (!Number.isInteger(itemCount) || itemCount < 1) {
    throw new FluidaConfigError(
      `Fluida container layout: itemCount must be an integer of at least 1, got ${itemCount}.`,
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

  if (!Number.isFinite(containerWidth) || containerWidth < 0) {
    throw new FluidaConfigError(
      `Fluida container layout: containerWidth must be a finite number >= 0, got ${containerWidth}.`,
    );
  }

  if (containerHeight !== undefined && (!Number.isFinite(containerHeight) || containerHeight < 0)) {
    throw new FluidaConfigError(
      `Fluida container layout: containerHeight must be a finite number >= 0, got ${containerHeight}.`,
    );
  }

  if (!VALID_STRATEGIES.includes(strategy)) {
    throw new FluidaConfigError(
      `Fluida container layout: strategy must be one of ${VALID_STRATEGIES.map((value) => `'${value}'`).join(', ')}, got '${strategy}'.`,
    );
  }

  if (containerHeight === undefined) {
    // Auto-height: 'fill' and 'balanced' compute cell size directly
    // from containerHeight, with nothing to substitute.
    if (strategy !== 'fit' && strategy !== 'preserve-ratio') {
      throw new FluidaConfigError(
        `Fluida container layout: strategy '${strategy}' requires a known containerHeight — only 'fit' and 'preserve-ratio' support computing a layout without one.`,
      );
    }

    if (minItemWidth === undefined) {
      throw new FluidaConfigError(
        'Fluida container layout: computing a layout without a known containerHeight requires minItemWidth.',
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

    return {
      columns: widthOnly.columns,
      rows: widthOnly.rows,
      cellWidth: widthOnly.cellWidth,
      cellHeight: widthOnly.cellWidth / aspectRatio,
    };
  }

  const base = findBestFillingColumns(
    containerWidth,
    containerHeight,
    itemCount,
    gap,
    minItemWidth,
  );

  if (base.cellWidth <= 0 || base.cellHeight <= 0) {
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
      const { cellWidth, cellHeight } = balancedCellSize(base.cellWidth, base.cellHeight);
      return { columns: base.columns, rows: base.rows, cellWidth, cellHeight };
    }
  }
}

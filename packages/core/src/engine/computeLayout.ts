import type {
  EngineConfig,
  LayoutTokens,
} from './types';

import { computeBreakpoint } from './computeBreakpoint';
import { computeColumns } from './computeColumns';
import { computeContainer } from './computeContainer';
import { computeDisplayClass } from './computeDisplayClass';
import { computeHeightBonusProgress, HEIGHT_BONUS_MINIMUM_WIDTH } from './computeHeightBonusProgress';
import { computeSpacing } from './computeSpacing';
import { computeTypography } from './computeTypography';
import { DEFAULT_BREAKPOINTS } from './defaultBreakpoints';

export function computeLayout(
  width: number,
  height: number,
  config: EngineConfig = {},
): LayoutTokens {
  const breakpoints = config.breakpoints ?? DEFAULT_BREAKPOINTS;

  const breakpoint = computeBreakpoint(width, breakpoints);
  const columns = computeColumns(breakpoint);
  const spacing = computeSpacing(width, height, config.spacing);
  const typography = computeTypography(width, height, config.typography);
  const container = computeContainer(width, config.container);

  // Reuses the exact same signal computeTypography/computeSpacing
  // already used for their own height bonus — not a separate
  // heuristic. HEIGHT_BONUS_MINIMUM_WIDTH is the same threshold
  // both of those already gate on.
  const heightBonusProgress = computeHeightBonusProgress(width, height);
  const display = computeDisplayClass(breakpoint, width, heightBonusProgress, HEIGHT_BONUS_MINIMUM_WIDTH);

  return {
    breakpoint,
    grid: {
      columns,
    },
    spacing,
    typography,
    container,
    display,
  };
}
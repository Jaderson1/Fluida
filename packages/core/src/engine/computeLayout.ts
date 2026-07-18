import type {
  EngineConfig,
  LayoutTokens,
} from './types';

import { computeBreakpoint } from './computeBreakpoint';
import { computeColumns } from './computeColumns';
import { computeContainer } from './computeContainer';
import { computeSpacing } from './computeSpacing';
import { computeTypography } from './computeTypography';
import { DEFAULT_BREAKPOINTS } from './defaultBreakpoints';

export function computeLayout(
  width: number,
  config: EngineConfig = {},
): LayoutTokens {
  const breakpoints = config.breakpoints ?? DEFAULT_BREAKPOINTS;

  const breakpoint = computeBreakpoint(width, breakpoints);
  const columns = computeColumns(breakpoint);
  const spacing = computeSpacing(width, config.spacing);
  const typography = computeTypography(width, config.typography);
  const container = computeContainer(width, config.container);

  return {
    breakpoint,
    grid: {
      columns,
    },
    spacing,
    typography,
    container,
  };
}
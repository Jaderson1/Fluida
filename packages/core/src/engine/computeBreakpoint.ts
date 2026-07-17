import type {
  Breakpoint,
  Breakpoints,
} from './types';

export function computeBreakpoint(
  width: number,
  breakpoints: Breakpoints,
): Breakpoint {
  const orderedBreakpoints = (
    Object.entries(breakpoints) as Array<[Breakpoint, number]>
  ).sort(([, firstValue], [, secondValue]) => {
    return firstValue - secondValue;
  });

  const firstBreakpoint = orderedBreakpoints[0];

  if (!firstBreakpoint) {
    throw new Error(
      'At least one breakpoint must be configured.',
    );
  }

  let currentBreakpoint = firstBreakpoint[0];

  for (const [breakpoint, minimumWidth] of orderedBreakpoints) {
    if (width < minimumWidth) {
      break;
    }

    currentBreakpoint = breakpoint;
  }

  return currentBreakpoint;
}
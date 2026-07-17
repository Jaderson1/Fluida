import type { Breakpoint } from './types';

export function computeColumns(
  breakpoint: Breakpoint,
): number {
  switch (breakpoint) {
    case 'mobile':
      return 4;

    case 'tablet':
      return 8;

    case 'desktop':
      return 12;
  }
}
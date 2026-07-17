import type { LayoutTokens } from './types';

export function computeLayout(): LayoutTokens {
  return {
    breakpoint: 'mobile',
    grid: {
      columns: 4,
    },
    spacing: {
      page: 16,
    },
    typography: {
      scale: 1,
    },
  };
}
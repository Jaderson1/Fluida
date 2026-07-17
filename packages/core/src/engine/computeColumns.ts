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

    default:
      // Alcançável por quem chama fora do TypeScript (uma prop do
      // Dash, ou JS puro que ignora o tipo) com um valor fora de
      // Breakpoint. Cai pro valor mais conservador em vez de
      // devolver undefined em runtime.
      return 4;
  }
}
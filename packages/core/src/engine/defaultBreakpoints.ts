import type { Breakpoint } from "./types";

export const DEFAULT_BREAKPOINTS: Readonly<Record<Breakpoint, number>> = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
};
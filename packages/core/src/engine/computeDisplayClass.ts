import type { Breakpoint } from './types';

/**
 * Names deliberately avoid Breakpoint's own vocabulary (mobile,
 * tablet, desktop) and the sm/md/lg/xl convention common in CSS
 * frameworks — the latter implies a width-only bucket, which this
 * isn't: 'ultra' specifically requires height, not just width. No
 * resolution-specific name (e.g. '4k') on purpose — see
 * computeDisplayClass below for why.
 */
export type DisplayClass = 'compact' | 'standard' | 'large' | 'ultra';

/**
 * A deterministic function of breakpoint, width, and heightBonusProgress
 * — the same signals container tiers and the typography/spacing height
 * bonus already use, not a fourth independent set of thresholds.
 *
 * 'compact' covers mobile and tablet unconditionally — a tall phone in
 * portrait never qualifies for 'large' or 'ultra' just by having a
 * large height/width ratio, since breakpoint itself is width-only.
 * 'ultra' requires heightBonusProgress to have reached its own
 * ceiling (both wide and tall, e.g. true 4K) — not width alone, so
 * this never becomes an `is4K`-shaped check on a specific number.
 */
export function computeDisplayClass(
  breakpoint: Breakpoint,
  width: number,
  heightBonusProgress: number,
  largeDisplayMinimumWidth: number,
): DisplayClass {
  if (breakpoint !== 'desktop') {
    return 'compact';
  }

  if (width < largeDisplayMinimumWidth) {
    return 'standard';
  }

  return heightBonusProgress >= 1 ? 'ultra' : 'large';
}

import { interpolateClamped } from './interpolateClamped';

/**
 * Width must already be in this range before height contributes
 * anything at all. This is what keeps a tall, narrow viewport (a
 * phone in portrait, or a tablet) from ever being treated as
 * spacious just because its height/width ratio is large — the
 * bonus only exists for viewports already wide enough that "large
 * display" is a reasonable description on width alone.
 */
export const HEIGHT_BONUS_MINIMUM_WIDTH = 1920;

/**
 * 1080 is a real, common viewport height (1080p) — not a starting
 * point chosen to make bonus math convenient. Below it, and at
 * exactly it, the bonus is zero: this is what keeps 1080p (and a
 * short, wide notebook screen below it) from changing at all.
 */
export const HEIGHT_BONUS_MINIMUM_HEIGHT = 1080;

/** 2160 is 4K's own height — the bonus reaches its full value there
 * and does not grow further past it. */
export const HEIGHT_BONUS_MAXIMUM_HEIGHT = 2160;

/**
 * 0..1 progress toward the full height bonus, or exactly 0 whenever
 * width hasn't reached HEIGHT_BONUS_MINIMUM_WIDTH. Shared by
 * computeTypography and computeSpacing so the same width/height
 * thresholds and the same interpolation apply to both — this
 * function does not decide what the bonus is used for or how large
 * it is; each caller multiplies this by its own bonus ceiling.
 */
export function computeHeightBonusProgress(width: number, height: number): number {
  if (width < HEIGHT_BONUS_MINIMUM_WIDTH) {
    return 0;
  }

  return interpolateClamped({
    value: height,
    inputMinimum: HEIGHT_BONUS_MINIMUM_HEIGHT,
    inputMaximum: HEIGHT_BONUS_MAXIMUM_HEIGHT,
    outputMinimum: 0,
    outputMaximum: 1,
  });
}

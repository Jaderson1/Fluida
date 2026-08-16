import { interpolateClamped } from './interpolateClamped';

// Width must reach 1920 before height contributes anything — this is
// what keeps a tall, narrow phone or tablet from being treated as
// spacious just because its height/width ratio is large. 1080 and
// 2160 are real viewport heights (1080p, 4K), not tuning constants:
// below 1080 the bonus is zero (1080p itself never changes), and it
// reaches full value at 2160 without growing further past it.
export const HEIGHT_BONUS_MINIMUM_WIDTH = 1920;
export const HEIGHT_BONUS_MINIMUM_HEIGHT = 1080;
export const HEIGHT_BONUS_MAXIMUM_HEIGHT = 2160;

/**
 * 0..1 progress toward the full height bonus. Shared by
 * computeTypography and computeSpacing — this function only computes
 * the progress; each caller multiplies by its own bonus ceiling.
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

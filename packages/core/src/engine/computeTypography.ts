import type {
  TypographyConfig,
  TypographyLayout,
} from './types';

import { computeHeightBonusProgress } from './computeHeightBonusProgress';
import { interpolateClamped } from './interpolateClamped';

export const DEFAULT_MINIMUM_WIDTH = 320;
export const DEFAULT_MAXIMUM_WIDTH = 2560;
export const DEFAULT_MINIMUM_SCALE = 1;
export const DEFAULT_MAXIMUM_SCALE = 1.4;

/** Added on top of the width-derived scale, scaled by
 * computeHeightBonusProgress — never applied on its own. */
export const MAXIMUM_HEIGHT_BONUS_SCALE = 0.08;

export function computeTypography(
  width: number,
  height: number,
  config: TypographyConfig = {},
): TypographyLayout {
  const minimumWidth =
    config.minimumWidth ?? DEFAULT_MINIMUM_WIDTH;

  const maximumWidth =
    config.maximumWidth ?? DEFAULT_MAXIMUM_WIDTH;

  const minimumScale =
    config.minimumScale ?? DEFAULT_MINIMUM_SCALE;

  const maximumScale =
    config.maximumScale ?? DEFAULT_MAXIMUM_SCALE;

  const widthScale = interpolateClamped({
    value: width,
    inputMinimum: minimumWidth,
    inputMaximum: maximumWidth,
    outputMinimum: minimumScale,
    outputMaximum: maximumScale,
  });

  const heightBonus = computeHeightBonusProgress(width, height) * MAXIMUM_HEIGHT_BONUS_SCALE;

  return {
    scale: widthScale + heightBonus,
  };
}
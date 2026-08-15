import type {
  SpacingConfig,
  SpacingLayout,
} from './types';

import { computeHeightBonusProgress } from './computeHeightBonusProgress';
import { interpolateClamped } from './interpolateClamped';

export const DEFAULT_MINIMUM_WIDTH = 320;
export const DEFAULT_MAXIMUM_WIDTH = 2560;
export const DEFAULT_MINIMUM_PADDING = 16;
export const DEFAULT_MAXIMUM_PADDING = 64;

/** Added on top of the width-derived padding, scaled by
 * computeHeightBonusProgress — never applied on its own. */
export const MAXIMUM_HEIGHT_BONUS_PADDING = 12;

export function computeSpacing(
  width: number,
  height: number,
  config: SpacingConfig = {},
): SpacingLayout {
  const minimumWidth =
    config.minimumWidth ?? DEFAULT_MINIMUM_WIDTH;

  const maximumWidth =
    config.maximumWidth ?? DEFAULT_MAXIMUM_WIDTH;

  const minimumPadding =
    config.minimumPadding ?? DEFAULT_MINIMUM_PADDING;

  const maximumPadding =
    config.maximumPadding ?? DEFAULT_MAXIMUM_PADDING;

  const widthPadding = interpolateClamped({
    value: width,
    inputMinimum: minimumWidth,
    inputMaximum: maximumWidth,
    outputMinimum: minimumPadding,
    outputMaximum: maximumPadding,
  });

  const heightBonus = computeHeightBonusProgress(width, height) * MAXIMUM_HEIGHT_BONUS_PADDING;

  return {
    page: widthPadding + heightBonus,
  };
}
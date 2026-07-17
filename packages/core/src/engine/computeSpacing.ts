import type {
  SpacingConfig,
  SpacingLayout,
} from './types';

import { interpolateClamped } from './interpolateClamped';

const DEFAULT_MINIMUM_WIDTH = 320;
const DEFAULT_MAXIMUM_WIDTH = 1440;
const DEFAULT_MINIMUM_PADDING = 16;
const DEFAULT_MAXIMUM_PADDING = 48;

export function computeSpacing(
  width: number,
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

  const page = interpolateClamped({
    value: width,
    inputMinimum: minimumWidth,
    inputMaximum: maximumWidth,
    outputMinimum: minimumPadding,
    outputMaximum: maximumPadding,
  });

  return {
    page,
  };
}
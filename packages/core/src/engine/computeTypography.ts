import type {
  TypographyConfig,
  TypographyLayout,
} from './types';

import { interpolateClamped } from './interpolateClamped';

const DEFAULT_MINIMUM_WIDTH = 320;
const DEFAULT_MAXIMUM_WIDTH = 1440;
const DEFAULT_MINIMUM_SCALE = 1;
const DEFAULT_MAXIMUM_SCALE = 1.25;

export function computeTypography(
  width: number,
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

  const scale = interpolateClamped(
    width,
    minimumWidth,
    maximumWidth,
    minimumScale,
    maximumScale,
  );

  return {
    scale,
  };
}
import type { SpacingLayout } from './types';

export function computeSpacing(
  width: number,
): SpacingLayout {
  const minimumWidth = 320;
  const maximumWidth = 1440;

  const minimumPadding = 16;
  const maximumPadding = 48;

  const normalizedWidth = Math.min(
    Math.max(width, minimumWidth),
    maximumWidth,
  );

  const progress =
    (normalizedWidth - minimumWidth) /
    (maximumWidth - minimumWidth);

  const page =
    minimumPadding +
    progress * (maximumPadding - minimumPadding);

  return {
    page,
  };
}
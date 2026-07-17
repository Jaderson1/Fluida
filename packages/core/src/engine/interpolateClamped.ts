export interface InterpolateClampedOptions {
  readonly value: number;
  readonly inputMinimum: number;
  readonly inputMaximum: number;
  readonly outputMinimum: number;
  readonly outputMaximum: number;
}

export function interpolateClamped(
  options: InterpolateClampedOptions,
): number {
  const {
    value,
    inputMinimum,
    inputMaximum,
    outputMinimum,
    outputMaximum,
  } = options;

  if (inputMaximum <= inputMinimum) {
    throw new Error(
      'The maximum input value must be greater than the minimum input value.',
    );
  }

  const clampedValue = Math.min(
    Math.max(value, inputMinimum),
    inputMaximum,
  );

  const progress =
    (clampedValue - inputMinimum) /
    (inputMaximum - inputMinimum);

  return (
    outputMinimum +
    progress * (outputMaximum - outputMinimum)
  );
}
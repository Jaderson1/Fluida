export function interpolateClamped(
  value: number,
  inputMinimum: number,
  inputMaximum: number,
  outputMinimum: number,
  outputMaximum: number,
): number {
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
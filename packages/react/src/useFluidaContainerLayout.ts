import type {
  ContainerLayoutOptions,
  ContainerLayoutResult,
} from '@fluida/core';
import { computeContainerLayout } from '@fluida/core';
import type { RefObject } from 'react';
import { useMemo } from 'react';

import { useFluidaContainerSize } from './useFluidaContainerSize';

/**
 * Measures the element `ref` is attached to and computes a
 * ContainerLayoutResult for it, given a known item count and
 * strategy. Does not require <FluidaProvider> — this is a fully
 * standalone hook, independent from the viewport-based system.
 */
export function useFluidaContainerLayout<T extends Element>(
  ref: RefObject<T | null>,
  options: ContainerLayoutOptions,
): ContainerLayoutResult {
  const size = useFluidaContainerSize(ref);

  return useMemo(
    () => computeContainerLayout(size.width, size.height, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      size.width,
      size.height,
      options.itemCount,
      options.strategy,
      options.gap,
      options.aspectRatio,
    ],
  );
}
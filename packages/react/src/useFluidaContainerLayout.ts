import type { ContainerLayoutOptions, ContainerLayoutResult } from '@fluida/core';
import { computeContainerLayout } from '@fluida/core';
import type { RefObject } from 'react';
import { useMemo } from 'react';

import { useFluidaContainerSize } from './useFluidaContainerSize';

/**
 * Measures the element `ref` is attached to and computes a
 * ContainerLayoutResult for it, given a known item count and
 * strategy. Does not require <FluidaProvider> — this is a fully
 * standalone hook, independent from the viewport-based system.
 *
 * autoHeight, when true, still measures the element's height via
 * useFluidaContainerSize (nothing about the measuring itself changes)
 * but never passes that measured height to computeContainerLayout —
 * undefined is passed instead, requesting the Core's own auto-height
 * mode (only valid for 'fit'/'preserve-ratio' with minItemWidth set;
 * see computeContainerLayout's own documentation for why). The
 * measured height is simply unused in that case, not fed back in.
 */
export function useFluidaContainerLayout<T extends Element>(
  ref: RefObject<T | null>,
  options: ContainerLayoutOptions,
  autoHeight = false,
): ContainerLayoutResult {
  const size = useFluidaContainerSize(ref);
  const effectiveHeight = autoHeight ? undefined : size.height;

  return useMemo(
    () => computeContainerLayout(size.width, effectiveHeight, options),
    // options is a new object literal on every call from FluidaAdaptiveGrid;
    // listing it here instead of its individual fields would make this
    // useMemo recompute on every render, defeating it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      size.width,
      effectiveHeight,
      options.itemCount,
      options.strategy,
      options.gap,
      options.aspectRatio,
      options.minItemWidth,
    ],
  );
}

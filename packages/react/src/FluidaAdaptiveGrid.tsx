import type {
  ContainerLayoutOptions,
  ContainerLayoutStrategy,
} from '@fluida/core';
import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  MutableRefObject,
  Ref,
  RefCallback,
} from 'react';
import { forwardRef, useRef } from 'react';

import { useFluidaContainerLayout } from './useFluidaContainerLayout';

function mergeRefs<T>(...refs: ReadonlyArray<Ref<T> | undefined>): RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref) {
        (ref as MutableRefObject<T | null>).current = value;
      }
    }
  };
}

export interface FluidaAdaptiveGridProps extends ComponentPropsWithoutRef<'div'> {
  /** How many children will be rendered. Required — not inferred from React.Children, to avoid miscounting fragments, nulls, or conditional content. */
  readonly itemCount: number;
  /** Defaults to 'fit'. */
  readonly strategy?: ContainerLayoutStrategy;
  /** Defaults to 16. */
  readonly gap?: number;
  /** width / height. Only used by the 'preserve-ratio' strategy. Defaults to 1. */
  readonly aspectRatio?: number;
}

/**
 * Measures its own real rendered size — via ResizeObserver, not the
 * viewport — and distributes itemCount children across it according
 * to `strategy`. Independent from <FluidaProvider> and the viewport
 * primitives: there is no shared state to gain from requiring one.
 *
 * Cell size is applied as explicit pixel dimensions, not
 * minmax(0, 1fr): the whole point of this component is that it
 * already computed the specific size that best uses the real
 * measured space for the real item count, so letting the grid
 * renegotiate that with 1fr would undo the computation. As with
 * FluidaGrid, this does not force line-wrapping inside a cell's own
 * content — that choice stays with whatever you render inside.
 */
export const FluidaAdaptiveGrid = forwardRef<HTMLDivElement, FluidaAdaptiveGridProps>(
  function FluidaAdaptiveGrid(
    { itemCount, strategy, gap, aspectRatio, style, ...rest },
    forwardedRef,
  ) {
    const internalRef = useRef<HTMLDivElement | null>(null);

    const options: ContainerLayoutOptions = {
      itemCount,
      strategy,
      gap,
      aspectRatio,
    };

    const layout = useFluidaContainerLayout(internalRef, options);

    const gridStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${layout.columns}, ${layout.cellWidth}px)`,
      gridAutoRows: `${layout.cellHeight}px`,
      gap: gap ?? 16,
      justifyContent: 'center',
      alignContent: 'center',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      ...style,
    };

    return (
      <div
        ref={mergeRefs(internalRef, forwardedRef)}
        style={gridStyle}
        {...rest}
      />
    );
  },
);
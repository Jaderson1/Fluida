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
import { Children, forwardRef, useRef } from 'react';

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

// A sensible starting height, not a magic number: enough for a real
// dashboard widget (a chart, a card) to look like something on the
// very first render, before any real measurement exists yet.
// Overridable via style.minHeight or style.height, same as every
// other property below — see the class doc comment for why this
// exists at all.
const DEFAULT_MIN_HEIGHT = 200;

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
 *
 * Why `minHeight`, not `height: '100%'`. An earlier version set
 * `height: '100%'` unconditionally. If the parent has no explicit
 * height, that resolves to `auto` per the CSS spec — meaning this
 * element's own rendered height then depends on its content, which
 * is `gridAutoRows: ${cellHeight}px`. On the very first render,
 * before any real measurement exists, `cellHeight` is `0` (the
 * not-yet-measured fallback) — so the element renders at height 0,
 * ResizeObserver reports height 0, computeContainerLayout returns
 * cellHeight 0 again, forever: a real, silent deadlock with no error,
 * reachable by any consumer who doesn't happen to give the parent an
 * explicit height. `minHeight` is a floor, not a guess at the final
 * height: it guarantees the very first measurement is never zero,
 * without requiring anything from the consumer's own CSS, and it
 * still lets a taller real layout grow past it once one is computed.
 * A consumer who wants a specific height or a different minimum can
 * still set `style.height` or `style.minHeight` directly — that
 * override still wins, exactly as before.
 */
export const FluidaAdaptiveGrid = forwardRef<HTMLDivElement, FluidaAdaptiveGridProps>(
  function FluidaAdaptiveGrid(
    { itemCount, strategy, gap, aspectRatio, style, children, ...rest },
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

    const isDevelopment =
      (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
        ?.env?.NODE_ENV !== 'production';

    if (isDevelopment) {
      // A development-only signal, not a hard validation: React.Children.count()
      // counts top-level children and does not descend into fragments, so a
      // consumer grouping some children in a <>...</> could see a mismatch here
      // that isn't actually one. Intentionally not thrown as an error in any
      // environment — a wrong itemCount produces a visually wrong grid, not a
      // crash, and should stay that way.
      const renderedChildCount = Children.count(children);
      if (renderedChildCount !== itemCount) {
        console.warn(
          `Fluida: <FluidaAdaptiveGrid itemCount={${itemCount}}> was given ${renderedChildCount} child element(s). ` +
            'The grid is sized for itemCount, not for however many children are actually rendered — ' +
            'if these differ, update itemCount to match, or check that children wrapped in a fragment aren\'t throwing this off.',
        );
      }
    }

    const gridStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${layout.columns}, ${layout.cellWidth}px)`,
      gridAutoRows: `${layout.cellHeight}px`,
      gap: gap ?? 16,
      justifyContent: 'center',
      alignContent: 'center',
      width: '100%',
      minHeight: DEFAULT_MIN_HEIGHT,
      boxSizing: 'border-box',
      ...style,
    };

    return (
      <div
        ref={mergeRefs(internalRef, forwardedRef)}
        style={gridStyle}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
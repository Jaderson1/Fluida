import type { ContainerLayoutOptions, ContainerLayoutStrategy } from '@fluida/core';
import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  MutableRefObject,
  Ref,
  RefCallback,
} from 'react';
import { Children, forwardRef, useEffect, useRef } from 'react';

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
  /** When set, column counts whose resulting cell would be narrower than this are excluded from consideration entirely. Undefined (the default) applies no such constraint. */
  readonly minItemWidth?: number;
  /**
   * When true, this grid's own measured height is never fed back into
   * the layout computation — Core computes cellHeight (and this
   * component then applies an explicit height, rows * cellHeight +
   * (rows-1) * gap) purely from the measured width, minItemWidth, and
   * strategy, instead of the height happening to already have
   * whatever value it does (the 200px floor below, most commonly, on
   * a container whose height nothing else determines). Only
   * 'fit' + minItemWidth and 'preserve-ratio' + minItemWidth support
   * this — 'fill' and 'balanced' need a real known height to mean
   * anything, and throw the same FluidaConfigError Core itself raises
   * for that combination, exactly like any other invalid
   * configuration already does in this component. Defaults to false:
   * existing behavior is entirely unchanged unless this is set.
   */
  readonly autoHeight?: boolean;
}

/**
 * Measures its own real rendered size — via ResizeObserver, not the
 * viewport — and distributes itemCount children across it according
 * to `strategy`. Independent from <FluidaProvider> and the viewport
 * primitives: there is no shared state to gain from requiring one.
 *
 * Cell size is applied as explicit pixel dimensions, not
 * minmax(0, 1fr): this component computes the specific size that
 * best uses the real measured space for the real item count, and
 * letting the grid renegotiate that with 1fr would undo it. As with
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
    {
      itemCount,
      strategy,
      gap,
      aspectRatio,
      minItemWidth,
      autoHeight = false,
      style,
      children,
      ...rest
    },
    forwardedRef,
  ) {
    const internalRef = useRef<HTMLDivElement | null>(null);

    const options: ContainerLayoutOptions = {
      itemCount,
      strategy,
      gap,
      aspectRatio,
      minItemWidth,
    };

    const layout = useFluidaContainerLayout(internalRef, options, autoHeight);

    const isDevelopment =
      (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !==
      'production';

    const renderedChildCount = Children.count(children);
    const lastWarnedMismatchRef = useRef<string | null>(null);

    useEffect(() => {
      // React.Children.count() counts top-level children and does not
      // descend into fragments, so a consumer grouping children in a
      // <>...</> could see a mismatch here that isn't actually one.
      // Not a hard validation: a wrong itemCount produces a visually
      // wrong grid, not a crash. Deduplicated by the specific
      // itemCount/childCount pair so Strict Mode's double-invocation
      // doesn't log it twice for the same mismatch.
      if (!isDevelopment || renderedChildCount === itemCount) return;

      const mismatchKey = `${itemCount}:${renderedChildCount}`;
      if (lastWarnedMismatchRef.current === mismatchKey) return;
      lastWarnedMismatchRef.current = mismatchKey;

      console.warn(
        `Fluida: <FluidaAdaptiveGrid itemCount={${itemCount}}> was given ${renderedChildCount} child element(s). ` +
          'The grid is sized for itemCount, not for however many children are actually rendered — ' +
          "if these differ, update itemCount to match, or check that children wrapped in a fragment aren't throwing this off.",
      );
    }, [isDevelopment, itemCount, renderedChildCount]);

    // totalHeight is deliberately computed here, in the adapter, and
    // not returned by Core itself: it's one line of arithmetic from
    // fields Core already produces (rows, cellHeight) plus a value
    // this component already has (gap) — adding it to Core's own
    // return type would have meant every existing exact-equality test
    // asserting {columns, rows, cellWidth, cellHeight} against Core's
    // output would need updating for no functional gain.
    const resolvedGap = gap ?? 16;
    const totalHeight = layout.rows * layout.cellHeight + (layout.rows - 1) * resolvedGap;

    const gridStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${layout.columns}, ${layout.cellWidth}px)`,
      gridAutoRows: `${layout.cellHeight}px`,
      gap: resolvedGap,
      justifyContent: 'center',
      alignContent: 'center',
      width: '100%',
      // autoHeight applies the computed height explicitly instead of
      // the 200px floor below: the floor exists to prevent the
      // height:100%-against-a-heightless-parent deadlock documented
      // above, but that deadlock is specifically about not knowing
      // the height at all — autoHeight means Core just told us
      // exactly what it should be, so trusting that computed value,
      // even when it's small, is correct here instead of second-
      // guessing it with an unrelated floor.
      ...(autoHeight ? { height: totalHeight } : { minHeight: DEFAULT_MIN_HEIGHT }),
      boxSizing: 'border-box',
      ...style,
    };

    return (
      <div ref={mergeRefs(internalRef, forwardedRef)} style={gridStyle} {...rest}>
        {children}
      </div>
    );
  },
);

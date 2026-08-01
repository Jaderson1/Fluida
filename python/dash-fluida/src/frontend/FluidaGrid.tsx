import type { ContainerLayoutOptions, ContainerLayoutResult } from '@fluida/core';
import { computeContainerLayout } from '@fluida/core';
import type { CSSProperties, ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Standalone re-implementation of the same ResizeObserver +
 * requestAnimationFrame coalescing pattern used in @fluida/react's
 * useFluidaContainerSize — not imported from @fluida/react itself.
 * dash-fluida depends only on @fluida/core, the same way @fluida/react
 * does; it does not depend on @fluida/react. useState/useEffect is
 * used here instead of useSyncExternalStore because a Dash custom
 * component only ever renders in the browser — there is no
 * server-side rendering concern to guard against here, unlike in the
 * React adapter.
 */

const DEFAULT_MIN_HEIGHT = 200;

const NOT_YET_MEASURED: ContainerLayoutResult = {
  columns: 1,
  rows: 1,
  cellWidth: 0,
  cellHeight: 0,
};

export interface FluidaGridProps {
  readonly id?: string;
  readonly children?: ReactNode;
  /** Required. */
  readonly item_count: number;
  readonly strategy?: 'fit' | 'fill' | 'balanced' | 'preserve-ratio';
  readonly gap?: number;
  readonly aspect_ratio?: number;
  readonly min_item_width?: number;
  readonly style?: CSSProperties;
  readonly className?: string;
  /**
   * When true, the computed layout is also sent to the Python side via
   * setProps (columns, rows, cellWidth, cellHeight), batched into one
   * call per animation frame — never once per raw resize event.
   * Defaults to false: by default, nothing is sent to the server at
   * all, and the computed layout only drives this component's own
   * rendering.
   */
  readonly notify_layout_changes?: boolean;
  /**
   * When true, this grid's own measured height is never fed back into
   * the layout computation — @fluida/core computes cellHeight purely
   * from the measured width, min_item_width, and strategy, and this
   * component then applies an explicit height (rows * cellHeight +
   * (rows-1) * gap) instead of the 200px floor below. Only
   * strategy="fit"/min_item_width and strategy="preserve-ratio"/
   * min_item_width support this; "fill" and "balanced" raise the same
   * FluidaConfigError @fluida/core itself raises for that combination.
   * Defaults to False: existing behavior is unchanged unless set.
   */
  readonly auto_height?: boolean;
  /** Provided by the Dash renderer itself. */
  readonly setProps?: (nextProps: Record<string, unknown>) => void;
}

export default function FluidaGrid(props: FluidaGridProps) {
  const {
    id,
    children,
    item_count,
    strategy = 'fit',
    gap = 16,
    aspect_ratio = 1,
    min_item_width,
    style,
    className,
    notify_layout_changes = false,
    auto_height = false,
    setProps,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<ContainerLayoutResult>(NOT_YET_MEASURED);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const options: ContainerLayoutOptions = {
      itemCount: item_count,
      strategy,
      gap,
      aspectRatio: aspect_ratio,
      minItemWidth: min_item_width,
    };

    const canScheduleFrame = typeof requestAnimationFrame === 'function';
    let pendingFrameId: number | null = null;

    const applyMeasurement = (width: number, height: number): void => {
      pendingFrameId = null;
      // computeContainerLayout from @fluida/core — never
      // reimplemented here. auto_height passes undefined for height
      // regardless of what was actually measured — the measured
      // height is simply unused in that case, requesting Core's own
      // auto-height mode instead of feeding a height back in.
      const nextLayout = computeContainerLayout(width, auto_height ? undefined : height, options);
      setLayout(nextLayout);

      if (notify_layout_changes && setProps) {
        setProps({
          columns: nextLayout.columns,
          rows: nextLayout.rows,
          cellWidth: nextLayout.cellWidth,
          cellHeight: nextLayout.cellHeight,
        });
      }
    };

    const scheduleMeasurement = (width: number, height: number): void => {
      if (!canScheduleFrame) {
        // No requestAnimationFrame available — fall back to
        // immediate, uncoalesced application rather than never
        // updating at all.
        applyMeasurement(width, height);
        return;
      }

      if (pendingFrameId !== null) return; // a frame is already scheduled

      pendingFrameId = requestAnimationFrame(() => {
        applyMeasurement(width, height);
      });
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      scheduleMeasurement(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (pendingFrameId !== null && canScheduleFrame) {
        cancelAnimationFrame(pendingFrameId);
        pendingFrameId = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item_count, strategy, gap, aspect_ratio, min_item_width, notify_layout_changes, auto_height, setProps]);

  // totalHeight is computed here, in the component, not returned by
  // @fluida/core itself — one line of arithmetic from fields Core
  // already produces (rows, cellHeight) plus a value already in
  // scope (gap), matching the same decision made in @fluida/react's
  // FluidaAdaptiveGrid.
  const resolvedGap = gap;
  const totalHeight = layout.rows * layout.cellHeight + (layout.rows - 1) * resolvedGap;

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${layout.columns}, ${layout.cellWidth}px)`,
    gridAutoRows: `${layout.cellHeight}px`,
    gap,
    justifyContent: 'center',
    alignContent: 'center',
    width: '100%',
    // auto_height applies the computed height explicitly instead of
    // the 200px floor below — see FluidaAdaptiveGrid's own comment
    // on the equivalent decision for the full reasoning.
    ...(auto_height ? { height: totalHeight } : { minHeight: DEFAULT_MIN_HEIGHT }),
    boxSizing: 'border-box',
    ...style,
  };

  return (
    <div id={id} ref={containerRef} className={className} style={gridStyle}>
      {children}
    </div>
  );
}

FluidaGrid.propTypes = {
  id: PropTypes.string,
  children: PropTypes.node,
  item_count: PropTypes.number.isRequired,
  strategy: PropTypes.oneOf(['fit', 'fill', 'balanced', 'preserve-ratio']),
  gap: PropTypes.number,
  aspect_ratio: PropTypes.number,
  min_item_width: PropTypes.number,
  style: PropTypes.object,
  className: PropTypes.string,
  notify_layout_changes: PropTypes.bool,
  auto_height: PropTypes.bool,
  setProps: PropTypes.func,
};

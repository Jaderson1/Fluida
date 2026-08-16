import type { ContainerLayoutOptions, ContainerLayoutResult } from '@fluida/core';
import { computeContainerLayout } from '@fluida/core';
import type { CSSProperties, ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Standalone re-implementation of the ResizeObserver +
 * requestAnimationFrame coalescing pattern used in @fluida/react's
 * useFluidaContainerSize — dash-fluida depends only on @fluida/core,
 * not on @fluida/react. useState/useEffect instead of
 * useSyncExternalStore, since a Dash component only ever renders in
 * the browser — no SSR concern here.
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
   * When true, the computed layout is also sent to Python via
   * setProps (columns, rows, cellWidth, cellHeight), batched to once
   * per animation frame. Defaults to false — nothing is sent to the
   * server otherwise.
   */
  readonly notify_layout_changes?: boolean;
  /**
   * When true, computes cellHeight from measured width,
   * min_item_width, and strategy alone, applied as an explicit height
   * instead of the 200px floor below. Only "fit"/"preserve-ratio"
   * with min_item_width support this; "fill"/"balanced" raise the
   * same FluidaConfigError @fluida/core raises for that combination.
   * Defaults to False — unchanged unless set.
   */
  readonly auto_height?: boolean;
  /**
   * Forwarded as the rendered element's aria-label. Nothing set
   * unless provided — FluidaGrid is a layout container, not a
   * landmark or widget, with no semantic meaning of its own.
   */
  readonly aria_label?: string;
  /**
   * Any other DOM attribute, most commonly aria-* or data-*, applied
   * directly to the rendered element, e.g.
   * extra_attrs={"data-testid": "charts-grid"}.
   */
  readonly extra_attrs?: Record<string, string>;
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
    aria_label,
    extra_attrs,
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
    let latestMeasurement: { width: number; height: number } | null = null;
    let isMounted = true;

    // latestMeasurement is written on every ResizeObserver callback,
    // whether or not a frame is already pending — only the frame
    // itself is coalesced, never the value it will read. Reading it
    // here, at the time the frame actually runs, is what makes this
    // apply the most recent measurement instead of whichever one
    // happened to schedule the pending frame.
    const applyMeasurement = (): void => {
      pendingFrameId = null;
      if (!isMounted || latestMeasurement === null) return;

      const { width, height } = latestMeasurement;
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
      latestMeasurement = { width, height };

      if (!canScheduleFrame) {
        applyMeasurement();
        return;
      }

      if (pendingFrameId !== null) return; // a frame is already scheduled; it reads latestMeasurement when it runs

      pendingFrameId = requestAnimationFrame(applyMeasurement);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      scheduleMeasurement(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(element);

    return () => {
      isMounted = false;
      observer.disconnect();
      if (pendingFrameId !== null && canScheduleFrame) {
        cancelAnimationFrame(pendingFrameId);
        pendingFrameId = null;
      }
      latestMeasurement = null;
    };
  }, [
    item_count,
    strategy,
    gap,
    aspect_ratio,
    min_item_width,
    notify_layout_changes,
    auto_height,
    setProps,
  ]);

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
    <div
      id={id}
      ref={containerRef}
      className={className}
      style={gridStyle}
      aria-label={aria_label}
      {...extra_attrs}
    >
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
  aria_label: PropTypes.string,
  extra_attrs: PropTypes.object,
  notify_layout_changes: PropTypes.bool,
  auto_height: PropTypes.bool,
  setProps: PropTypes.func,
};

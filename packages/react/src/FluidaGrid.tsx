import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { forwardRef } from 'react';

import { useFluidaLayout } from './useFluidaLayout';

export type FluidaGridProps = ComponentPropsWithoutRef<'div'>;

/**
 * A CSS grid whose column count and gap come directly from Core's
 * grid and spacing tokens. Tracks are minmax(0, 1fr) rather than a
 * bare 1fr — a bare 1fr implies a minimum of `auto`, which won't
 * let a track shrink below its content's natural size, so a long
 * unbroken string or a wide image can force the whole grid past its
 * container. minmax(0, 1fr) removes that floor.
 *
 * Does not force line-wrapping inside cell content — add
 * `overflow-wrap: anywhere` or truncate with `text-overflow:
 * ellipsis` yourself if a cell's content needs it; that choice is
 * left to you.
 */
export const FluidaGrid = forwardRef<HTMLDivElement, FluidaGridProps>(
  function FluidaGrid({ style, ...rest }, ref) {
    const layout = useFluidaLayout();

    const gridStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${layout.grid.columns}, minmax(0, 1fr))`,
      gap: layout.spacing.page,
      width: '100%',
      boxSizing: 'border-box',
      ...style,
    };

    return <div ref={ref} style={gridStyle} {...rest} />;
  },
);
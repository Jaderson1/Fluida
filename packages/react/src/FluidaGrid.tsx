import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { forwardRef } from 'react';

import { useFluidaLayout } from './useFluidaLayout';

export type FluidaGridProps = ComponentPropsWithoutRef<'div'>;

/**
 * A CSS grid whose column count and gap come directly from Core's
 * grid and spacing tokens. Tracks are minmax(0, 1fr) rather than a
 * bare 1fr on purpose: a bare 1fr track's implicit minimum is `auto`
 * (its content's natural size), which lets a single wide or
 * unbreakable child force the whole grid past its container's edge.
 * Flooring the minimum at 0 lets tracks shrink below their content's
 * natural size instead, so overflow doesn't happen even if a child's
 * content doesn't want to shrink on its own.
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
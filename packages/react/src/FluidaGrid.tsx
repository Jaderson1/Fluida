import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { forwardRef } from 'react';

import { useFluidaLayout } from './useFluidaLayout';

export type FluidaGridProps = ComponentPropsWithoutRef<'div'>;

/**
 * A CSS grid whose column count and gap come directly from Core's
 * grid and spacing tokens. Tracks are minmax(0, 1fr) rather than a
 * bare 1fr on purpose: a bare 1fr track is shorthand for
 * minmax(auto, 1fr), and that auto minimum won't let the track
 * shrink below its content's natural size — a long URL, an
 * unbroken identifier, or a wide image can force the whole grid
 * past its container. minmax(0, 1fr) removes that floor, so the
 * grid container itself is never forced wider by content.
 *
 * What this does not do: force line-breaking inside your own cell
 * content. FluidaGrid doesn't own or wrap its children, so it has
 * no way to apply `overflow-wrap` to them without cloning and
 * silently rewriting whatever styling you already gave them — and
 * doing that unconditionally would be presumptuous, since truncating
 * with an ellipsis instead of wrapping is an equally valid choice
 * some consumers want. If a cell's own content is a long unbroken
 * string, add `overflow-wrap: anywhere` (to let it break) or
 * `overflow: hidden` with `text-overflow: ellipsis` (to truncate it)
 * to that content yourself — that choice is intentionally left to
 * you, not decided by this component.
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
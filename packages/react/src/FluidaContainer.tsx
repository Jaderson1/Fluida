import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { forwardRef } from 'react';

import { useFluidaLayout } from './useFluidaLayout';

export type FluidaContainerProps = ComponentPropsWithoutRef<'div'>;

/**
 * A centered content wrapper whose max-width and horizontal padding
 * come directly from Core's container and spacing tokens — nothing
 * here is computed independently. Reacts to viewport width changes
 * the same way useFluidaLayout() does; it does not observe its own
 * element size (no ResizeObserver, no CSS container queries yet).
 */
export const FluidaContainer = forwardRef<HTMLDivElement, FluidaContainerProps>(
  function FluidaContainer({ style, ...rest }, ref) {
    const layout = useFluidaLayout();

    const containerStyle: CSSProperties = {
      width: '100%',
      maxWidth: layout.container.maxWidth,
      paddingLeft: layout.spacing.page,
      paddingRight: layout.spacing.page,
      marginLeft: 'auto',
      marginRight: 'auto',
      boxSizing: 'border-box',
      ...style,
    };

    return <div ref={ref} style={containerStyle} {...rest} />;
  },
);
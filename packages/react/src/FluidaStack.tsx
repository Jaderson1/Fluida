import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { forwardRef } from 'react';

import { useFluidaLayout } from './useFluidaLayout';

export interface FluidaStackProps extends ComponentPropsWithoutRef<'div'> {
  /** Flex direction when not collapsed. Defaults to 'column'. */
  readonly direction?: 'row' | 'column';
  /** Gap between children. Defaults to Core's spacing.page token. */
  readonly gap?: number;
  /**
   * When true, forces column direction whenever Core's own
   * breakpoint is 'mobile' — regardless of `direction`. This reads
   * layout.breakpoint directly; it never re-derives "small screen"
   * from width or any threshold of its own.
   */
  readonly stackOnMobile?: boolean;
}

export const FluidaStack = forwardRef<HTMLDivElement, FluidaStackProps>(
  function FluidaStack(
    { direction = 'column', gap, stackOnMobile = false, style, ...rest },
    ref,
  ) {
    const layout = useFluidaLayout();

    const resolvedDirection =
      stackOnMobile && layout.breakpoint === 'mobile' ? 'column' : direction;

    const stackStyle: CSSProperties = {
      display: 'flex',
      flexDirection: resolvedDirection,
      gap: gap ?? layout.spacing.page,
      ...style,
    };

    return <div ref={ref} style={stackStyle} {...rest} />;
  },
);
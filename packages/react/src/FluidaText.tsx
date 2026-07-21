import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  Ref,
} from 'react';
import { forwardRef } from 'react';

import { useFluidaLayout } from './useFluidaLayout';

export type FluidaTextElement =
  | 'p'
  | 'span'
  | 'div'
  | 'label'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6';

export interface FluidaTextProps extends ComponentPropsWithoutRef<'div'> {
  /** Which HTML element to render. Defaults to 'p'. */
  readonly as?: FluidaTextElement;
}

type StyleWithCustomProperty = CSSProperties & Record<`--${string}`, string | number>;

/**
 * Applies Core's typography.scale as a font-size multiplier.
 *
 * layout.typography.scale is a multiplier (roughly 1 to 1.25), not an
 * absolute size — and inline styles always win over a browser's own
 * user-agent stylesheet defaults (an <h1> is normally bigger than a
 * <p> only because of a UA stylesheet rule, which any inline
 * font-size unconditionally overrides). Because of that, this
 * component cannot both set a default font-size AND preserve each
 * semantic tag's natural size difference — no CSS unit choice avoids
 * that; it's a property of how the cascade works, not an
 * implementation detail here.
 *
 * The choice made: default to a flat `${scale}rem`, the same
 * computed size regardless of `as`. This is honest about what Fluida
 * actually knows (a multiplier) rather than guessing at proportions
 * it has no basis for. For a heading that should be visibly larger
 * than body text, use the `--fluida-type-scale` custom property this
 * component also sets, e.g. in your own CSS:
 *   font-size: calc(2rem * var(--fluida-type-scale, 1));
 * That composes Fluida's scale with your own base size, without
 * needing to call any hook directly.
 */
export const FluidaText = forwardRef<HTMLElement, FluidaTextProps>(
  function FluidaText({ as = 'p', style, ...rest }, ref) {
    const layout = useFluidaLayout();

    const textStyle: StyleWithCustomProperty = {
      fontSize: `${layout.typography.scale}rem`,
      '--fluida-type-scale': layout.typography.scale,
      ...style,
    };

    const Element = as as ElementType;

    return (
      <Element
        ref={ref as Ref<never>}
        style={textStyle}
        {...rest}
      />
    );
  },
);
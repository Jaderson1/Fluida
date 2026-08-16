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
 * The scale is a multiplier (roughly 1 to 1.4), not an absolute
 * size — and an inline font-size always overrides a tag's natural
 * size difference from the browser's default stylesheet. So this
 * component can't both set a default font-size and preserve each
 * tag's natural size (an <h1> looking bigger than a <p>): that's how
 * the CSS cascade works, not something to work around here.
 *
 * The choice made: a flat `${scale}rem` regardless of `as` — honest
 * about what Fluida actually knows (a multiplier), not a guess at
 * proportions it has no basis for. For a heading that should look
 * larger than body text, compose the `--fluida-type-scale` custom
 * property this component also sets with your own base size:
 *   font-size: calc(2rem * var(--fluida-type-scale, 1));
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
export { createFluida } from './createFluida';
export { FluidaConfigError } from './resolveFluidaConfig';
export { computeContainerLayout } from './engine/computeContainerLayout';

export type {
  FluidaConfig,
  FluidaInstance,
  FluidaOrientation,
  FluidaSnapshot,
} from './types';

export type {
  Breakpoint,
  Breakpoints,
  ContainerConfig,
  ContainerLayout,
  ContainerLayoutOptions,
  ContainerLayoutResult,
  ContainerLayoutStrategy,
  ContainerTier,
  GridLayout,
  LayoutTokens,
  SpacingConfig,
  SpacingLayout,
  TypographyConfig,
  TypographyLayout,
} from './engine/types';
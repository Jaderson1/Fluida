export { FluidaProvider } from './FluidaProvider';
export type { FluidaProviderProps } from './FluidaProvider';

export { FluidaReactError } from './FluidaContext';

export { FluidaContainer } from './FluidaContainer';
export type { FluidaContainerProps } from './FluidaContainer';

export { FluidaGrid } from './FluidaGrid';
export type { FluidaGridProps } from './FluidaGrid';

export { FluidaStack } from './FluidaStack';
export type { FluidaStackProps } from './FluidaStack';

export { FluidaText } from './FluidaText';
export type { FluidaTextElement, FluidaTextProps } from './FluidaText';

export { FluidaContainerGrid } from './FluidaContainerGrid';
export type { FluidaContainerGridProps } from './FluidaContainerGrid';

/** @deprecated Renamed to `FluidaContainerGrid` — see FluidaAdaptiveGrid.tsx. */
export { FluidaAdaptiveGrid } from './FluidaAdaptiveGrid';
/** @deprecated Renamed to `FluidaContainerGridProps`. */
export type { FluidaAdaptiveGridProps } from './FluidaAdaptiveGrid';

export { useFluidaContainerSize } from './useFluidaContainerSize';
export type { ContainerSize } from './useFluidaContainerSize';

export { useFluidaContainerLayout } from './useFluidaContainerLayout';

export { useFluidaSnapshot } from './useFluidaSnapshot';
export { useFluidaLayout } from './useFluidaLayout';

export { useFluida } from './useFluida';
export type { UseFluidaResult } from './useFluida';

export type {
  ContainerLayoutOptions,
  ContainerLayoutResult,
  ContainerLayoutStrategy,
  FluidaConfig,
  FluidaSnapshot,
  LayoutTokens,
} from '@fluida/core';
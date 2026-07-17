import type { FluidaOrientation } from './environment/types';
import type { Breakpoints } from './engine/types';

export type { FluidaOrientation } from './environment/types';

export interface FluidaSnapshot {
  readonly width: number;
  readonly height: number;
  readonly orientation: FluidaOrientation;
  readonly pixelRatio: number;
}

export interface FluidaConfig {
  readonly breakpoints?: Breakpoints;
}

export interface FluidaInstance {
  getSnapshot(): FluidaSnapshot;
  getServerSnapshot(): FluidaSnapshot;
  subscribe(listener: () => void): () => void;
  destroy(): void;
}
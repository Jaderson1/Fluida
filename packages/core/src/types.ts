import type { FluidaOrientation } from './environment/types';
import type {
  Breakpoints,
  LayoutTokens,
  SpacingConfig,
  TypographyConfig,
} from './engine/types';

export type { FluidaOrientation } from './environment/types';

export interface FluidaSnapshot {
  readonly width: number;
  readonly height: number;
  readonly orientation: FluidaOrientation;
  readonly pixelRatio: number;
}

export interface FluidaConfig {
  readonly breakpoints?: Breakpoints;
  readonly spacing?: SpacingConfig;
  readonly typography?: TypographyConfig;
}

export interface FluidaInstance {
  getSnapshot(): FluidaSnapshot;
  getServerSnapshot(): FluidaSnapshot;
  getLayout(): LayoutTokens;
  getServerLayout(): LayoutTokens;
  subscribe(listener: () => void): () => void;
  destroy(): void;
}
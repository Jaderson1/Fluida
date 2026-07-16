export type FluidaOrientation = 'portrait' | 'landscape';

/**
 * A single, point-in-time reading of the physical environment.
 *
 * This is the raw input used by the store layer to derive FluidaSnapshot.
 * It does not contain computed values such as breakpoints or layout tokens.
 */
export interface EnvironmentSnapshot {
  readonly width: number;
  readonly height: number;
  readonly orientation: FluidaOrientation;
  readonly pixelRatio: number;
}

/**
 * Reads the environment synchronously.
 *
 * Readers that depend on asynchronous data must resolve that data
 * before implementing this contract.
 */
export interface EnvironmentReader {
  readEnvironment(): EnvironmentSnapshot;
}
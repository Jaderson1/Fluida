import type { FluidaConfig, FluidaInstance, FluidaSnapshot } from './types';

const DEFAULT_SNAPSHOT: FluidaSnapshot = {
  width: 0,
  height: 0,
  orientation: 'portrait',
  pixelRatio: 1,
};

export function createFluida(
  _config?: FluidaConfig,
): FluidaInstance {
  return {
    getSnapshot() {
      return DEFAULT_SNAPSHOT;
    },

    getServerSnapshot() {
      return DEFAULT_SNAPSHOT;
    },

    subscribe(_listener) {
      return () => {};
    },

    destroy() {},
  };
}
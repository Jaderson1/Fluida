import type {
  FluidaConfig,
  FluidaInstance,
  FluidaSnapshot,
} from './types';

import { createBrowserEnvironmentReader } from './environment/createBrowserEnvironmentReader';
import { createServerEnvironmentReader } from './environment/createServerEnvironmentReader';

const SERVER_SNAPSHOT: FluidaSnapshot = {
  width: 0,
  height: 0,
  orientation: 'portrait',
  pixelRatio: 1,
};

export function createFluida(
  _config?: FluidaConfig,
): FluidaInstance {
  const reader =
    typeof window === 'undefined'
      ? createServerEnvironmentReader()
      : createBrowserEnvironmentReader();

  return {
    getSnapshot() {
      return reader.readEnvironment();
    },

    getServerSnapshot() {
      return SERVER_SNAPSHOT;
    },

    subscribe() {
      return () => {};
    },

    destroy() {},
  };
}
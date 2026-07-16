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

const NOOP = (): void => {};

export function createFluida(
  _config?: FluidaConfig,
): FluidaInstance {
  const isBrowser = typeof window !== 'undefined';

  const reader = isBrowser
    ? createBrowserEnvironmentReader()
    : createServerEnvironmentReader();

  let currentSnapshot = reader.readEnvironment();
  let isDestroyed = false;
  let isListening = false;

  const listeners = new Set<() => void>();

  function areSnapshotsEqual(
    previous: FluidaSnapshot,
    next: FluidaSnapshot,
  ): boolean {
    return (
      previous.width === next.width &&
      previous.height === next.height &&
      previous.orientation === next.orientation &&
      previous.pixelRatio === next.pixelRatio
    );
  }

  function notifyListeners(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function updateSnapshot(): void {
    if (isDestroyed) {
      return;
    }

    const nextSnapshot = reader.readEnvironment();

    if (areSnapshotsEqual(currentSnapshot, nextSnapshot)) {
      return;
    }

    currentSnapshot = nextSnapshot;
    notifyListeners();
  }

  return {
    getSnapshot() {
      return currentSnapshot;
    },

    getServerSnapshot() {
      return SERVER_SNAPSHOT;
    },

    subscribe(listener) {
      if (isDestroyed) {
        return NOOP;
      }

      // Só começa a escutar o navegador
      // quando existir o primeiro subscriber.
      if (!isListening && isBrowser) {
        window.addEventListener('resize', updateSnapshot);
        isListening = true;
      }

      const subscription = () => listener();

      listeners.add(subscription);

      return () => {
        listeners.delete(subscription);
      };
    },

    destroy() {
      if (isDestroyed) {
        return;
      }

      isDestroyed = true;

      // Remove o listener do navegador
      if (isListening && isBrowser) {
        window.removeEventListener('resize', updateSnapshot);
        isListening = false;
      }

      listeners.clear();
    },
  };
}
import type {
  FluidaConfig,
  FluidaInstance,
  FluidaSnapshot,
} from './types';

import { createBrowserEnvironmentReader } from './environment/createBrowserEnvironmentReader';
import { createServerEnvironmentReader } from './environment/createServerEnvironmentReader';
import { computeLayout } from './engine/computeLayout';
import type { EngineConfig, LayoutTokens } from './engine/types';

const SERVER_SNAPSHOT: FluidaSnapshot = {
  width: 0,
  height: 0,
  orientation: 'portrait',
  pixelRatio: 1,
};

const NOOP = (): void => {};

function toEngineConfig(config: FluidaConfig): EngineConfig {
  return {
    breakpoints: config.breakpoints,
    spacing: config.spacing,
    typography: config.typography,
  };
}

function areSnapshotsEqual(previous: FluidaSnapshot, next: FluidaSnapshot): boolean {
  return (
    previous.width === next.width &&
    previous.height === next.height &&
    previous.orientation === next.orientation &&
    previous.pixelRatio === next.pixelRatio
  );
}

function areLayoutsEqual(previous: LayoutTokens, next: LayoutTokens): boolean {
  return (
    previous.breakpoint === next.breakpoint &&
    previous.grid.columns === next.grid.columns &&
    previous.spacing.page === next.spacing.page &&
    previous.typography.scale === next.typography.scale
  );
}

export function createFluida(config: FluidaConfig = {}): FluidaInstance {
  const isBrowser = typeof window !== 'undefined';

  const reader = isBrowser
    ? createBrowserEnvironmentReader()
    : createServerEnvironmentReader();

  const engineConfig = toEngineConfig(config);

  let currentSnapshot = reader.readEnvironment();
  let currentLayout = computeLayout(currentSnapshot.width, engineConfig);

  const serverLayout = computeLayout(SERVER_SNAPSHOT.width, engineConfig);

  let isDestroyed = false;
  let isListening = false;

  const listeners = new Set<() => void>();

  function notifyListeners(): void {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        setTimeout(() => {
          throw error;
        }, 0);
      }
    }
  }

  function updateSnapshot(): void {
    if (isDestroyed) return;

    const nextSnapshot = reader.readEnvironment();
    if (areSnapshotsEqual(currentSnapshot, nextSnapshot)) return;

    currentSnapshot = nextSnapshot;

    const nextLayout = computeLayout(nextSnapshot.width, engineConfig);
    if (!areLayoutsEqual(currentLayout, nextLayout)) {
      currentLayout = nextLayout;
    }

    notifyListeners();
  }

  return {
    getSnapshot() {
      return currentSnapshot;
    },
    getServerSnapshot() {
      return SERVER_SNAPSHOT;
    },
    getLayout() {
      return currentLayout;
    },
    getServerLayout() {
      return serverLayout;
    },
    subscribe(listener) {
      if (isDestroyed) return NOOP;

      if (!isListening && isBrowser) {
        window.addEventListener('resize', updateSnapshot);
        isListening = true;
      }

      const subscription = () => listener();
      listeners.add(subscription);
      return () => listeners.delete(subscription);
    },
    destroy() {
      if (isDestroyed) return;
      isDestroyed = true;

      if (isListening && isBrowser) {
        window.removeEventListener('resize', updateSnapshot);
        isListening = false;
      }
      listeners.clear();
    },
  };
}
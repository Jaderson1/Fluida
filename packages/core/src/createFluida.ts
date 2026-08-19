import type {
  FluidaConfig,
  FluidaInstance,
  FluidaSnapshot,
} from './types';

import { createBrowserEnvironmentReader } from './environment/createBrowserEnvironmentReader';
import { createServerEnvironmentReader } from './environment/createServerEnvironmentReader';
import { computeLayout } from './engine/computeLayout';
import type { LayoutTokens } from './engine/types';
import { resolveFluidaConfig } from './resolveFluidaConfig';

const SERVER_SNAPSHOT: FluidaSnapshot = {
  width: 0,
  height: 0,
  orientation: 'portrait',
  pixelRatio: 1,
};

const NOOP = (): void => {};

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
    previous.typography.scale === next.typography.scale &&
    previous.container.maxWidth === next.container.maxWidth &&
    previous.display === next.display
  );
}

export function createFluida(config: FluidaConfig = {}): FluidaInstance {
  const isBrowser = typeof window !== 'undefined';

  const reader = isBrowser
    ? createBrowserEnvironmentReader()
    : createServerEnvironmentReader();

  const engineConfig = resolveFluidaConfig(config);

  let currentSnapshot = reader.readEnvironment();
  let currentLayout = computeLayout(currentSnapshot.width, currentSnapshot.height, engineConfig);

  const serverLayout = computeLayout(SERVER_SNAPSHOT.width, SERVER_SNAPSHOT.height, engineConfig);

  let isDestroyed = false;
  let isListening = false;
  let deferredReadTimeoutId: ReturnType<typeof setTimeout> | null = null;

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

    const nextLayout = computeLayout(nextSnapshot.width, nextSnapshot.height, engineConfig);
    if (!areLayoutsEqual(currentLayout, nextLayout)) {
      currentLayout = nextLayout;
    }

    notifyListeners();
  }

  // Three independent signals feed the same updateSnapshot (dedup via
  // areSnapshotsEqual): resize; visualViewport.resize, which tracks
  // pinch-zoom and on-screen keyboards separately from the layout
  // viewport; and orientationchange, which some devices fire without
  // also firing resize. No polling fallback if a browser dispatches
  // none of these — deliberately out of scope.
  function attachListeners(): void {
    window.addEventListener('resize', updateSnapshot);
    window.addEventListener('orientationchange', updateSnapshot);

    if (typeof window.visualViewport !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateSnapshot);
    }
  }

  function detachListeners(): void {
    window.removeEventListener('resize', updateSnapshot);
    window.removeEventListener('orientationchange', updateSnapshot);

    if (typeof window.visualViewport !== 'undefined' && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', updateSnapshot);
    }
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
        attachListeners();
        isListening = true;

        // A single deferred check, not a recurring poll: catches
        // drift between the eager read at construction and this
        // first real subscriber — for example, if the environment
        // changed in a way that dispatched none of the three events
        // above before anything was listening yet. Runs once, here,
        // and never again; every later change is caught by the
        // listeners themselves.
        deferredReadTimeoutId = setTimeout(updateSnapshot, 0);
      }

      const subscription = () => listener();
      listeners.add(subscription);
      return () => listeners.delete(subscription);
    },
    destroy() {
      if (isDestroyed) return;
      isDestroyed = true;

      if (deferredReadTimeoutId !== null) {
        clearTimeout(deferredReadTimeoutId);
        deferredReadTimeoutId = null;
      }

      if (isListening && isBrowser) {
        detachListeners();
        isListening = false;
      }
      listeners.clear();
    },
  };
}
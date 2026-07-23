import type { RefObject } from 'react';
import { useCallback, useRef, useSyncExternalStore } from 'react';

export interface ContainerSize {
  readonly width: number;
  readonly height: number;
}

const SERVER_CONTAINER_SIZE: ContainerSize = { width: 0, height: 0 };

function areSizesEqual(previous: ContainerSize, next: ContainerSize): boolean {
  return previous.width === next.width && previous.height === next.height;
}

/**
 * Measures a real DOM element's content-box size via ResizeObserver.
 * Unlike useFluidaSnapshot/useFluidaLayout, this does not read from
 * any shared @fluida/core instance and does not require
 * <FluidaProvider> — each call observes whichever element `ref` is
 * attached to, independently.
 *
 * A fresh ResizeObserver is created inside subscribe() itself, every
 * time subscribe runs, rather than stored once and reused. That's
 * deliberate: it means React Strict Mode's development-only
 * setup → cleanup → setup replay is naturally safe here, with no
 * special handling needed — each cycle's observer is fully
 * disconnected by its own paired cleanup before the next one is
 * created, so there's no persisted resource for the replay to tear
 * down out from under a later setup, unlike FluidaProvider's Core
 * instance.
 */
export function useFluidaContainerSize<T extends Element>(
  ref: RefObject<T | null>,
): ContainerSize {
  const sizeRef = useRef<ContainerSize>(SERVER_CONTAINER_SIZE);

  const getSnapshot = useCallback((): ContainerSize => sizeRef.current, []);

  const getServerSnapshot = useCallback(
    (): ContainerSize => SERVER_CONTAINER_SIZE,
    [],
  );

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      const element = ref.current;

      if (!element || typeof ResizeObserver === 'undefined') {
        return () => {};
      }

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;

        const nextSize: ContainerSize = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };

        if (!areSizesEqual(sizeRef.current, nextSize)) {
          sizeRef.current = nextSize;
          onStoreChange();
        }
      });

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    },
    [ref],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
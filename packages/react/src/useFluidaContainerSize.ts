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
 * Measures an element with ResizeObserver.
 *
 * Notifications are coalesced with requestAnimationFrame so rapid
 * measurements trigger at most one React update per frame. The latest
 * measured size always wins.
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

      const canScheduleFrame = typeof requestAnimationFrame === 'function';
      let pendingFrameId: number | null = null;

      const scheduleNotify = (): void => {
        if (!canScheduleFrame) {
          // No requestAnimationFrame available in this environment —
          // fall back to the old, uncoalesced behavior rather than
          // silently never notifying at all.
          onStoreChange();
          return;
        }

        if (pendingFrameId !== null) return; // a frame is already scheduled

        pendingFrameId = requestAnimationFrame(() => {
          pendingFrameId = null;
          onStoreChange();
        });
      };

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;

        const nextSize: ContainerSize = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };

        if (!areSizesEqual(sizeRef.current, nextSize)) {
          sizeRef.current = nextSize;
          scheduleNotify();
        }
      });

      observer.observe(element);

      return () => {
        observer.disconnect();

        if (pendingFrameId !== null && canScheduleFrame) {
          cancelAnimationFrame(pendingFrameId);
          pendingFrameId = null;
        }
      };
    },
    [ref],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
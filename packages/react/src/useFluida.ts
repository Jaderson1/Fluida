import type { FluidaSnapshot, LayoutTokens } from '@fluida/core';
import { useMemo } from 'react';

import { useFluidaLayout } from './useFluidaLayout';
import { useFluidaSnapshot } from './useFluidaSnapshot';

export interface UseFluidaResult {
  readonly viewport: FluidaSnapshot;
  readonly layout: LayoutTokens;
  readonly display: LayoutTokens['display'];
}

/**
 * Convenience hook combining useFluidaSnapshot() and useFluidaLayout()
 * — does not compute anything itself; display comes from
 * layout.display, computed once in @fluida/core, not recomputed here.
 *
 * Re-renders on every snapshot change, not just layout changes:
 * viewport (width/height/orientation/pixelRatio) updates on every
 * resize event, while layout's own fields only change when a
 * derived token (breakpoint, columns, spacing, typography,
 * containerMaxWidth, display) actually does. A component that only
 * needs layout-level values and wants to re-render only when those
 * change should use useFluidaLayout() directly instead — it does not
 * subscribe to viewport at all, and therefore skips renders this
 * hook would trigger.
 */
export function useFluida(): UseFluidaResult {
  const viewport = useFluidaSnapshot();
  const layout = useFluidaLayout();

  // viewport and layout are each already reference-stable across
  // renders where their own value hasn't changed (useSyncExternalStore
  // guarantees this) — memoizing here means the returned object is
  // too, instead of being a new literal on every render regardless.
  return useMemo(
    () => ({ viewport, layout, display: layout.display }),
    [viewport, layout],
  );
}

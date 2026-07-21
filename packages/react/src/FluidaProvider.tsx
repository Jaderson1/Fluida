import type { FluidaConfig, FluidaInstance } from '@fluida/core';
import { createFluida } from '@fluida/core';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { FluidaContext } from './FluidaContext';

export interface FluidaProviderProps {
  /**
   * Passed straight through to createFluida(). Read once, when this
   * Provider instance is first created — changing this prop on a
   * later render does not recreate the Core instance or re-validate
   * the config. That's a deliberate simplification for this first
   * adapter, not an oversight.
   */
  readonly config?: FluidaConfig;
  readonly children?: ReactNode;
}

export function FluidaProvider(props: FluidaProviderProps): ReactNode {
  const { config, children } = props;

  // Lazy initializer: runs once per Provider instance, not on every
  // render, and — critically for SSR — not shared across requests,
  // since each request renders its own fresh component tree.
  const [instance] = useState<FluidaInstance>(() => createFluida(config));

  // Holds a pending, not-yet-fired destroy() call, if one has been
  // scheduled by a cleanup that hasn't been followed by a new setup.
  // A ref, not a plain local variable, because it must survive
  // across the setup → cleanup → setup replay React's development
  // Strict Mode performs on every effect during the initial mount —
  // that replay reuses this same component instance and its refs;
  // it does not create a new one.
  const pendingDestroyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // If a previous cleanup scheduled a destroy and this setup is
    // now running again, that destroy was never real — cancel it.
    // This is the only case where that can happen: Strict Mode's
    // replay runs entirely synchronously (confirmed, not assumed —
    // see FluidaProvider.strictmode.test.tsx), so a setup that fires
    // again before the deferred destroy's timeout has elapsed can
    // only mean the "unmount" that scheduled it was simulated, not
    // real.
    if (pendingDestroyRef.current !== null) {
      clearTimeout(pendingDestroyRef.current);
      pendingDestroyRef.current = null;
    }

    return () => {
      // Deferred and cancelable, not immediate: destroying instance
      // synchronously here is exactly what breaks under Strict Mode,
      // since the same instance is about to be reused by the setup
      // that follows. Waiting one macrotask gives that following
      // setup — if there is one — the chance to cancel this before
      // it ever calls destroy() for real. A genuine final unmount has
      // no following setup to cancel it, so the instance still gets
      // destroyed, just not on the same tick as the cleanup.
      pendingDestroyRef.current = setTimeout(() => {
        instance.destroy();
        pendingDestroyRef.current = null;
      }, 0);
    };
  }, [instance]);

  return (
    <FluidaContext.Provider value={instance}>
      {children}
    </FluidaContext.Provider>
  );
}
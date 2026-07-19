import type { FluidaConfig, FluidaInstance } from '@fluida/core';
import { createFluida } from '@fluida/core';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    return () => {
      instance.destroy();
    };
  }, [instance]);

  return (
    <FluidaContext.Provider value={instance}>
      {children}
    </FluidaContext.Provider>
  );
}
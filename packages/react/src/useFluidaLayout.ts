import type { LayoutTokens } from '@fluida/core';
import { useSyncExternalStore } from 'react';

import { useFluidaInstance } from './FluidaContext';

export function useFluidaLayout(): LayoutTokens {
  const instance = useFluidaInstance();

  return useSyncExternalStore(
    instance.subscribe,
    instance.getLayout,
    instance.getServerLayout,
  );
}
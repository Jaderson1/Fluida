import type { FluidaSnapshot } from '@fluida/core';
import { useSyncExternalStore } from 'react';

import { useFluidaInstance } from './FluidaContext';

export function useFluidaSnapshot(): FluidaSnapshot {
  const instance = useFluidaInstance();

  return useSyncExternalStore(
    instance.subscribe,
    instance.getSnapshot,
    instance.getServerSnapshot,
  );
}
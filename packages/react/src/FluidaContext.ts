import type { FluidaInstance } from '@fluida/core';
import { createContext, useContext } from 'react';

/**
 * Thrown when useFluidaSnapshot() or useFluidaLayout() is called
 * outside a <FluidaProvider>. Public and instanceof-checkable, since
 * this is a real, reachable front-door mistake — forgetting to wrap
 * a subtree — not an internal misuse case.
 */
export class FluidaReactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FluidaReactError';
  }
}

export const FluidaContext = createContext<FluidaInstance | null>(null);

export function useFluidaInstance(): FluidaInstance {
  const instance = useContext(FluidaContext);

  if (instance === null) {
    throw new FluidaReactError(
      'Fluida: this hook must be used within a <FluidaProvider>. ' +
        'Wrap your app (or the part of it that needs Fluida) in <FluidaProvider>.',
    );
  }

  return instance;
}
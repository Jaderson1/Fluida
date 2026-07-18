import type {
  EnvironmentReader,
  EnvironmentSnapshot,
} from './types';

/**
 * Thrown when a browser-only reader is invoked outside a browser.
 * Internal on purpose: reachable only by importing this reader
 * directly and bypassing createFluida()'s own environment detection,
 * which never happens through the public API.
 */
class FluidaEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FluidaEnvironmentError';
  }
}

export function createBrowserEnvironmentReader(): EnvironmentReader {
  return {
    readEnvironment(): EnvironmentSnapshot {
      if (typeof window === 'undefined') {
        throw new FluidaEnvironmentError(
          'Fluida: createBrowserEnvironmentReader() cannot read the environment outside a browser.',
        );
      }

      const width = window.innerWidth;
      const height = window.innerHeight;

      return {
        width,
        height,

        // Ties go to portrait, matching the platform's own `orientation`
        // media feature — a square viewport is `portrait` in CSS too.
        orientation: width > height ? 'landscape' : 'portrait',

        pixelRatio: window.devicePixelRatio ?? 1,
      };
    },
  };
}
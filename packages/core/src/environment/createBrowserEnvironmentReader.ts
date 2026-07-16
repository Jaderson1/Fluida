import type {
  EnvironmentReader,
  EnvironmentSnapshot,
} from './types';

export function createBrowserEnvironmentReader(): EnvironmentReader {
  return {
    readEnvironment(): EnvironmentSnapshot {
      if (typeof window === 'undefined') {
        throw new Error(
          'Fluida: createBrowserEnvironmentReader() cannot read the environment outside a browser.',
        );
      }

      const width = window.innerWidth;
      const height = window.innerHeight;

      return {
        width,
        height,

        // Uma tela quadrada segue a convenção do CSS e é considerada portrait.
        orientation: width > height ? 'landscape' : 'portrait',

        pixelRatio: window.devicePixelRatio ?? 1,
      };
    },
  };
}
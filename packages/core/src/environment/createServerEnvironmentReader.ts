import type {
  EnvironmentReader,
  EnvironmentSnapshot,
} from './types';

const SERVER_SNAPSHOT: EnvironmentSnapshot = {
  width: 0,
  height: 0,
  orientation: 'portrait',
  pixelRatio: 1,
};

export function createServerEnvironmentReader(): EnvironmentReader {
  return {
    readEnvironment(): EnvironmentSnapshot {
      return SERVER_SNAPSHOT;
    },
  };
}
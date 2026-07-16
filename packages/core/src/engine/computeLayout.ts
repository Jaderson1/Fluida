import type { EnvironmentSnapshot } from '../environment/types';
import type { Layout } from './types';

export function computeLayout(
  _environment: EnvironmentSnapshot,
): Layout {
  return {
    breakpoint: 'mobile',
  };
}
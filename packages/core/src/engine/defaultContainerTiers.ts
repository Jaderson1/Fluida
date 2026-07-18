import type { ContainerTier } from './types';

export const DEFAULT_CONTAINER_TIERS: readonly ContainerTier[] = [
  { minimumWidth: 0, containerMaxWidth: 480 },
  { minimumWidth: 640, containerMaxWidth: 640 },
  { minimumWidth: 768, containerMaxWidth: 720 },
  { minimumWidth: 1024, containerMaxWidth: 960 },
  { minimumWidth: 1280, containerMaxWidth: 1140 },
  { minimumWidth: 1536, containerMaxWidth: 1320 },
];
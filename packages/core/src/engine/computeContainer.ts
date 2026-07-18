import type {
  ContainerConfig,
  ContainerLayout,
  ContainerTier,
} from './types';

import { DEFAULT_CONTAINER_TIERS } from './defaultContainerTiers';

export function computeContainer(
  width: number,
  config: ContainerConfig = {},
): ContainerLayout {
  const tiers = config.tiers ?? DEFAULT_CONTAINER_TIERS;

  const orderedTiers = ([...tiers] as ContainerTier[]).sort(
    (a, b) => a.minimumWidth - b.minimumWidth,
  );

  const firstTier = orderedTiers[0];

  if (!firstTier) {
    throw new Error(
      'At least one container tier must be configured.',
    );
  }

  let currentMaxWidth = firstTier.containerMaxWidth;

  for (const tier of orderedTiers) {
    if (width < tier.minimumWidth) {
      break;
    }

    currentMaxWidth = tier.containerMaxWidth;
  }

  return {
    maxWidth: currentMaxWidth,
  };
}
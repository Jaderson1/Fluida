import { describe, expect, it } from 'vitest';

import { FluidaAdaptiveGrid } from './FluidaAdaptiveGrid';
import { FluidaContainerGrid } from './FluidaContainerGrid';

describe('FluidaAdaptiveGrid (deprecated alias)', () => {
  it('is exactly FluidaContainerGrid — a re-export, not a second implementation', () => {
    expect(FluidaAdaptiveGrid).toBe(FluidaContainerGrid);
  });
});

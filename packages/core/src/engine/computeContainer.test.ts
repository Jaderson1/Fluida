import { describe, expect, it } from 'vitest';

import { computeContainer } from './computeContainer';

describe('computeContainer', () => {
  it('uses the smallest tier below the first threshold', () => {
    expect(computeContainer(320).maxWidth).toBe(480);
  });

  it('steps up at each default tier boundary', () => {
    expect(computeContainer(640).maxWidth).toBe(640);
    expect(computeContainer(768).maxWidth).toBe(720);
    expect(computeContainer(1024).maxWidth).toBe(960);
    expect(computeContainer(1280).maxWidth).toBe(1140);
    expect(computeContainer(1536).maxWidth).toBe(1320);
  });

  it('stays at the previous tier one pixel below a boundary', () => {
    expect(computeContainer(1279).maxWidth).toBe(960);
  });

  it('uses the largest tier for any width beyond it', () => {
    expect(computeContainer(3440).maxWidth).toBe(1320);
  });

  it('respects a fully custom tier list', () => {
    const tiers = [
      { minimumWidth: 0, containerMaxWidth: 300 },
      { minimumWidth: 500, containerMaxWidth: 600 },
    ];

    expect(computeContainer(100, { tiers }).maxWidth).toBe(300);
    expect(computeContainer(500, { tiers }).maxWidth).toBe(600);
    expect(computeContainer(900, { tiers }).maxWidth).toBe(600);
  });

  it('produces the same result regardless of tier order in the config', () => {
    const ordered = [
      { minimumWidth: 0, containerMaxWidth: 300 },
      { minimumWidth: 500, containerMaxWidth: 600 },
      { minimumWidth: 900, containerMaxWidth: 900 },
    ];
    const shuffled = [ordered[2]!, ordered[0]!, ordered[1]!];

    expect(computeContainer(700, { tiers: ordered }).maxWidth).toBe(
      computeContainer(700, { tiers: shuffled }).maxWidth,
    );
  });

  it('throws when no tiers are configured', () => {
    expect(() => computeContainer(500, { tiers: [] })).toThrow(
      'At least one container tier must be configured.',
    );
  });
});
import { describe, expect, it } from 'vitest';

import { FluidaConfigError, resolveFluidaConfig } from './resolveFluidaConfig';

describe('resolveFluidaConfig — valid configuration', () => {
  it('resolves to full defaults when no config is given', () => {
    const resolved = resolveFluidaConfig({});

    expect(resolved.breakpoints).toEqual({ mobile: 0, tablet: 768, desktop: 1024 });
    expect(resolved.spacing).toEqual({
      minimumWidth: 320,
      maximumWidth: 1440,
      minimumPadding: 16,
      maximumPadding: 48,
    });
    expect(resolved.typography).toEqual({
      minimumWidth: 320,
      maximumWidth: 1440,
      minimumScale: 1,
      maximumScale: 1.25,
    });
    expect(resolved.container.tiers.length).toBeGreaterThan(0);
  });

  it('preserves a fully custom, valid configuration exactly', () => {
    const config = {
      breakpoints: { mobile: 0, tablet: 600, desktop: 900 },
      spacing: {
        minimumWidth: 300,
        maximumWidth: 900,
        minimumPadding: 8,
        maximumPadding: 24,
      },
      typography: {
        minimumWidth: 300,
        maximumWidth: 900,
        minimumScale: 0.9,
        maximumScale: 1.1,
      },
      container: {
        tiers: [
          { minimumWidth: 0, containerMaxWidth: 400 },
          { minimumWidth: 600, containerMaxWidth: 800 },
        ],
      },
    };

    expect(resolveFluidaConfig(config)).toEqual(config);
  });
});

describe('resolveFluidaConfig — partial configuration', () => {
  it('fills in only the missing spacing fields with defaults', () => {
    const resolved = resolveFluidaConfig({
      spacing: { minimumPadding: 4, maximumPadding: 8 },
    });

    expect(resolved.spacing).toEqual({
      minimumWidth: 320,
      maximumWidth: 1440,
      minimumPadding: 4,
      maximumPadding: 8,
    });
  });

  it('fills in only the missing typography fields with defaults', () => {
    const resolved = resolveFluidaConfig({
      typography: { maximumScale: 2 },
    });

    expect(resolved.typography.minimumScale).toBe(1);
    expect(resolved.typography.maximumScale).toBe(2);
  });

  it('uses default breakpoints when breakpoints is entirely omitted', () => {
    const resolved = resolveFluidaConfig({
      spacing: { minimumPadding: 4 },
    });

    expect(resolved.breakpoints).toEqual({ mobile: 0, tablet: 768, desktop: 1024 });
  });

  it('uses default container tiers when container is entirely omitted', () => {
    const resolved = resolveFluidaConfig({
      spacing: { minimumPadding: 4 },
    });

    expect(resolved.container.tiers[0]).toEqual({
      minimumWidth: 0,
      containerMaxWidth: 480,
    });
  });
});

describe('resolveFluidaConfig — invalid configuration', () => {
  it('throws FluidaConfigError for an empty breakpoints object', () => {
    expect(() => resolveFluidaConfig({ breakpoints: {} as never })).toThrow(
      FluidaConfigError,
    );
  });

  it('throws for a non-finite breakpoint threshold', () => {
    expect(() =>
      resolveFluidaConfig({
        breakpoints: { mobile: 0, tablet: Number.NaN, desktop: 1024 },
      }),
    ).toThrow(FluidaConfigError);
  });

  it('throws for a negative breakpoint threshold', () => {
    expect(() =>
      resolveFluidaConfig({
        breakpoints: { mobile: -10, tablet: 768, desktop: 1024 },
      }),
    ).toThrow(FluidaConfigError);
  });

  it('throws when two breakpoints share the same threshold', () => {
    expect(() =>
      resolveFluidaConfig({
        breakpoints: { mobile: 0, tablet: 500, desktop: 500 },
      }),
    ).toThrow(/unique/);
  });

  it('throws when spacing.maximumWidth is not greater than spacing.minimumWidth', () => {
    expect(() =>
      resolveFluidaConfig({
        spacing: { minimumWidth: 800, maximumWidth: 800 },
      }),
    ).toThrow(FluidaConfigError);
  });

  it('throws when typography.maximumWidth is not greater than typography.minimumWidth', () => {
    expect(() =>
      resolveFluidaConfig({
        typography: { minimumWidth: 900, maximumWidth: 300 },
      }),
    ).toThrow(FluidaConfigError);
  });

  it('throws for negative spacing padding', () => {
    expect(() =>
      resolveFluidaConfig({ spacing: { minimumPadding: -1 } }),
    ).toThrow(FluidaConfigError);
  });

  it('throws for a zero or negative typography scale', () => {
    expect(() =>
      resolveFluidaConfig({ typography: { minimumScale: 0 } }),
    ).toThrow(FluidaConfigError);

    expect(() =>
      resolveFluidaConfig({ typography: { maximumScale: -1 } }),
    ).toThrow(FluidaConfigError);
  });

  it('throws for a non-finite spacing value', () => {
    expect(() =>
      resolveFluidaConfig({ spacing: { maximumPadding: Number.POSITIVE_INFINITY } }),
    ).toThrow(FluidaConfigError);
  });

  it('still allows an inverted output range (padding shrinking as width grows)', () => {
    const resolved = resolveFluidaConfig({
      spacing: { minimumPadding: 48, maximumPadding: 16 },
    });

    expect(resolved.spacing.minimumPadding).toBe(48);
    expect(resolved.spacing.maximumPadding).toBe(16);
  });

  it('throws for an empty container tier list', () => {
    expect(() =>
      resolveFluidaConfig({ container: { tiers: [] } }),
    ).toThrow(FluidaConfigError);
  });

  it('throws when two container tiers share the same minimumWidth', () => {
    expect(() =>
      resolveFluidaConfig({
        container: {
          tiers: [
            { minimumWidth: 0, containerMaxWidth: 400 },
            { minimumWidth: 0, containerMaxWidth: 800 },
          ],
        },
      }),
    ).toThrow(/unique/);
  });

  it('throws for a negative container tier value', () => {
    expect(() =>
      resolveFluidaConfig({
        container: { tiers: [{ minimumWidth: -10, containerMaxWidth: 400 }] },
      }),
    ).toThrow(FluidaConfigError);
  });

  it('throws for a non-finite container tier value', () => {
    expect(() =>
      resolveFluidaConfig({
        container: {
          tiers: [{ minimumWidth: 0, containerMaxWidth: Number.NaN }],
        },
      }),
    ).toThrow(FluidaConfigError);
  });
});
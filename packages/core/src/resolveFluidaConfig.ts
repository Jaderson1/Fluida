import type { FluidaConfig } from './types';
import type { Breakpoints, SpacingConfig, TypographyConfig } from './engine/types';

import { DEFAULT_BREAKPOINTS } from './engine/defaultBreakpoints';
import {
  DEFAULT_MINIMUM_WIDTH as SPACING_DEFAULT_MINIMUM_WIDTH,
  DEFAULT_MAXIMUM_WIDTH as SPACING_DEFAULT_MAXIMUM_WIDTH,
  DEFAULT_MINIMUM_PADDING,
  DEFAULT_MAXIMUM_PADDING,
} from './engine/computeSpacing';
import {
  DEFAULT_MINIMUM_WIDTH as TYPOGRAPHY_DEFAULT_MINIMUM_WIDTH,
  DEFAULT_MAXIMUM_WIDTH as TYPOGRAPHY_DEFAULT_MAXIMUM_WIDTH,
  DEFAULT_MINIMUM_SCALE,
  DEFAULT_MAXIMUM_SCALE,
} from './engine/computeTypography';

export class FluidaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FluidaConfigError';
  }
}

export interface ResolvedEngineConfig {
  readonly breakpoints: Breakpoints;
  readonly spacing: Required<SpacingConfig>;
  readonly typography: Required<TypographyConfig>;
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new FluidaConfigError(`Fluida config: "${label}" must be a finite number, received ${value}.`);
  }
}

function assertNonNegative(value: number, label: string): void {
  if (value < 0) {
    throw new FluidaConfigError(`Fluida config: "${label}" must not be negative, received ${value}.`);
  }
}

function assertPositive(value: number, label: string): void {
  if (value <= 0) {
    throw new FluidaConfigError(`Fluida config: "${label}" must be greater than zero, received ${value}.`);
  }
}

function resolveBreakpoints(breakpoints: Breakpoints | undefined): Breakpoints {
  const resolved = breakpoints ?? DEFAULT_BREAKPOINTS;
  const entries = Object.entries(resolved);

  if (entries.length === 0) {
    throw new FluidaConfigError('Fluida config: at least one breakpoint must be configured.');
  }

  const values: number[] = [];
  for (const [name, value] of entries) {
    assertFinite(value, `breakpoints.${name}`);
    assertNonNegative(value, `breakpoints.${name}`);
    values.push(value);
  }

  if (new Set(values).size !== values.length) {
    throw new FluidaConfigError(
      'Fluida config: breakpoint thresholds must be unique — two breakpoints ' +
        'share the same value, which makes classification ambiguous.',
    );
  }

  return resolved;
}

function resolveSpacing(spacing: SpacingConfig | undefined): Required<SpacingConfig> {
  const minimumWidth = spacing?.minimumWidth ?? SPACING_DEFAULT_MINIMUM_WIDTH;
  const maximumWidth = spacing?.maximumWidth ?? SPACING_DEFAULT_MAXIMUM_WIDTH;
  const minimumPadding = spacing?.minimumPadding ?? DEFAULT_MINIMUM_PADDING;
  const maximumPadding = spacing?.maximumPadding ?? DEFAULT_MAXIMUM_PADDING;

  assertFinite(minimumWidth, 'spacing.minimumWidth');
  assertFinite(maximumWidth, 'spacing.maximumWidth');
  assertFinite(minimumPadding, 'spacing.minimumPadding');
  assertFinite(maximumPadding, 'spacing.maximumPadding');
  assertNonNegative(minimumWidth, 'spacing.minimumWidth');
  assertNonNegative(maximumWidth, 'spacing.maximumWidth');
  assertNonNegative(minimumPadding, 'spacing.minimumPadding');
  assertNonNegative(maximumPadding, 'spacing.maximumPadding');

  if (maximumWidth <= minimumWidth) {
    throw new FluidaConfigError('Fluida config: spacing.maximumWidth must be greater than spacing.minimumWidth.');
  }

  return { minimumWidth, maximumWidth, minimumPadding, maximumPadding };
}

function resolveTypography(typography: TypographyConfig | undefined): Required<TypographyConfig> {
  const minimumWidth = typography?.minimumWidth ?? TYPOGRAPHY_DEFAULT_MINIMUM_WIDTH;
  const maximumWidth = typography?.maximumWidth ?? TYPOGRAPHY_DEFAULT_MAXIMUM_WIDTH;
  const minimumScale = typography?.minimumScale ?? DEFAULT_MINIMUM_SCALE;
  const maximumScale = typography?.maximumScale ?? DEFAULT_MAXIMUM_SCALE;

  assertFinite(minimumWidth, 'typography.minimumWidth');
  assertFinite(maximumWidth, 'typography.maximumWidth');
  assertFinite(minimumScale, 'typography.minimumScale');
  assertFinite(maximumScale, 'typography.maximumScale');
  assertNonNegative(minimumWidth, 'typography.minimumWidth');
  assertNonNegative(maximumWidth, 'typography.maximumWidth');
  assertPositive(minimumScale, 'typography.minimumScale');
  assertPositive(maximumScale, 'typography.maximumScale');

  if (maximumWidth <= minimumWidth) {
    throw new FluidaConfigError('Fluida config: typography.maximumWidth must be greater than typography.minimumWidth.');
  }

  return { minimumWidth, maximumWidth, minimumScale, maximumScale };
}

export function resolveFluidaConfig(config: FluidaConfig): ResolvedEngineConfig {
  return {
    breakpoints: resolveBreakpoints(config.breakpoints),
    spacing: resolveSpacing(config.spacing),
    typography: resolveTypography(config.typography),
  };
}
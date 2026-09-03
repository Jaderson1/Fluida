export { FluidaContainerGrid as FluidaAdaptiveGrid } from './FluidaContainerGrid';
export type { FluidaContainerGridProps as FluidaAdaptiveGridProps } from './FluidaContainerGrid';

/**
 * @deprecated Renamed to `FluidaContainerGrid` before v1, to read
 * unambiguously against `FluidaGrid` (viewport-based) and match
 * `dash-fluida`'s own `FluidaGrid` (also container-based) —
 * `FluidaAdaptiveGrid` didn't say which of the two it was. Same
 * component, same props, same behavior — this is a plain re-export,
 * not a separate implementation, so there is nothing to migrate
 * except the import name.
 *
 * Deprecation policy: this alias remains available and unchanged for
 * the entire 1.x series. No runtime warning, no removal in a minor
 * or patch release. Earliest possible removal is a 2.0.0 major.
 */

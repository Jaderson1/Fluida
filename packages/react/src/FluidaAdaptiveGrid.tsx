export { FluidaContainerGrid as FluidaAdaptiveGrid } from './FluidaContainerGrid';
export type { FluidaContainerGridProps as FluidaAdaptiveGridProps } from './FluidaContainerGrid';

/**
 * @deprecated Renamed to `FluidaContainerGrid` before v1, to read
 * unambiguously against `FluidaGrid` (viewport-based) and match
 * `dash-fluida`'s own `FluidaGrid` (also container-based) —
 * `FluidaAdaptiveGrid` didn't say which of the two it was. Same
 * component, same props, same behavior — this is a plain re-export,
 * not a separate implementation, so there is nothing to migrate
 * except the import name. No runtime warning: this alias is expected
 * to exist for one pre-v1 cycle, not to be a permanent option.
 */

# @fluida/react

The official React integration for [`@fluida/core`](../core), including a Provider, viewport-based primitives, container-based layout, and hooks.

[![npm](https://img.shields.io/npm/v/@fluida/react)](https://www.npmjs.com/package/@fluida/react)

**Status:** public beta, `0.2.0`.

## Installation

```bash
npm install @fluida/react
```

Or with pnpm:

```bash
pnpm add @fluida/react
```

`@fluida/core` is installed automatically.

## Peer dependencies

```json
{
  "react": ">=18.0.0",
  "react-dom": ">=18.0.0"
}
```

## `FluidaProvider`

```tsx
import { FluidaProvider } from '@fluida/react';

<FluidaProvider config={{/* optional FluidaConfig */}}>
  <App />
</FluidaProvider>;
```

`FluidaAdaptiveGrid` does not require this Provider.

## Viewport-based primitives

### `FluidaContainer`

```tsx
<FluidaContainer>
  <YourPage />
</FluidaContainer>
```

### `FluidaGrid`

```tsx
<FluidaGrid>
  {items.map((item) => (
    <Card key={item.id} {...item} />
  ))}
</FluidaGrid>
```

### `FluidaStack`

```tsx
<FluidaStack direction="row" stackOnMobile>
  <Sidebar />
  <Content />
</FluidaStack>
```

### `FluidaText`

A thin convenience wrapper around `useFluidaLayout().typography.scale` — applies it as `fontSize` (in `rem`) to whichever element you choose via `as`, and exposes the same number as a `--fluida-type-scale` CSS custom property for composing your own proportions on top of it.

```tsx
<FluidaText as="h1">A responsive heading</FluidaText>
```

`typography.scale` is one multiplier, not a type scale with different sizes per heading level — `as="h1"` changes which HTML element renders, not how large the text is relative to an `as="p"` with the same content; both get the exact same `fontSize`. This is deliberate, not an oversight: an inline style always overrides a browser's own default heading sizes, so a component that both sets a default `fontSize` and preserves natural per-tag proportions isn't possible without inventing sizes Fluida has no real basis for. If you want a heading visibly larger than body text that still scales with the viewport, compose it yourself with the custom property:

```css
h1 {
  font-size: calc(2rem * var(--fluida-type-scale, 1));
}
```

`FluidaText` is most directly useful as-is for body text, labels, and anywhere a single flat scale is exactly what you want — reach for the custom property, or call `useFluidaLayout()` directly, for anything needing per-level proportions.

## `FluidaAdaptiveGrid`

```tsx
import { FluidaAdaptiveGrid } from '@fluida/react';

<FluidaAdaptiveGrid itemCount={2} strategy="preserve-ratio" aspectRatio={16 / 9}>
  <ChartA />
  <ChartB />
</FluidaAdaptiveGrid>;
```

| Prop           | Type                                                | Default              |
| -------------- | --------------------------------------------------- | -------------------- |
| `itemCount`    | `number`                                            | required             |
| `strategy`     | `'fit' \| 'fill' \| 'balanced' \| 'preserve-ratio'` | `'fit'`              |
| `gap`          | `number`                                            | `16`                 |
| `aspectRatio`  | `number`                                            | `1`                  |
| `minItemWidth` | `number`                                            | none — no constraint |
| `autoHeight`   | `boolean`                                           | `false`              |

`minItemWidth` excludes any column count whose resulting cell would be narrower than it, so the grid naturally uses fewer columns in a narrower container — without a separate "stacking" code path. Omitted, behavior is unchanged from before this prop existed.

`autoHeight`, when `true`, never feeds this grid's own measured height back into the layout computation — only `strategy="fit"` or `strategy="preserve-ratio"`, each with `minItemWidth` also set, support this; `fill` and `balanced` raise the same `FluidaConfigError` `@fluida/core` itself raises for that combination. The element's height is then set explicitly, computed from the real result (`rows * cellHeight + (rows - 1) * gap`), instead of left to a fixed minimum:

```tsx
<FluidaAdaptiveGrid
  itemCount={4}
  strategy="preserve-ratio"
  aspectRatio={4 / 3}
  minItemWidth={300}
  autoHeight
>
  <ChartA />
  <ChartB />
  <ChartC />
  <ChartD />
</FluidaAdaptiveGrid>
```

### `useFluidaContainerSize(ref)`

```tsx
const size = useFluidaContainerSize(ref);
```

### `useFluidaContainerLayout(ref, options, autoHeight?)`

```tsx
const layout = useFluidaContainerLayout(
  ref,
  { itemCount: 4, strategy: 'fit' },
  false, // autoHeight, defaults to false
);
```

## Viewport hooks

- `useFluidaLayout()`
- `useFluidaSnapshot()`

## CSS notes

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

## License

MIT — see [`LICENSE`](LICENSE).

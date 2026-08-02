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

```tsx
<FluidaText as="h1">A responsive heading</FluidaText>
```

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

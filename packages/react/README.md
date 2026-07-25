# @fluida/react

The official React integration for [`@fluida/core`](../core), including a Provider, viewport-based primitives, container-based layout, and hooks.

[![npm](https://img.shields.io/npm/v/@fluida/react)](https://www.npmjs.com/package/@fluida/react)

**Status:** public beta, `0.1.0`.

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

<FluidaProvider config={{ /* optional FluidaConfig */ }}>
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

<FluidaAdaptiveGrid
  itemCount={2}
  strategy="preserve-ratio"
  aspectRatio={16 / 9}
>
  <ChartA />
  <ChartB />
</FluidaAdaptiveGrid>
```

| Prop | Type | Default |
|---|---|---|
| `itemCount` | `number` | required |
| `strategy` | `'fit' \| 'fill' \| 'balanced' \| 'preserve-ratio'` | `'fit'` |
| `gap` | `number` | `16` |
| `aspectRatio` | `number` | `1` |

### `useFluidaContainerSize(ref)`

```tsx
const size = useFluidaContainerSize(ref);
```

### `useFluidaContainerLayout(ref, options)`

```tsx
const layout = useFluidaContainerLayout(ref, {
  itemCount: 4,
  strategy: 'fit',
});
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
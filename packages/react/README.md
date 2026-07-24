# @fluida/react

The React adapter for [`@fluida/core`](../core) — a `FluidaProvider`, four viewport-based layout primitives, one container-based primitive, and hooks for both systems.

**Status:** pre-release, `0.0.1`. Not published to npm yet.

## Future installation

```json
{ "dependencies": { "@fluida/react": "workspace:*" } }
```

Not available on npm yet — use this package inside the monorepo, or watch the repository for a real release.

## Peer dependencies

```json
"peerDependencies": {
  "react": ">=18.0.0",
  "react-dom": ">=18.0.0"
}
```

Built and tested against React 19; every component uses `forwardRef` rather than the newer ref-as-prop pattern, specifically so it keeps working under React 18, where a plain function component cannot receive `ref` directly.

## `FluidaProvider`

Wraps whatever part of your tree needs the viewport-based primitives or hooks below. Creates exactly one `@fluida/core` instance per Provider, lazily, on first render — never a shared, module-level singleton.

```tsx
import { FluidaProvider } from '@fluida/react';

<FluidaProvider config={{ /* optional FluidaConfig */ }}>
  <App />
</FluidaProvider>;
```

**Props:** `config?: FluidaConfig`, `children?: ReactNode`.

`FluidaAdaptiveGrid`, further down, does **not** need this Provider.

## Viewport-based primitives

All four read from Core automatically and react to the browser's viewport width, not their own element's size.

### `FluidaContainer`

| Prop | Type | Default |
|---|---|---|
| `...rest` | standard `div` props | — |

Centers content: `maxWidth` from `layout.container.maxWidth`, horizontal padding from `layout.spacing.page`.

```tsx
<FluidaContainer>
  <YourPage />
</FluidaContainer>
```

### `FluidaGrid`

A CSS grid with `layout.grid.columns` columns and a gap from `layout.spacing.page`, using `repeat(columns, minmax(0, 1fr))` so long content can't force the grid wider than its container.

```tsx
<FluidaGrid>
  {items.map((item) => <Card key={item.id} {...item} />)}
</FluidaGrid>
```

### `FluidaStack`

| Prop | Type | Default |
|---|---|---|
| `direction` | `'row' \| 'column'` | `'column'` |
| `gap` | `number` | `layout.spacing.page` |
| `stackOnMobile` | `boolean` | `false` |

`stackOnMobile` forces column direction whenever Core's own `layout.breakpoint === 'mobile'`.

```tsx
<FluidaStack direction="row" stackOnMobile>
  <Sidebar />
  <Content />
</FluidaStack>
```

### `FluidaText`

| Prop | Type | Default |
|---|---|---|
| `as` | `'p' \| 'span' \| 'div' \| 'label' \| 'h1'`–`'h6'` | `'p'` |

Applies `layout.typography.scale` as `font-size: ${scale}rem`. Also sets a `--fluida-type-scale` custom property, for cases where you want a different base size per element while still scaling with Fluida:

```css
.my-heading {
  font-size: calc(2rem * var(--fluida-type-scale, 1));
}
```

```tsx
<FluidaText as="h1">A responsive heading</FluidaText>
```

## `FluidaAdaptiveGrid`

Different from the four primitives above: it measures its **own real rendered size** with `ResizeObserver`, not the viewport, and lays out a known number of children across that measured space. Independent from `<FluidaProvider>` — there is no shared state between this and the viewport system, only the same underlying Core computation.

```tsx
import { FluidaAdaptiveGrid } from '@fluida/react';

<FluidaAdaptiveGrid itemCount={2} strategy="preserve-ratio" aspectRatio={16 / 9}>
  <ChartA />
  <ChartB />
</FluidaAdaptiveGrid>
```

| Prop | Type | Default |
|---|---|---|
| `itemCount` | `number` (required) | — |
| `strategy` | `'fit' \| 'fill' \| 'balanced' \| 'preserve-ratio'` | `'fit'` |
| `gap` | `number` | `16` |
| `aspectRatio` | `number` | `1` (used only by `'preserve-ratio'`) |
| `...rest` | standard `div` props, `ref` | — |

`itemCount` is required and not inferred from `children`, to avoid miscounting fragments or conditional content. In development, a `console.warn` fires if it doesn't match the number of top-level children React actually sees — a signal, not a hard validation (it can under- or over-count children grouped in a `<>...</>` fragment), and never thrown as an error in any environment.

Cell size is applied as explicit pixel dimensions (`gridTemplateColumns: repeat(columns, ${cellWidth}px)`), not `minmax(0, 1fr)` — the computation already found the size that best uses the real measured space, so letting the grid renegotiate it would undo the work. It does not force line-wrapping inside a cell's own content; that stays your choice.

### `ResizeObserver` behavior

A fresh `ResizeObserver` is created internally every time the component subscribes to its measurement, rather than one created once and reused. There is no loop risk from this: each cycle's observer is disconnected by its own cleanup before a new one is created. If `ResizeObserver` is not available in the current environment, the component simply stays at its fallback size rather than throwing.

### Height behavior

By default, `FluidaAdaptiveGrid` applies `minHeight: 200` — not `height: 100%`. A height set as a percentage would resolve to `auto` if the parent has no explicit height, and this component's own content height comes from a computation that starts at zero before the first real measurement — the two together can produce a component permanently stuck at zero height, with no error. `minHeight` avoids that without requiring anything from your own CSS. If you want a specific height, or a different minimum, set `style={{ height: '...' }}` or `style={{ minHeight: '...' }}` directly — your value overrides the default.

### `useFluidaContainerSize(ref)`

The measurement layer on its own:

```tsx
import { useRef } from 'react';
import { useFluidaContainerSize } from '@fluida/react';

function Example() {
  const ref = useRef<HTMLDivElement | null>(null);
  const size = useFluidaContainerSize(ref);
  return <div ref={ref}>{size.width}×{size.height}</div>;
}
```

Returns `{ width: 0, height: 0 }` before the first real measurement, including during server-side rendering.

### `useFluidaContainerLayout(ref, options)`

Combines the measurement above with `computeContainerLayout` from `@fluida/core` — what `FluidaAdaptiveGrid` uses internally.

```tsx
const layout = useFluidaContainerLayout(ref, { itemCount: 4, strategy: 'fit' });
```

## Strategies

Both `FluidaAdaptiveGrid` and `useFluidaContainerLayout` accept the same `strategy`:

- **`fit`** (default) — square cells, the largest size that fits without overflow.
- **`fill`** — uses 100% of the measured space; cells may not be square.
- **`balanced`** — a middle ground between the two above.
- **`preserve-ratio`** — cells keep the configured `aspectRatio` exactly, even if that leaves leftover space — the strategy used in the example above, and the one best suited to charts and similarly shaped content.

Full algorithm details in [`packages/core/README.md`](../core/README.md).

## Viewport hooks — for advanced cases

**`useFluidaLayout()`** returns `LayoutTokens`, re-rendering only when a derived value changes. **`useFluidaSnapshot()`** returns the raw `FluidaSnapshot`, re-rendering on every environment change. They are separate specifically so a component using only `useFluidaLayout()` never subscribes to the raw snapshot.

## Server-side rendering

Every viewport primitive and hook reads Core's `getServerSnapshot`/`getServerLayout` through React's `useSyncExternalStore` server-snapshot argument. `useFluidaContainerSize`/`useFluidaContainerLayout` do the same with a fixed `{ width: 0, height: 0 }` fallback.

## Error when used outside a Provider

Any *viewport* primitive or hook, used without a `<FluidaProvider>` ancestor, throws `FluidaReactError` synchronously. This does not apply to `FluidaAdaptiveGrid` or the container hooks, which never look for a Provider.

## CSS notes

Fluida's primitives apply their computed values as inline styles; they do not reset or normalize anything else on the page. A basic `box-sizing: border-box` reset is recommended alongside them, since `FluidaContainer` and `FluidaAdaptiveGrid` both size themselves assuming border-box:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

## Complete example

```tsx
import {
  FluidaContainer,
  FluidaGrid,
  FluidaProvider,
  FluidaStack,
  FluidaText,
} from '@fluida/react';

export function App() {
  return (
    <FluidaProvider>
      <FluidaContainer>
        <FluidaText as="h1">My app</FluidaText>
        <FluidaStack direction="row" stackOnMobile>
          <Sidebar />
          <FluidaGrid>
            {items.map((item) => <Card key={item.id} {...item} />)}
          </FluidaGrid>
        </FluidaStack>
      </FluidaContainer>
    </FluidaProvider>
  );
}
```

## Limitations

- Viewport primitives react to viewport width, not their own element's size.
- `<FluidaProvider config>` does not react to `config` changing after the first render.
- `FluidaAdaptiveGrid` has no direct way to say "stack below this width" — that intent has to be expressed through the measured container's own proportions today.
- The `itemCount`-vs-children check is a development warning, not a build-time guarantee.

## License

MIT — see [`LICENSE`](LICENSE).
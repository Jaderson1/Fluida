## Packages

- **[`@fluida/core`](packages/core/README.md)** — framework-agnostic engine. See its README for the full public API.
- **[`@fluida/react`](packages/react/README.md)** — the React adapter. See its README for every component, hook, and prop.

## Development

```bash
git clone https://github.com/Jaderson1/Fluida.git
cd Fluida
corepack enable
pnpm install
```

```bash
pnpm build       # build @fluida/core and @fluida/react
pnpm typecheck   # typecheck all packages
pnpm test        # run all tests
pnpm demo:react  # run the live React demo
```

## Future installation

Neither `@fluida/core` nor `@fluida/react` is published to npm yet — both are still at `0.0.1`. Once published, installation will look like:

```bash
npm install @fluida/core @fluida/react
```

Until then, use this monorepo directly (see Development above), or a `workspace:*` dependency if you're working inside it.

## Project status

Pre-release. Both packages are implemented and tested. Not published to npm yet. See each package's README for known limitations.

## Compatibility

`@fluida/core` has no runtime dependencies and works in any modern JavaScript environment. `@fluida/react` requires `react` and `react-dom` as peer dependencies — see [`packages/react/README.md`](packages/react/README.md) for the exact supported versions.

## Contributing

This is a solo, early-stage project. Issues and pull requests are welcome. Please run `pnpm typecheck && pnpm test && pnpm build` before opening a pull request.

## License

MIT — see [`LICENSE`](LICENSE).
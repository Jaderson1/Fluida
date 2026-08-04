# Review notes — v0.2.0 hardening pass

Internal notes from the pre-0.2.0 audit and fix pass. Not a changelog (see `CHANGELOG.md`) and not a status report — just what was found, what was done about it, and what's still open.

## Problems found and fixed

- `balanced` could produce a cell wider or taller than the container (confirmed: 1000×100 container, 3 items, `gap=0` → `cellHeight=182.57` against a `containerHeight` of `100`). Rewritten so each axis is a geometric mean with the safe square size individually, which keeps both axes within their original `fill` bounds by construction, not just by the specific cases tested.
- `itemCount`/`item_count` accepted `1.5`, and in Python, `True`/`False` (since `bool` subclasses `int`). Both now require a genuine positive integer.
- Unknown `strategy` values fell through to `fill`-shaped behavior silently. Now rejected explicitly.
- `containerWidth`/`containerHeight` accepted `NaN`, `Infinity`, and negative values, producing the same fallback as an unmeasured container. Now validated explicitly; `0` is still valid.
- `dash-fluida`'s frontend dropped every `ResizeObserver` measurement except the first one to arrive before a pending animation frame fired. Fixed by reading the latest measurement at the time the frame runs, not at the time it was scheduled.
- `dash-fluida`'s bundle's `sourceMappingURL` comment referenced the pre-rename filename (`dash_fluida.global.js.map`) instead of the one actually shipped (`dash_fluida.min.js.map`). Fixed in the copy script; a test now checks this stays true.
- `ContainerLayoutOptions` was declared twice in `@fluida/core` (TypeScript interface merging silently combined them). Consolidated into one declaration.
- `FluidaConfig.minItemWidth` was a public, documented property with zero real references anywhere in the engine. Removed — confirmed via a full-repo search before deciding this, not assumed.
- `eslint.config.js` had a typo (`js.config.recommended` instead of `js.configs.recommended`) that made ESLint fail to load its own base config silently in a way that meant it had likely never run successfully. Fixed, and `eslint-plugin-react-hooks` — referenced in disable comments but never actually installed or configured — is now genuinely wired in.

## Trade-offs

- **Prettier formatting was not enforced project-wide.** Running `prettier --check .` for the first time surfaces 76 pre-existing files with drift, unrelated to this pass. Reformatting all of them here would be a large, unrelated diff mixed into a functional fix — out of scope for this pass. `prettier --check` is deliberately **not** added as a blocking CI step yet; only the files this pass actually touched were formatted. A dedicated formatting-only commit should land before that check can be turned on.
- **`FluidaConfig.minItemWidth` removal is a breaking change**, even though nothing internal used it. Anyone setting it externally would see no behavioral difference either way (it never did anything), which is why removal now — before any real external usage exists — was preferred over a deprecation cycle for a property that already did nothing.
- **`balanced`'s output values changed** for any non-square base cell. This is a correctness fix, not a style change, but it is a breaking change for exact-value snapshot tests anyone may have written against the old formula.

## Known remaining limitations

- No browser has ever rendered `dash-fluida`'s `FluidaGrid` in this environment. Everything verified about it is verified by code — real builds, real Python tests, a real dedicated frontend test suite — not by visual inspection.
- `FluidaText`'s future was decided this pass — see "FluidaText decision" below. No longer an open question for v1.0.
- CI now covers Python and TypeScript separately but has not itself been run on GitHub's runners — only the equivalent commands, run locally, are confirmed.
- Formatting drift (see above) is unresolved outside the files this pass touched.

## Priority next steps

1. A dedicated `prettier --write` pass across the full repo, as its own commit, before enabling `prettier --check` in CI.
2. Get `dash-fluida`'s `FluidaGrid` in front of a real browser at least once.
## FluidaText decision

**Kept as public API — not deprecated, not removed.**

Reassessed by reading the actual implementation, its 9 tests, and every README claim, not just the open question in this file. It has one real, tested, coherent responsibility: apply `useFluidaLayout().typography.scale` as `fontSize`, on whichever element `as` requests, and expose the same number as `--fluida-type-scale` for composing proportional sizing on top of it — verified reactive to viewport changes, not just a static wrapper (see `updates font-size after a resize that changes the scale` in `FluidaText.test.tsx`).

The genuine ambiguity wasn't whether it works — it does — it was whether its purpose was documented clearly enough for someone to judge when to reach for it instead of `useFluidaLayout()` directly. `packages/react/README.md` now says this explicitly: `FluidaText` is a convenience wrapper for flat, single-scale text (body copy, labels), not a type scale — `as="h1"` changes the element, not the size, and headings that need to look proportionally bigger need the custom property or the hook directly. That was previously true of the implementation but not said anywhere.

No compatibility impact: the component's own behavior didn't change, only its documentation.

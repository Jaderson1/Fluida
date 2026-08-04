# Review notes — v0.2.x hardening pass

Internal notes from the pre-0.2.0 audit and fix pass, and the v0.2.x hardening pass that followed it. Not a changelog (see `CHANGELOG.md`) and not a status report — just what was found, what was done about it, and what's still open.

## Problems found and fixed

- `balanced` could produce a cell wider or taller than the container (confirmed: 1000×100 container, 3 items, `gap=0` → `cellHeight=182.57` against a `containerHeight` of `100`). Rewritten so each axis is a geometric mean with the safe square size individually, which keeps both axes within their original `fill` bounds by construction, not just by the specific cases tested. Now also covered by 200 property-based cases per language.
- `itemCount`/`item_count` accepted `1.5`, and in Python, `True`/`False` (since `bool` subclasses `int`). Both now require a genuine positive integer.
- Unknown `strategy` values fell through to `fill`-shaped behavior silently. Now rejected explicitly.
- `containerWidth`/`containerHeight` accepted `NaN`, `Infinity`, and negative values, producing the same fallback as an unmeasured container. Now validated explicitly; `0` is still valid.
- `dash-fluida`'s frontend dropped every `ResizeObserver` measurement except the first one to arrive before a pending animation frame fired. Fixed by reading the latest measurement at the time the frame runs, not at the time it was scheduled.
- `dash-fluida`'s bundle's `sourceMappingURL` comment referenced the pre-rename filename (`dash_fluida.global.js.map`) instead of the one actually shipped (`dash_fluida.min.js.map`). Fixed in the copy script; a test now checks this stays true.
- The generated `.map`'s embedded `sourcesContent` differed between an LF and a CRLF checkout of the exact same source. `copy-bundle.mjs` now normalizes line endings and path separators after copying — verified by deliberately corrupting a source file to CRLF and confirming the output was still byte-identical.
- `ContainerLayoutOptions` was declared twice in `@fluida/core` (TypeScript interface merging silently combined them). Consolidated into one declaration.
- `FluidaConfig.minItemWidth` was a public, documented property with zero real references anywhere in the engine. Removed — confirmed via a full-repo search before deciding this, not assumed.
- `eslint.config.js` had a typo (`js.config.recommended` instead of `js.configs.recommended`) that made ESLint fail to load its own base config silently in a way that meant it had likely never run successfully. Fixed, and `eslint-plugin-react-hooks` — referenced in disable comments but never actually installed or configured — is now genuinely wired in.
- `packages/core`/`packages/react`'s own `engines.node` still said `>=20` after the root package's had already moved to `>=22.13.0` to match CI — the two packages that actually get published hadn't been updated. Fixed and confirmed in the packed tarball.
- **Dash-specific visual bug**: at large viewports, chart cards could be left at a stale, undersized rendering instead of filling their real cell. Root cause confirmed by reading the installed `plotly.js` directly: `responsive=True`'s own `ResizeObserver` deliberately ignores its first notification per chart (`let B=!1; ...new ResizeObserver((ee)=>{B?Q(ee):B=!0})`). If a chart's card reaches its final FluidaGrid-computed size within that same first notification, Plotly never receives a second one to actually resize on. Fixed with a `clientside_callback` in the demo that calls `Plotly.Plots.resize()` on each chart explicitly when `FluidaGrid`'s own `notify_layout_changes` output changes — a real signal tied to the confirmed cause, not a timeout.

## Trade-offs

- **Prettier formatting was not enforced project-wide.** Running `prettier --check .` for the first time surfaces 76 pre-existing files with drift, unrelated to this pass. Reformatting all of them here would be a large, unrelated diff mixed into a functional fix — out of scope for this pass. `prettier --check` is deliberately **not** added as a blocking CI step yet; only the files this pass actually touched were formatted. A dedicated formatting-only commit should land before that check can be turned on.
- **`FluidaConfig.minItemWidth` removal is a breaking change**, even though nothing internal used it. Anyone setting it externally would see no behavioral difference either way (it never did anything), which is why removal now — before any real external usage exists — was preferred over a deprecation cycle for a property that already did nothing.
- **`balanced`'s output values changed** for any non-square base cell. This is a correctness fix, not a style change, but it is a breaking change for exact-value snapshot tests anyone may have written against the old formula.

## FluidaText decision

**Kept as public API — not deprecated, not removed.**

Reassessed by reading the actual implementation, its tests, and every README claim, not just the open question this file used to carry. It has one real, tested, coherent responsibility: apply `useFluidaLayout().typography.scale` as `fontSize`, on whichever element `as` requests, and expose the same number as `--fluida-type-scale` for composing proportional sizing on top of it — verified reactive to viewport changes, not just a static wrapper.

The genuine ambiguity wasn't whether it works — it does — it was whether its purpose was documented clearly enough for someone to judge when to reach for it instead of `useFluidaLayout()` directly. `packages/react/README.md` now says this explicitly: `FluidaText` is a convenience wrapper for flat, single-scale text (body copy, labels), not a type scale — `as="h1"` changes the element, not the size, and headings that need to look proportionally bigger need the custom property or the hook directly. A test now proves this by execution (`as="p"` and `as="h1"` render the exact same font-size for the same content), not just by comment.

No compatibility impact: the component's own behavior didn't change, only its documentation.

## Accessibility baseline

Inspected every public React component (`FluidaProvider`, `FluidaContainer`, `FluidaGrid`, `FluidaStack`, `FluidaText`, `FluidaAdaptiveGrid`) and the Dash `FluidaGrid`. None of the React components ever set `role`, `tabIndex`, or a keyboard handler — all spread `{...rest}` onto their rendered element, so any `aria-*`/`data-*`/`role` a consumer passes already forwarded correctly; confirmed this explicitly with new tests rather than assuming the spread was sufficient.

The Dash `FluidaGrid` was a real gap, not a spread: its JSX only ever applied `id`, `className`, `style` — no mechanism existed for a consumer to set `aria-label` or any other attribute. Added `aria_label` (the single most common case) and `extra_attrs` (a dict for anything else — `data-*`, `aria-describedby`, etc.) to both the Python wrapper and the frontend, covering the general case without hardcoding every possible attribute name.

Confirmed by test, not by inspection alone, in both React and Dash: no `role` or `aria-label` is set unless a consumer provides one; children render in their given order with no `tabIndex` applied by Fluida itself; no keyboard event handler is attached to any container.

**Deferred, deliberately**: whether a resizing grid should announce its column-count change to screen readers (e.g. via `aria-live`) was considered and left alone — Fluida has no way to know whether a given consumer's grid content makes that change meaningful enough to announce, and an `aria-live` region firing on every resize risks being noisier than helpful by default. A consumer who wants this can add it themselves around their own content; adding it inside Fluida would impose a judgment call Fluida isn't positioned to make. Color contrast and visual design of the demo apps themselves were not in scope — those are demo content, not library behavior.

## Known remaining limitations

- Real browser execution of the Dash E2E suite (8 tests, `python/dash-fluida/e2e/`) is written, syntax- and collection-validated, and confirmed to fail at exactly and only the Chromium-launch step in this environment (browser binary downloads are blocked here) — it has not yet run against a real browser. It runs in the `dash-e2e` CI job, which installs a real Chromium.
- CI now covers Python, TypeScript, React 18/19, and Dash E2E, but has not itself been run on GitHub's runners in this pass — only the equivalent commands, run locally, are confirmed, plus the exact failure point for the one thing that can't run here.
- Formatting drift (see Trade-offs above) is unresolved outside the files this pass touched.

## Priority next steps

1. A dedicated `prettier --write` pass across the full repo, as its own commit, before enabling `prettier --check` in CI.
2. Push this branch and let the `dash-e2e` CI job run the Playwright suite against a real Chromium — the one thing that could not be verified in this environment.
3. Confirm the merged CI workflow passes end-to-end on GitHub's own runners at least once before the next release.

# design-sync notes (Life Elo)

Target: Claude Design project "Life Elo" — https://claude.ai/design/p/67c2bfac-e6da-422e-98bb-a3415b430a31

## How this repo syncs
- This is an app, not a published library: there is no `dist/` with `.d.ts` for the components.
  `node .design-sync/build-lib.mjs` (cfg.buildCmd) stages a fake package in the gitignored
  `.design-sync/.cache/pkg/`: esbuild JS of `src/ui/components/index.ts`, `tsc` declarations, and
  `dist/styles.css` = bundled `src/index.css` (tokens + globals) + component CSS, in app load order.
  It needs `.ds-sync/node_modules/esbuild`, so stage the converter scripts first, then run it.
- Run the converter from repo root with `--node-modules ./node_modules` (cfg.entry points at the staged pkg).
- Render check uses the installed Google Chrome, not a downloaded chromium:
  `DS_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" NODE_PATH=.ds-sync/node_modules`
  (playwright is installed into `.ds-sync/` alongside esbuild/ts-morph).
- esbuild splits component CSS into `dist/index.css`; without merging it into cssEntry the previews
  render as unstyled browser defaults while global utilities still work. build-lib.mjs does the merge.
- `cfg.dtsPropsFor` is hand-written for Button, Card (native attrs are otherwise filtered out),
  SegmentedControl, TabBar (generic `T extends string` → `string`), and HistoryEntry (LedgerEntry inlined).
- TabBar is `position: fixed`: its preview wraps it in a `transform: translateZ(0)` frame, and the card is
  `cardMode: single`. HistoryEntry previews open `<details>` via a ref callback.

## Known render warns
- none

## Re-sync risks
- `dtsPropsFor` duplicates prop types: if Button/Card/SegmentedControl/TabBar/HistoryEntry props
  or `LedgerEntry`/`Contribution`/`HabitOutcome` change, update the config by hand, or the agent codes against stale types.
- Adding a component: export it from `src/ui/components/index.ts`; check its emitted `.d.ts` and author a preview.
- Global CSS (`src/index.css`) ships with the bundle, including app-shell rules for `main` and `.app`.
- Toolchain at first sync: TypeScript 7.0.2 (tsgo), node 24, esbuild 0.28.

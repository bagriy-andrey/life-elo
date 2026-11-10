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
- `cfg.dtsPropsFor` is hand-written for Button (incl. variants), Field, Avatar, Dialog, Notice, PasswordField, Card (native attrs are otherwise filtered out),
  SegmentedControl, TabBar (generic `T extends string` → `string`), and HistoryEntry (LedgerEntry inlined).
- TabBar is `position: fixed`: its preview wraps it in a `transform: translateZ(0)` frame, and the card is
  `cardMode: single`. HistoryEntry previews open `<details>` via a ref callback.
  Dialog uses the same `translateZ(0)` frame (390×380) so its fixed overlay stays inside the card; without it the panel's top is clipped.

- Components read strings via `useI18n()`; without a provider it falls back to ru, so previews render in Russian.

- `PasswordField` is i18n-free: `showLabel`/`hideLabel` (required) and `strengthLabels` come from the app's `t()`;
  its preview passes Russian literals. Keep `dtsPropsFor.PasswordField` in step with the props.

- FullScreenModal / ProgressSegments / QuotaDots / SwipeCard (yesterday-review modal, 2026-11-08) are i18n-free like
  PasswordField: every text is a prop; previews pass Russian literals. FullScreenModal is `position: fixed` →
  same `translateZ(0)` frame as Dialog. SwipeCard registers a window ArrowLeft/Right listener per mounted card.

- Select / Skeleton / Spinner / StatTile previews authored 2026-11-09. Select shows only closed states (the list opens on
  click, `position: fixed`). StatTile is `cardMode: column`; `TierBars` is internal (not exported, no card).

- Menu (2026-11-10): the popover opens on click, so the `Open` story clicks `.menu-trigger` once from a ref callback
  (`setTimeout(…click)`; no pointerdown → the outside-tap handler doesn't close it) and reserves `minHeight: 280`.
  A preview with only the closed ⋮ trigger trips `[RENDER_THIN]` (a 44px icon button paints almost nothing).
  `dialog-actions--row` (two buttons side by side) is documented only in `dtsPropsFor.Dialog`, not in conventions.md.

## Known render warns
- none

## Re-sync risks
- `previews/HistoryEntry.tsx` sample ledgers are hand-computed from RULESET_V1 (Σw=6, clean day 20, R ← R + 0.1·(10S − R)).
  A new ruleset version makes them stale — recompute, don't let numbers drift (an earlier draft showed clean day +2).
- `dtsPropsFor` duplicates prop types: if Button/Card/SegmentedControl/TabBar/HistoryEntry/Field/Avatar/Dialog props
  or `LedgerEntry`/`Contribution` change, update the config by hand, or the agent codes against stale types.
- Adding a component: export it from `src/ui/components/index.ts`; check its emitted `.d.ts` and author a preview.
- Global CSS (`src/index.css`) ships with the bundle, including app-shell rules for `main` and `.app`.
- Toolchain at first sync: TypeScript 7.0.2 (tsgo), node 24, esbuild 0.28.
- Tokens now have forced-theme selectors (`:root[data-theme='dark'|'light']`) besides the `prefers-color-scheme` media block; dark values are duplicated and must stay in sync.
- New components Field, Avatar, Dialog (previews authored); Dialog previews use `open`. Theme: `data-theme` on `:root` forces light/dark, no attribute = system.
- Avatar's initials size is `calc(var(--avatar-size) / 3)`. `calc(px / n * 1rem)` is invalid CSS (px×rem) and silently falls back to the inherited size; the render check doesn't flag it, only the sheet does.

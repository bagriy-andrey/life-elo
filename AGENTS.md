# Life Elo

Personal habit / wellbeing PWA with a signed, Elo-inspired rating.
Product source of truth: `LIFE_ELO_PRODUCT_CONTEXT.md` — read it before product or scoring changes.

## Stack
Vite + React + TypeScript PWA (`vite-plugin-pwa`). Dexie (IndexedDB) is the app's read model and works offline;
Supabase (Auth + Postgres/RLS; Edge Functions only for Garmin) provides accounts and sync; hosting on Vercel. Setup: `docs/setup/backend.md`.
Target: installed on iPhone via Safari → "Add to Home Screen". UI language: ru/en/uk via `src/i18n` (ru is the key source of truth).

Commands: `npm run dev`, `npm test` (Vitest), `npm run lint` (oxlint), `npm run build`.

## Layout
- `src/domain/` — types and day-boundary logic (`dayOf`, `reviewDay`).
- `src/engine/` — pure, deterministic rating engine (`replay`) + versioned `RulesetConfig` (v2 adds the weekly goal, `weeklyGoal.ts`).
- `src/db/` — Dexie schema. Rating/streaks are never stored; they are derived by replaying confirmed reviews.
- `src/auth/` — Supabase client, `AuthProvider`, `context.ts` (`useAuth`), validation, error texts.
- `src/sync/` — outbox, merge rules, remote calls, sync engine (raw records only: reviews, wellbeing, profile, tombstones).
- `src/garmin/` — Garmin parser (`parse.ts`, also used by the function), api wrapper, UI helpers, day-detail builder and view-model (`garminDayDetailView`).
- `src/ui/garmin/` — screen-local SVG charts for the Garmin day page (`GarminDayPage.tsx`).
- `supabase/` — SQL migrations, email templates, `functions/` (`garmin-connect`, `garmin-pull`, `_shared/`).
- `src/ui/` — screens; `YesterdayReview.tsx` is the mandatory next-morning review modal (mounted from `App.tsx`).

## Rules that must hold
- Rating starts at 0 and is signed. Only three tiers: weak / medium / strong.
- Constructive "not done", unknown, not applicable and unreviewed days are neutral.
- Days are finalized by next-morning review of yesterday; editing a past day = save + replay (no double credit).
- Wellbeing check-in is optional and never modifies Elo directly.
- Rating and streaks are never stored on the server either; sync moves raw records only.
- The server is the source of truth; Dexie only caches the signed-in account (sign-in drops other/pre-account
  data and pulls; local data is never uploaded into an account).
- Profile is synced between devices; language and theme are per device (localStorage, not synced).
- «Удалить все данные» wipes the account everywhere: server tombstones, other devices clear on their next sync.
- Garmin data only prefills the review; it never confirms a day or changes Elo directly.
- Reward Coins (future) are separate from Elo; spending never lowers Elo.
- `RULESET_V1` numbers are agreed (product context §6.5); tuning goes through a new ruleset version. Ask the user before choosing any coefficient not in §6.5.

## Gotchas
Short, durable, non-obvious lessons. Compress or replace entries; keep this section ≤10 lines.
- `src/ui/components/` is mirrored in Claude Design: props of Button (variants), Card, SegmentedControl,
  TabBar, HistoryEntry, Field, Avatar, Dialog, Notice, PasswordField, FullScreenModal, BottomSheet, ProgressSegments, QuotaDots, SwipeCard, Select, Spinner, Skeleton, StatTile, Menu are duplicated by hand in `.design-sync/config.json` → `dtsPropsFor`.
- Styling: plain CSS per component + CSS variables from `src/ui/tokens.css`; no CSS-in-JS/Tailwind.
  Text inputs go through `Field` (global input styles live in `src/index.css`).
- Unit tests don't render JSX: add a `renderToString` smoke test per new/changed screen (see `src/ui/Profile.test.tsx`).
- Supabase CLI: `npx supabase db push --remote` (without `--remote` it targets a local Docker DB and fails).
  Hosted mutations (`db push`, `functions deploy`) need the user's own `--yes`: agents stop and hand the command over.
- Age/birth use the calendar date `toDayKey(new Date())` (`dayOf` is now the same calendar day; the 04:00 wrap lives only in `timeToMinutes`).

## Workflow: plan → build → verify
Roles live in `docs/agents/` (tool-neutral); `.claude/agents/` are thin Claude wrappers.
- `planner` — `docs/agents/planner.md`: feature (or Claude Design link) → `docs/plans/NN-slug.md`.
- `implementer` — `docs/agents/implementer.md`: one plan step → code + tests + commit + checkbox.
- `verifier` — `docs/agents/verifier.md`: read-only; plan coverage, rules above, design-sync drift.
Skills in `.claude/skills/` (Codex: open the SKILL.md and follow it yourself):
`build-plan` (implement → verify → ≤1 fix round), `handoff`, `workflow-retro`.
Plan checkboxes are the progress source of truth; scoring decisions always go to the user.
App version: `0.NN.0` per finished plan, patch for fix rounds; commit `chore: version 0.NN.0`.

## Claude Design
Components/tokens are synced to Claude Design by the user-run `/design-sync` (reads `.design-sync/`,
see its `NOTES.md`). `.design-sync/last-sync` holds the commit of the last sync: after a successful
`/design-sync`, write the current HEAD hash there and commit it.

## Working across agents (Claude Code ↔ Codex)
Either agent may continue where the other stopped (e.g. when usage limits run out).
- Start of session: read `HANDOFF.md`, continue from "Next step" (or the plan's first unchecked step).
- Commit every finished step; when stopping or near a limit, run the `handoff` skill
  (rewrites `HANDOFF.md`, ≤20 lines, + `wip:` commit) so at most one step is lost.
- Before handing off, `npm test` and `npm run lint` pass, or `HANDOFF.md` says what is broken.
- Keep shared instructions in this file only; `CLAUDE.md` just imports it.

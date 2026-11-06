# Life Elo

Personal habit / wellbeing PWA with a signed, Elo-inspired rating.
Product source of truth: `LIFE_ELO_PRODUCT_CONTEXT.md` — read it before product or scoring changes.

## Stack
Vite + React + TypeScript PWA (`vite-plugin-pwa`). Dexie (IndexedDB) is the app's read model and works offline;
Supabase (Auth + Postgres/RLS, no custom server) provides accounts and sync; hosting on Vercel. Setup: `docs/setup/backend.md`.
Target: installed on iPhone via Safari → "Add to Home Screen". UI language: ru/en/uk via `src/i18n` (ru is the key source of truth).

Commands: `npm run dev`, `npm test` (Vitest), `npm run lint` (oxlint), `npm run build`.

## Layout
- `src/domain/` — types and day-boundary logic (`dayOf`, `reviewDay`).
- `src/engine/` — pure, deterministic rating engine (`replay`) + versioned `RulesetConfig`.
- `src/db/` — Dexie schema. Rating/streaks are never stored; they are derived by replaying confirmed reviews.
- `src/auth/` — Supabase client, `AuthProvider`, `context.ts` (`useAuth`), validation, error texts.
- `src/sync/` — outbox, merge rules, remote calls, sync engine (raw records only: reviews, wellbeing, profile, tombstones).
- `supabase/` — SQL migrations and email templates (the whole backend).
- `src/ui/` — screens.

## Rules that must hold
- Rating starts at 0 and is signed. Only three tiers: weak / medium / strong.
- Constructive "not done", unknown, not applicable and unreviewed days are neutral.
- Days are finalized by next-morning review of yesterday; editing a past day = save + replay (no double credit).
- Wellbeing check-in is optional and never modifies Elo directly.
- Rating and streaks are never stored on the server either; sync moves raw records only.
- Profile is synced between devices; language and theme are per device (localStorage, not synced).
- «Удалить все данные» wipes the account everywhere: server tombstones, other devices clear on their next sync.
- Reward Coins (future) are separate from Elo; spending never lowers Elo.
- `RULESET_V1` numbers are agreed (product context §6.5); tuning goes through a new ruleset version. Ask the user before choosing any coefficient not in §6.5.

## Gotchas
Short, durable, non-obvious lessons. Compress or replace entries; keep this section ≤10 lines.
- `src/ui/components/` is mirrored in Claude Design: props of Button (variants), Card, SegmentedControl,
  TabBar, HistoryEntry, Field, Avatar, Dialog, Notice, PasswordField are duplicated by hand in `.design-sync/config.json` → `dtsPropsFor`.
- Styling: plain CSS per component + CSS variables from `src/ui/tokens.css`; no CSS-in-JS/Tailwind.
  Text inputs go through `Field` (global input styles live in `src/index.css`).
- Unit tests don't render JSX: add a `renderToString` smoke test per new/changed screen (see `src/ui/Profile.test.tsx`).
- Supabase CLI: `npx supabase db push --remote` (without `--remote` it targets a local Docker DB and fails).
- Age/birth use the calendar date `toDayKey(new Date())`, not `dayOf`/`reviewDay` (04:00 boundary).

## Workflow: plan → build → verify
Roles live in `docs/agents/` (tool-neutral); `.claude/agents/` are thin Claude wrappers.
- `planner` — `docs/agents/planner.md`: feature (or Claude Design link) → `docs/plans/NN-slug.md`.
- `implementer` — `docs/agents/implementer.md`: one plan step → code + tests + commit + checkbox.
- `verifier` — `docs/agents/verifier.md`: read-only; plan coverage, rules above, design-sync drift.
Skills in `.claude/skills/` (Codex: open the SKILL.md and follow it yourself):
`build-plan` (implement → verify → ≤1 fix round), `handoff`, `workflow-retro`.
Plan checkboxes are the progress source of truth; scoring decisions always go to the user.

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

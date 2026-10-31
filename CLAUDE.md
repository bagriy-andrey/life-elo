# Life Elo

Personal habit / wellbeing PWA with a signed, Elo-inspired rating.
Product source of truth: `LIFE_ELO_PRODUCT_CONTEXT.md` — read it before product or scoring changes.

## Stack
Vite + React + TypeScript PWA (`vite-plugin-pwa`), local-only storage in IndexedDB via Dexie. No backend.
Target: installed on iPhone via Safari → "Add to Home Screen". UI language: Russian (for now).

Commands: `npm run dev`, `npm test` (Vitest), `npm run lint` (oxlint), `npm run build`.

## Layout
- `src/domain/` — types and day-boundary logic (`dayOf`, `reviewDay`).
- `src/engine/` — pure, deterministic rating engine (`replay`) + versioned `RulesetConfig`.
- `src/db/` — Dexie schema. Rating/streaks are never stored; they are derived by replaying confirmed reviews.
- `src/ui/` — screens.

## Rules that must hold
- Rating starts at 0 and is signed. Only three tiers: weak / medium / strong.
- Constructive "not done", unknown, not applicable and unreviewed days are neutral.
- Days are finalized by next-morning review of yesterday; editing a past day = save + replay (no double credit).
- Wellbeing check-in is optional and never modifies Elo directly.
- Reward Coins (future) are separate from Elo; spending never lowers Elo.
- Numbers in `PLACEHOLDER_RULESET` are placeholders, not agreed. Ask the user before choosing coefficients or declaring a final formula.

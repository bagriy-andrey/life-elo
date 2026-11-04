# Role: implementer

Implements ONE step of a plan in `docs/plans/`: the first unchecked `- [ ]` step unless told
otherwise. Works in the current working tree; does not touch other steps.

## Do
- Read the plan header, the step, and only the files in its file list (plus their direct imports).
- Follow `AGENTS.md`. Engine stays pure and deterministic; rating/streaks are never stored.
- Write or update tests for engine/domain logic in the same step (`*.test.ts` next to the code).
- UI: build from `src/ui/components/` and tokens in `src/ui/tokens.css`; no inline colors/sizes.
  A new component: own folder + CSS, exported from `components/index.ts`.
- If component props or `LedgerEntry` / `Contribution` types change, update
  the matching `dtsPropsFor` entry in `.design-sync/config.json` in the same step.
- Stop and report instead of guessing if the step is ambiguous, needs a scoring decision,
  or needs files outside its list.

## Definition of done
1. `npm test` and `npm run lint` pass (`npm run build` too if types or config changed).
2. Plan updated: step checked `- [x]`, one-line note under it if something deviated.
3. One commit for the step: `<plan NN> step <n>: <summary>`.

## Return
Files changed, test/lint result, commit hash, deviations. No code dumps.

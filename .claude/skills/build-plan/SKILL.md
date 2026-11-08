---
name: build-plan
description: "Builds the next step(s) of an approved plan in docs/plans/: implementer → verifier → at most one fix round. Run manually with /build-plan <plan-path> [all]."
user-invocable: true
---

# Build plan

Input: a plan path (`docs/plans/NN-<slug>.md`). Without one, use the plan named in `HANDOFF.md`;
if there is none, ask. `all` = keep going through remaining steps; default = one step.
Codex: perform the same loop yourself, following each role file instead of dispatching agents.

1. **Preflight.** Plan `Status` must be `approved` and "Open questions" empty — otherwise stop
   and show what's missing. Not on `main` (create `<slug>` branch if so). Working tree clean.
2. **Implement.** Dispatch `implementer` with the plan path and the first unchecked step number.
   If it stops with a question, relay it to the user and stop.
3. **Verify.** Dispatch `verifier` with the plan path and the step's commit.
   - PASS → next step (if `all`), else go to 5.
   - FAIL → one fix round: dispatch `implementer` with the CRITICAL findings only, then
     re-run `verifier`. Still FAIL → stop and report; do not loop again.
4. Repeat 2–3 for the next step only when `all` was given. Never run steps in parallel.
5. **Wrap up.** If the plan has no unchecked steps, set `Status: done`. If the verifier
   reported "Design re-sync: needed" or a `[design-sync]` step was built, put
   "Run `/design-sync`" in Next step and tell the user. Rewrite `HANDOFF.md` in the
   `handoff` skill's format and commit it separately as `handoff: <state>`.
   When the last step of the plan is checked and verified, bump `package.json` and
   `package-lock.json` to `0.NN.0` (NN = plan number) and commit `chore: version 0.NN.0`;
   a fix round within a plan bumps the patch (`0.NN.1`, ...).

Report: steps done, verdicts, commits, anything blocking. Keep it short.

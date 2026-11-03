# Plans

One file per feature: `NN-<slug>.md`, written by the planner role (`docs/agents/planner.md`).
Checkboxes are the source of truth for progress: any agent (Claude or Codex) resumes at the
first unchecked step.

## Template

```markdown
# NN — <feature>

Status: draft | approved | done
Design input: <Claude Design link / export path, or "none">

## Why
<2–4 lines: problem and goal, with a pointer to LIFE_ELO_PRODUCT_CONTEXT.md section>

## Acceptance criteria
- WHEN <condition> THE app SHALL <behavior>

## Open questions
- <only things the user must decide; empty once approved>

## Steps
- [ ] 1. <summary> — files: `a.ts`, `a.test.ts` — verify: <test / check>
- [ ] 2. [design-sync] <summary> — files: … — verify: …
```

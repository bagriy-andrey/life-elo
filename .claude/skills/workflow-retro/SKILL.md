---
name: workflow-retro
description: "Short retrospective of a just-finished multi-agent run (e.g. /build-plan): agents launched, tokens/tool calls/duration per agent, clarification rounds, duplicated work, recommendations. Appends to .claude/workflow-retros.md. Run manually with /workflow-retro while the run is still in context."
user-invocable: true
---

# Workflow retro

Grades how the agents performed, not the feature. Uses only the current conversation.

Collect:
1. **Agents in order** — each Agent call: type, one-line purpose, resumes.
2. **Cost** — per completed subagent: tokens, tool uses, duration from its usage block; total.
   Main-thread spend is not visible here — point to `/cost`.
3. **Clarification rounds** — who asked, how many, and whether a stated default would have avoided it.
4. **Waste** — repeated reads/questions, context re-derived instead of passed forward, failed fix rounds.
5. **Recommendations** — concrete edits to a named file (`docs/agents/*.md`, a skill, `AGENTS.md`).

Status: **clean** (0–1 rounds, no rework) · **noisy** (2+ rounds or rework, but landed) · **blocked**.

Print the entry, and append it (append-only; create the file if missing) to `.claude/workflow-retros.md`:
```
## <YYYY-MM-DD> — <plan / workflow>
Status: … · Agents: a → b → … · Subagent tokens: N (see /cost for total)
| Agent | Tokens | Tool calls | Duration |
Clarifications: … · Waste: … · Vs previous: <delta or "first">
Recommendations:
- …
```
Touch no other file.

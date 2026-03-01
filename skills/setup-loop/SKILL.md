---
name: setup-loop
description: Set up a production-ready Agent Loop in any repository from an existing plan/spec or from scratch. Use when asked to initialize or fix Agent Loop configuration, convert a detailed plan into checklist-driven execution, enforce verification and backpressure gates, or prepare a reviewer-friendly demo. Apply Ralph methodology for loop correctness (template tag, checklist semantics, context, verification, completion contract); run al validate; never run al start unless explicitly asked; always end with one start command for the user.
---

# Agent Loop Setup

Focus on Agent Loop correctness and operating model using Ralph methodology. Treat scaffolding as a quick bootstrap step.

## Canonical Source Of Truth

Read these local references before making loop decisions:

1. `references/agent-loop-readme.md` (CLI/config contract)
2. `references/ralph-loop-core.md` (core loop method)
3. `references/ralph-loop-advanced.md` (optional advanced patterns)
4. `references/templates/README.md` (template set orientation)
5. `references/templates/*` (prompt + loop shell template files)
6. `references/demo/README.md` (reviewer-friendly demo flow)
7. `references/demo/.al/loops/smoke.json` (concrete loop config)
8. `references/demo/scripts/demo-proof-gate.sh` (deterministic verification gate example)

If references might be stale, cross-check upstream:

- `/Users/n14/Projects/Utilities/ralph/README.md`
- `/Users/n14/Projects/Utilities/ralph/docs/ralph/ralph-loop-core.md`
- `/Users/n14/Projects/Utilities/ralph/docs/ralph/ralph-loop-advanced.md`

## Hard Rules

- Never run `al start` or `al run` unless user explicitly asks.
- Always run `al validate <loop-name>` and resolve all issues.
- Checklist state is sourced only from the file at `plan.path`.
- `al init <name> --template <tag>` scaffolds `plan_<name>.md`; keep that naming unless the user asks for a different path.
- The configured `plan.path` is the single source of truth the loop reads/writes each iteration.
- If `template.policy.verification.required` is `true`, keep `verification.commands` non-empty and real.
- Enforce final token contract: final line must be `COMPLETE` or `CONTINUE`.
- End with exactly one user-facing start command.

## Bootstrap (Minimal)

If loop files do not exist, bootstrap once:

```bash
al init <name> --template <tag>
```

Then spend effort on Agent Loop behavior: template policy, plan/checklist semantics, context wiring, verification gates, and prompt guidance.

## Agent Loop Workflow (Ralph Methodology)

### 1) Choose Template Tag And Plan Strategy

- Plan with checklist exists: use `building` template tag.
- Detailed plan exists but no checklist: keep detailed plan as context; create checklist file for `plan.path`; use `building` template tag.
- No reliable plan: use `planning` template tag first to produce checklist plan.

### 2) Normalize Checklist Semantics (Critical)

Use markdown checkboxes in `plan.path`:

- `- [ ] Pending task`
- `- [x] Completed task`

Checklist constraints:

- One-line, action-oriented items.
- Avoid nested execution checklists.
- Keep items sized for one meaningful iteration each.

### 3) Wire Context Correctly

If detailed plan and checklist are separate:

- checklist file -> `plan.path`
- detailed plan/spec docs -> `context.files`
- set `context.includeInPrompt: true`

Reference pattern:

```json
{
  "plan": { "path": "plan_<loop-name>.md" },
  "context": {
    "files": ["docs/PLAN_DETAIL.md", "AGENTS.md"],
    "globs": [],
    "includeInPrompt": true
  }
}
```

### 4) Configure Backpressure

Configure real project checks in `verification.commands` whenever `template.policy.verification.required` is `true`:

- lint/typecheck/tests/build as applicable
- fast commands first, slow commands later
- no invented commands

Behavior:

- If `template.policy.verification.required` is `false`, verification does not run.
- If `template.policy.verification.required` is `true` and `runOnExecutorSuccessOnly` is `true`, verification runs only when executor exits `0`.
- If `template.policy.verification.required` is `true` and `runOnExecutorSuccessOnly` is `false`, verification runs regardless of executor exit code.
- First failed verification command forces loop to continue (not complete).
- If `template.policy.completion.requireChecklistEmpty` is `true`, `COMPLETE` is rejected when unchecked checklist items remain.

### 5) Tune Prompts For Agent Loop Behavior

Author/update:

- `.al/prompts/<name>.objective.md`
- `.al/prompts/<name>.template.md`

Template prompt should enforce:

- study requirements and code first
- do not assume missing implementation
- complete one checklist item per iteration
- run verification commands
- update checklist accurately
- emit only final token line

### 6) Configure Executor

Default scaffold executor profile (`al init`):

- command: `codex`
- args: `--search -a never exec --cd {workdir} --sandbox danger-full-access --output-last-message {outMessage} -`
- model/reasoning: not set by default in scaffold; set explicitly per project if needed (example: `-m gpt-5.3-codex`, `-c model_reasoning_effort="low"`).
- stdin mode: `prompt_file`
- completion tokens: `COMPLETE` / `CONTINUE`

Template note:

- Init templates currently configure policy + default verification commands, not executor model/reasoning defaults.

### 7) Validate Readiness

Always run:

```bash
al validate <name>
```

Do not claim ready until validation is clean.

## Handoff Contract

Provide:

- files created/updated
- `template.tag` + policy summary + `plan.path` + context summary + verification command summary
- exactly one start command

Start command choice:

- new run: `al start <name> --fresh`
- resume: `al start <name>`
- bounded demo: `al start <name> --fresh --max-iters <n>`

Do not execute it unless explicitly requested.

## Demo Guidance

When user wants a proof-friendly example:

- isolate in `demo/`
- persist prompt + agent logs
- add deterministic verification that proves per-iteration progress
- ensure artifacts make progression auditable

Reference implementation:

- `references/agent-loop-readme.md`
- `references/demo/README.md`
- `references/demo/.al/loops/smoke.json`
- `references/demo/scripts/demo-proof-gate.sh`

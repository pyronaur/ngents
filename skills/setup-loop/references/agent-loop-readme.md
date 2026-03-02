# Agent Loop

Agent Loop is a configurable loop runner for autonomous plan/build workflows.

It manages iteration state, prompt assembly, validation, and policy gates while delegating implementation work to an agent adapter (default: `codex`) plus optional lifecycle hooks.

## What This Repo Contains

- Loop lifecycle engine (`init`, `start`, `clear`, `status`, `validate`)
- JSON schema-based loop config (`.al/loops/<name>.json`)
- Prompt composition contract (template + objective + plan + optional context)
- Execution artifacts and resumable run state under `.al/runs/<name>/`
- Ralph methodology docs and templates in `docs/ralph/`

## Prerequisites

- Node.js
- npm
- `agent-loop` command available in PATH

Install deps:

```bash
npm install
```

## Quick Start

1. Create a loop scaffold from a template tag:

```bash
agent-loop init demo --template building
```

2. This creates:

- `.al/loops/demo.json`
- `.al/prompts/demo.objective.md`
- `.al/prompts/demo.template.md`
- `plan_demo.md`

3. Edit loop objective + template prompt:

- `.al/prompts/demo.objective.md`
- `.al/prompts/demo.template.md`

4. Edit verification commands in `.al/loops/demo.json`.

`init --template building` seeds a failing placeholder command so you must set real checks.

5. Validate config and required files:

```bash
agent-loop validate demo
```

6. Run one iteration budget:

```bash
agent-loop start demo --limit 1
```

Sample output:

```text
[14:03:21] 1/50 Start
[14:03:49] 1/50 Continue ‧ 28s
           updated plan and tests
[14:03:49] 1/1 Continue ‧ 28s
```

7. Or run a larger budget:

```bash
agent-loop start demo --limit 20
```

Sample output:

```text
[14:10:01] 1/20 Start
[14:10:40] 1/20 Continue ‧ 39s
           implemented task A
[14:10:40] 2/20 Start
[14:11:07] 2/20 Done ‧ 27s
[14:11:07] 2/20 Done ‧ 1 min 6s
```

8. Inspect status:

```bash
agent-loop status demo
agent-loop status demo --json
```

Optional local alias (machine-specific):

```bash
alias al='agent-loop'
```

## Template Tags

Template tags are resolved from `src/templates/init/<tag>.md` + `src/templates/init/<tag>.json`.

Built-in tags:

- `building`: required verification + checklist-empty completion gate
- `planning`: verification optional + no checklist-empty completion gate
- `debug-hypothesis`: deterministic bug-fix loop with required verification and no checklist-empty gate

## Commands

```bash
agent-loop init <name> --template <tag>
agent-loop validate <name> [--json] [--timeout-ms <n>]
agent-loop start <name> [--limit <n>] [-- <agent-args...>]
agent-loop clear <name>
agent-loop status <name> [--json]
```

Notes:

- `start` resumes from prior state when unfinished
- `start --limit N` runs up to N additional iterations from current state
- `start` without `--limit` uses configured `maxIterations` as the run budget default
- `start` fails if the prior run is complete; clear run artifacts first with `agent-loop clear <name>`
- `clear` removes only `.al/runs/<name>/`
- args after `--` are forwarded to the agent command for `start`
- `validate` checks required files and can execute verification commands as preflight when policy requires verification

## Config (Core Fields)

Each loop config lives at `.al/loops/<name>.json`.

Minimal practical shape:

```json
{
  "name": "demo",
  "workdir": ".",
  "maxIterations": 50,
  "prompt": {
    "source": "file",
    "path": ".al/prompts/demo.objective.md"
  },
  "template": {
    "tag": "building",
    "path": ".al/prompts/demo.template.md",
    "policy": {
      "verification": {
        "required": true,
        "runOnExecutorSuccessOnly": true
      },
      "completion": {
        "requireChecklistEmpty": true,
        "ruleText": "COMPLETE is valid only when all required work is done, all verification commands pass, and checklist remaining is 0."
      }
    }
  },
  "plan": { "path": "plan_demo.md" },
  "context": {
    "files": [],
    "globs": [],
    "includeInPrompt": false
  },
  "verification": {
    "commands": ["npm test"]
  },
  "agent": {
    "type": "codex",
    "command": "codex",
    "args": [],
    "resume": { "enabled": true }
  },
  "hooks": {
    "before_run": [],
    "before_iteration": [],
    "after_executor": [],
    "after_verification": [],
    "after_iteration": [],
    "after_run": []
  },
  "completion": {
    "completeToken": "COMPLETE",
    "continueToken": "CONTINUE"
  },
  "logging": {
    "persistPromptFiles": true,
    "persistAgentLogs": true
  }
}
```

## Agent Contract

Agent Loop builds a full iteration prompt from:

- selected template text
- objective
- plan contents
- policy-derived verification/output contract
- optional context docs (`context.includeInPrompt: true`)

Your agent must output a final decision token line:

- `COMPLETE`
- `CONTINUE`

If template policy requires verification/checklist gating, `COMPLETE` is accepted only when those gates pass.

## Hooks Contract

Hooks are external commands executed at loop lifecycle events:

- `before_run`
- `before_iteration`
- `after_executor`
- `after_verification`
- `after_iteration`
- `after_run`

Each hook receives JSON on stdin and may return JSON directives on stdout:

- `control.forceStatus` (`complete` or `continue`)
- `agent.resumeNow.message` (triggers same-thread agent resume within the iteration)

Hook failures are fail-open: the loop continues and records hook warnings.

## Run Artifacts

For loop `<name>`, Agent Loop writes under `.al/runs/<name>/`:

- `state.json` (iteration + completion state)
- `prompt.<n>.md` (if enabled)
- `last_message.<n>.txt`
- `agent.log.<n>.txt` (if enabled)

## Recommended Workflow

1. `agent-loop init <name> --template <tag>`
2. Customize prompts/config/plan
3. `agent-loop validate <name>`
4. Iterate with `agent-loop start <name> --limit 1` while tuning
5. Use `agent-loop start <name>` for larger continuous budgets
6. Reset run artifacts with `agent-loop clear <name>` when you want a new run from iteration 1
7. Monitor via `agent-loop status <name>`

## Demo Reference

For a complete, reviewer-friendly example Agent Loop setup, see `demo/README.md`.

## Docs

- Full API reference: `docs/api-reference.md`
- Core Ralph loop guide: `docs/ralph/ralph-loop-core.md`
- Advanced Ralph loop patterns: `docs/ralph/ralph-loop-advanced.md`
- Template set referenced by the guide: `docs/ralph/templates/README.md`

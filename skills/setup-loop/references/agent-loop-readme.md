# Agent Loop

Agent Loop is a configurable loop runner for autonomous plan/build workflows.

It manages iteration state, prompt assembly, validation, and policy gates while delegating implementation work to an external executor (default: `codex`).

## What This Repo Contains

- Loop lifecycle engine (`init`, `run`, `start`, `status`, `validate`)
- JSON schema-based loop config (`.al/loops/<name>.json`)
- Prompt composition contract (template + objective + plan + optional context)
- Execution artifacts and resumable run state under `.al/runs/<name>/`
- Ralph methodology docs and templates in `docs/ralph/`

## Prerequisites

- Node.js
- npm
- `al` command available in PATH

Install deps:

```bash
npm install
```

## Quick Start

1. Create a loop scaffold from a template tag:

```bash
al init demo --template building
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
al validate demo
```

6. Run one iteration:

```bash
al run demo
```

Sample output:

```text
[14:03:21] 1/50 Start
[14:03:49] 1/50 Continue ‧ 28s
           updated plan and tests
[14:03:49] 1/1 Continue ‧ 28s
```

7. Or run the full loop:

```bash
al start demo --max-iters 20
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
al status demo
al status demo --json
```

## Template Tags

Template tags are resolved from `src/templates/init/<tag>.md` + `src/templates/init/<tag>.json`.

Built-in tags:

- `building`: required verification + checklist-empty completion gate
- `planning`: verification optional + no checklist-empty completion gate

## Commands

```bash
al init <name> --template <tag>
al validate <name> [--json] [--timeout-ms <n>]
al run <name> [--iteration <n>]
al start <name> [--max-iters <n>] [--fresh]
al status <name> [--json]
```

Notes:

- `--fresh` clears `.al/runs/<name>/` before `start`
- `start` resumes from prior state unless complete or `--fresh` is used
- `validate` checks required files and can execute verification commands as preflight when policy requires verification

## Config (Core Fields)

Each loop config lives at `.al/loops/<name>.json` and uses schema version `3`.

Minimal practical shape:

```json
{
  "version": 3,
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
  "executor": {
    "command": "codex",
    "args": [
      "--search",
      "-a",
      "never",
      "exec",
      "--cd",
      "{workdir}",
      "--sandbox",
      "danger-full-access",
      "--output-last-message",
      "{outMessage}",
      "-"
    ],
    "stdinMode": "prompt_file"
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

## Executor Contract

Agent Loop builds a full iteration prompt from:

- selected template text
- objective
- plan contents
- policy-derived verification/output contract
- optional context docs (`context.includeInPrompt: true`)

Your executor must output a final decision token line:

- `COMPLETE`
- `CONTINUE`

If template policy requires verification/checklist gating, `COMPLETE` is accepted only when those gates pass.

## Run Artifacts

For loop `<name>`, Agent Loop writes under `.al/runs/<name>/`:

- `state.json` (iteration + completion state)
- `prompt.<n>.md` (if enabled)
- `last_message.<n>.txt`
- `agent.log.<n>.txt` (if enabled)

## Recommended Workflow

1. `al init <name> --template <tag>`
2. Customize prompts/config/plan
3. `al validate <name>`
4. Iterate with `al run <name>` while tuning
5. Use `al start <name>` for continuous execution
6. Monitor via `al status <name>`

## Demo Reference

For a complete, reviewer-friendly example Agent Loop setup, see `demo/README.md`.

## Docs

- Core Ralph loop guide: `docs/ralph/ralph-loop-core.md`
- Advanced Ralph loop patterns: `docs/ralph/ralph-loop-advanced.md`
- Template set referenced by the guide: `docs/ralph/templates/README.md`

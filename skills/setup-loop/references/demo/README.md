# Agent Loop Demo

Minimal, self-contained reference setup showing a correct Agent Loop in `demo/`.

## What this demonstrates

- Loop config + prompt + spec + plan layout
- Codex agent adapter config with resume support
- Building-template verification + checklist gate behavior
- Exactly three iterations where each iteration can complete only one checklist item
- Reproducible reset and rerun flow

## Layout

- `.al/loops/smoke.json`: loop config
- `.al/prompts/smoke.objective.md`: objective prompt
- `.al/prompts/smoke.template.md`: selected loop template prompt
- `specs/dummy-task.md`: requirements for 3-step progression
- `plan_smoke.md`: three checklist tasks
- `src/step1.txt`, `src/step2.txt`, `src/step3.txt`: meaningful step outputs
- `scripts/demo-proof-gate.sh`: strict demo-only progression gate
- `scripts/reset.sh`: reset fixture state for reruns

## Prereqs

- `agent-loop` command available in PATH
- `codex` CLI authenticated

## Canonical run

```bash
cd demo
./scripts/reset.sh
agent-loop validate smoke
agent-loop start smoke --limit 3
agent-loop status smoke --json
```

## Inspect per-iteration proof in demo artifacts

```bash
cat .al/runs/smoke/demo_progress.log
cat .al/runs/smoke/last_message.1.txt
cat .al/runs/smoke/last_message.2.txt
cat .al/runs/smoke/last_message.3.txt
cat .al/runs/smoke/agent.log.1.txt
cat .al/runs/smoke/agent.log.2.txt
cat .al/runs/smoke/agent.log.3.txt
cat plan_smoke.md
cat src/step1.txt src/step2.txt src/step3.txt
```

Expected:

- `demo_progress.log` shows `iteration=1 checked=1`, `iteration=2 checked=2`, `iteration=3 checked=3`
- `last_message.1.txt` and `last_message.2.txt` are `CONTINUE`
- `last_message.3.txt` is `COMPLETE`
- plan ends with all three items checked
- step files contain iteration-specific greetings

## Run artifacts

Generated under `.al/runs/smoke/`:

- `state.json`
- `prompt.<n>.md`
- `last_message.<n>.txt`
- `agent.log.<n>.txt`
- `demo_progress.log`

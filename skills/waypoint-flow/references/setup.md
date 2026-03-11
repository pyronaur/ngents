# Waypoint Flow Setup

## Purpose

Waypoint flow setup adds the repo instructions that make agents load `$waypoint-flow`.

Those repo instructions should:
- opt the repo into waypoint flow
- declare the repo’s `Waypoint Gate` with the exact label `Waypoint Gate:`
- define the exact command or exact ordered command list that must pass before the waypoint commit happens

Those repo instructions should not:
- explain how to commit
- tell the agent to commit immediately
- duplicate waypoint-flow runtime behavior

## Setup Procedure

1. Read the current repo `AGENTS.md`.
2. Inspect the repo’s verification shape.
3. Determine the exact command or exact ordered command list that should act as the `Waypoint Gate` in this repo.
4. If the correct command or command list is not obvious, ask the user.
5. Add one of the install variants below to the repo `AGENTS.md`.
6. Always use the exact label `Waypoint Gate:`.

## Install Variants

### Single Command Gate

Add these exact lines:

```text
## Waypoint Gate
Required: Read `~/.waypoint-flow.md` before writing code. Always keep this file in memory and re-read as soon as you forget.
Required: Follow that file for the full session and always keep its rules in memory while working in this repo.
Waypoint Gate:
- `<command 1>`
```

### Multiple Command Gate

Add these exact lines:

```text
## Waypoint Gate
Required: Read `~/.waypoint-flow.md` before writing code. Always keep this file in memory and re-read as soon as you forget.
Required: Follow that file for the full session and always keep its rules in memory while working in this repo.
Waypoint Gate:
- `<command 1>`
- `<command 2>`
```

## Gate Selection Guidance

- Prefer the smallest real verification command or real ordered command list that the repo wants to use as the `Waypoint Gate`.
- Do not invent symbolic gates.
- Do not summarize commands as `current-step`, `full-repo`, or any other abstract label.
- Write the actual command text the agent should run.
- Preserve command order when multiple commands are required.
- If the repo does not make the correct `Waypoint Gate` obvious, ask the user instead of defaulting silently.

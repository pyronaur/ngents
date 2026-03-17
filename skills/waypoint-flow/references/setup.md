# Waypoint Flow Setup

## Purpose

Waypoint flow setup adds the repo instructions that make agents load `$waypoint-flow`.

Those repo instructions should:
- opt the repo into waypoint flow
- keep the waypoint-flow read instruction in `AGENTS.md` verbatim
- add a `Waypoint Flow Policy` section that points agents back to `~/.waypoint-flow.md` as the default authority for work style
- declare a `Waypoint Gate` heading for the exact gate commands
- define the exact command or exact ordered command list that must pass before the waypoint commit happens

Those repo instructions should not:
- explain how to commit
- try to encode the whole shared waypoint philosophy in every repo
- use a rigid gate choice without checking how the repo is actually verified

## Setup Procedure

1. Read the current repo `AGENTS.md`.
2. Inspect the repo’s verification shape and working style.
3. Determine the exact command or exact ordered command list that should act as the `Waypoint Gate` in this repo.
4. Determine what repo-specific waypoint policy should live in `AGENTS.md` and what should stay in `~/.waypoint-flow.md`.
5. If the correct gate or repo-specific policy is not obvious, ask the user.
6. Update the repo `AGENTS.md` using the starter template below.
7. Keep the `Waypoint Gate` heading clear and local to the repo policy section.

## Required Verbatim Lines

Keep this line verbatim:

```text
Required: Read `~/.waypoint-flow.md` before writing code. Always keep this file in memory and re-read as soon as you forget.
```

## Starter Template

Adapt this template to the repo. Keep the `Required:` line verbatim, keep the `Waypoint Gate` heading clear, and tailor the gate commands and repo-specific policy to the project.

```text
## Waypoint Flow Policy
Required: Read `~/.waypoint-flow.md` before writing code. Always keep this file in memory and re-read as soon as you forget.
Treat `~/.waypoint-flow.md` as the authority for waypoint-flow work style and commit cadence in this repo.
Use the `Waypoint Gate` commands as the full verification gate for each stable slice in this repo.
`<repo-specific waypoint policy>`

### Waypoint Gate
- `<command 1>`
```

## Gate Selection Guidance

- Prefer the smallest real verification command or real ordered command list that the repo wants to use as the `Waypoint Gate`.
- Prefer the earliest full gate that can validate a stable vertical slice in this repo.
- Do not invent symbolic gates.
- Do not summarize commands as `current-step`, `full-repo`, or any other abstract label.
- Write the actual command text the agent should run.
- Preserve command order when multiple commands are required.
- Put only repo-specific waypoint expectations in `AGENTS.md`; keep shared work-style behavior in `~/.waypoint-flow.md`.
- If the repo does not make the correct `Waypoint Gate` or policy shape obvious, ask the user instead of defaulting silently.

---
name: pickup
description: Rehydrate execution context before making changes using a fast, repeatable startup checklist. Use when resuming from handoff, joining an existing branch/session, or asked to run pickup.
---

# Pickup

Purpose: rehydrate context quickly before edits.

Steps:

1. Read instructions/docs
- Read `AGENTS.md`.
- Run `ngents docs`; open relevant docs.

2. Check repo state
- Run `git status -sb`.
- Confirm branch and local commits.

3. Check PR/CI context
- Inspect PR comments/files/checks if PR exists.

4. Check process context
- List tmux sessions.
- Attach/capture when live sessions exist.

5. Check test context
- Identify what already ran.
- Identify what must run first.

6. Plan immediate actions
- List next 2-3 actions.
- Start executing.

Output format: concise bullets; include copy/paste tmux commands when sessions are live.

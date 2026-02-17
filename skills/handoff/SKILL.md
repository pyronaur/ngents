---
name: handoff
description: Package current work state for agent-to-agent transfer with concise, executable handoff notes. Use when ending a session, pausing with unfinished work, switching agents, or when asked to produce a handoff prompt.
---

# Handoff

Purpose: package current state so next agent resumes fast.

Include, in order:

1. Scope/status
- State attempted, done, pending, blocked.

2. Working tree
- Run `git status -sb`.
- Note whether local commits exist.

3. Branch/PR
- State current branch.
- Include PR URL/number if present.
- Include CI status if known.

4. Running processes
- List tmux sessions/panes.
- Include attach/capture commands.

5. Tests/checks
- List commands already run.
- Mark pass/fail.
- Note what remains.

6. Next steps
- Provide ordered first actions for next agent.

7. Risks/gotchas
- Call out flaky tests, flags, credentials, brittle areas.

Output format: concise bullets; include copy/paste commands for live sessions.

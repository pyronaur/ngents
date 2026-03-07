---
name: handoff
description: Invoked by user to prepare a session handoff document.
---

# Handoff

Purpose: package current state so that the next agent has full context.
Consider: What is important for us to continue this conversation/work to onboard an agent that is unaware of the codebase and the task at hand.
Style: Export your full context, use max effort, max output, be as verbose as possible
Focus: Discard irrelevant information and keep what's important.


Include, in order:

1. Scope/status
- Current Objective
- State attempted, done, pending, blocked.

2. Working tree
- Run `git status -sb`.
- Note whether local commits exist.

3. What you have learned
- Include what you have learned in this thread
- Include any ideas that match:
	- Note decisions made and confirmed by the user
		- What to do
		- What not to do
	- Note what user has explicitly stated to be uncertain

4. Running processes
- SKIP IF: We have not used `tmux` in the  the current session.
- List tmux sessions: `tmux list-sessions`.
- Include copy/paste commands to inspect live sessions:
  - `tmux attach -t codex-shell`
  - `tmux capture-pane -p -J -t codex-shell:0.0 -S -200`

5. Tests/checks
- SKIP IF: All lints and tests have passed after the previous write operation
- List commands already run.
- Mark pass/fail.
- Note what remains.

6. Next steps
- Provide ordered first actions for next agent.

7. Risks/gotchas
- Call out flaky tests, flags, credentials, brittle areas.

8. Catch-up Material:
- Don't export what you can easily look up/understand from just reading code or existing documentation. 
- List references to documentation, code, utilities, help commands as necessary that will fill context.

Output consideration: Focus on ideas, concepts, what you've learned, and how to re-learn the information you've learned so far.
Output format: concise bullets; include copy/paste commands for live sessions.

## Exclude
Don't include references to `AGENTS.md`. These files are always automatically loaded into context anyway.

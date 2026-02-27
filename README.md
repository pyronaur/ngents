# Agent Toolkit

This is my current Codex setup.

It contains the rules, docs, and reusable skills that shape how the agent behaves when we work together: how tasks are approached, which tools to prefer, and how changes are checked before handoff.

## Project Layout

- `AGENTS.md`  
  Core behavior contract for the agent.

- `TOOLS.md`  
  Practical guidance for the command-line tools used in this workflow.

- `skills/`  
  Task-specific skill packs. Each skill has its own `SKILL.md` with focused instructions.

- `docs/`  
  Supporting runbooks and references used during execution.

- `scripts/`  
  Home for executable helpers used by this toolkit.

## Scripts Directory

This is where I keep the common scripts that agents can self-improve over time. Still WIP.

- `scripts/docs.ts`  
  Scans docs folders, reads front matter, and prints a docs index with `summary` and `read_when` metadata.  
  This is what powers the `ngents docs` command.

The point of this directory is to keep small, practical automation close to the instructions and docs it supports.

## Who This Is For

- People building their own Codex/agent workflow.
- Anyone who wants a modular setup with docs + skills + tool conventions in one place.


## Credits
 This is largerly inspired by @steipete's [agent-scripts](https://github.com/steipete/agent-scripts).

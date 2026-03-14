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
  Supporting runbooks plus `docs/topics/*` topic directories used during execution.

- `scripts/`  
  Home for executable helpers used by this toolkit.

## Scripts Directory

This is where I keep the common scripts that agents can self-improve over time. Still WIP.

- `scripts/docs.ts`  
  Powers `ndex` and `ngents docs`, browsing root docs plus `docs/topics/*` with progressive disclosure and preserving `summary` / `read_when` metadata.

- `scripts/ndexq.ts`
  Powers `ndexq`, a small QMD-backed search command for the global `~/.ngents/docs` library with machine-local cache and config under `~/.ngents/local`.

- `scripts/bins.ts`  
  Lists globally linked local-source packages and their exposed Bun/npm bin shims via `ngents bins`.

The point of this directory is to keep small, practical automation close to the instructions and docs it supports.

## Who This Is For

- People building their own Codex/agent workflow.
- Anyone who wants a modular setup with docs + skills + tool conventions in one place.


## Credits
 This is largerly inspired by @steipete's [agent-scripts](https://github.com/steipete/agent-scripts).

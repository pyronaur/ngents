# NGENTS
- ngents is a set of tools, docs, instructions, protocols to improve your workflow.
- `~/.ngents/AGENTS.md` is symlinked to `~/.agents.md/AGENTS.md`.
- Instructions portable across machines.

## Agent Protocol
- Style: slack chat
- Approach: less is more, we can always add more later. When planning, aim for less features and more simplification.
- Leave It Better than you found it: refactors are always welcome, when they unblock, simplify or deduplicate.
- Guardrails: use `trash` for deletes.
- Bugs: prove bug first by creating a correct path test, if it fails, fix the bug, then validate it passes.
- Prefer end-to-end verify; if blocked, say what’s missing.
- Web: search early; quote exact errors; prefer 2025–2026 sources; prefer `kpw` for JS-based pages; for more tools, review `TOOLS.md`.
- Browser: `kpw --help`
- use zoxide to find paths on system
- Scope lock: if next action includes anything beyond user’s explicit request (especially file modification, deletion, or side-effect command), stop and ask for explicit confirmation first, regardless of surrounding context or inferred intent.
- Overcorrection: when cleaning up, don't leave a trail of "cleaned up here".
- Docs: update docs only where the requested behavior changed, and write only present-state facts; never add migration/removal/history wording (removed, no longer, previously, now, will).

## Canonical Paths
- Projects root: `~/Projects`
- iOS projects: `~/Projects/iOS`
- Shell/config repo: `~/.nconf` (read for machine specific docs)
- Private docs and runbooks: `~/.nconf/docs`

## Host Context Resolution
- Use `~/.nconf/docs/hosts/README.md` when host-specific context is needed.
- Follow the host resolution instructions documented there when applicable.
- Do not guess host aliases, SSH targets, or network topology.

## Docs
- Start: run docs list (`ngents docs`); open docs before coding.
- Order: docs -> source -> execute. No deep search before docs scan.
- Follow links until domain makes sense; honor `Read when` hints.
- Keep notes short; update docs when behavior/API changes (no ship w/o docs).
- Add `read_when` hints on cross-cutting docs.
- Skill docs live in `skills/<name>/SKILL.md`.

## Critical Thinking
- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options.
- Conflicts: call out; pick safer path.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- Leave breadcrumb notes in thread.

## Flow & Runtime
- Use repo’s package manager/runtime; no swaps w/o approval.
- Use Codex background for long jobs; tmux only for interactive/persistent (debugger/server).

## Build / Test
- Before handoff: run full gate (lint/typecheck/tests/docs).
- Keep it observable (logs, panes, tails, MCP/browser tools).
- Release: use repo-local checklist if present; if missing, write a minimal checklist before shipping.

## Git
- Safe by default: `git status/diff/log`. Push only when user asks.
- `git checkout` ok for PR review / explicit request.
- Branch changes require user consent.
- Destructive ops forbidden unless explicit (`reset --hard`, `clean`, `restore`, `rm`, …).
- Remotes under `~/Projects`: prefer HTTPS; flip SSH->HTTPS before pull/push.
- Don’t delete/rename unexpected stuff; stop + ask.
- No repo-wide S/R scripts; keep edits small/reviewable.
- Avoid manual `git stash`; if Git auto-stashes during pull/rebase, that’s fine (hint, not hard guardrail).
- If user types a command ("pull and push"), that’s consent for that command.
- No amend unless asked.
- Big review: `git --no-pager diff --color=never`.
- Multi-agent: check `git status/diff` before edits; ship small commits.

## Language/Stack Notes
- Swift: use workspace helper/daemon; validate `swift build` + tests; keep concurrency attrs right.
- TypeScript: use repo PM; run `ngents docs`; keep files small; follow existing patterns.

## Code Style
- Prefer guard clauses + early returns; avoid `else`.
- Keep functions/methods small; reduce cognitive load.
- Avoid loop-in-loop; extract helper function.
- Avoid nesting deeper than 3 levels.
- Keep files <~500 LOC; split/refactor as needed.

## macOS Permissions / Signing (TCC)
- Never re-sign / ad-hoc sign / change bundle ID as "debug" without explicit ok (can mess TCC).

## Tools
- Keep entries portable. Host-only tools/paths belong in `~/.nconf/docs/hosts/`
- Bunmagic: Bun.js script-to-command framework with built-ins; Read Bunmagic 101 for implementation details.
- common: `trash`, `gh`, `zoxide`, `xcodegen`, `ast-grep`, `comby`.
- specialized: `ngents`, `xcp`, `axe`, `oracle`, `kpw`, `mcporter` (read `~/.ngents/TOOLS.md` first for usage).
- For debugging, logging, server running use `tmux` and read docs/tmux.md

### MCP Access
- Not using MCPs in Codex; use `mcporter` instead.
  - `exa`: web research/search
  - `xcodebuild`: Apple platform build/sim/debug
- `mcporter list <server> [--schema]` / `mcporter call <server.tool> [key=value]`
- Usage/source of truth: `TOOLS.md` (`mcporter`).

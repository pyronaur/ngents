# AGENTS.md
- ngents is a set of tools, docs, instructions, protocols to improve your workflow.
- `~/.ngents/AGENTS.md` is symlinked to `~/.agents.md/AGENTS.md`.
- Instructions portable across machines.

## Agent Protocol
- Guardrails: use `trash` for deletes.
- Bugs: prove bug first by creating a correct path test, if it fails, fix the bug, then validate it passes.
- Prefer end-to-end verify; if blocked, say what’s missing.
- Web: search early; quote exact errors; prefer 2025–2026 sources; use `kpw` for JS-based pages; 
- Any legacy-guardrail code requires explicit user request in the same thread; otherwise it is forbidden.
- Remove means purge: when asked to remove a feature, flag, CLI option, or API surface, delete all traces. Never add error-throwing stubs, deprecation guards, or removal-verification tests as a substitute for deletion.
- No residue: every artifact must justify its existence in the final design. If a file, function, method, type, comment, flag, branch, wrapper, alias, helper, or test no longer has a concrete job, delete it.
- Do not leave pointer files, redirect comments, compatibility shims, placeholder code, dead wrappers, no-op helpers, or explanatory leftovers unless explicitly requested in this thread.
- When behavior or authority moves, the new location becomes the only source of truth. Remove the old structure entirely instead of leaving a stub behind.
- Before keeping any existing artifact, answer: `What exact job does this still perform after my change?` If the answer is vague, historical, defensive, or "just in case," remove it.
- Docs: update docs only where the requested behavior changed, and write only present-state facts; never add migration/removal/history wording (removed, no longer, previously, now, will).

## Communication Style

Use **chat** by default. Switch to the `explain` skill when the question asks for an explanation.
Revert to chat immediately after. 

### Chat rules
- Answer the question in the first sentence.
- Add one or two sentences of context only if they change the answer.
- Stop. Do not pad, do not summarize, do not offer follow-ups.
- Match the pace of a fast back-and-forth. Treat each message as a reply, not a report.

### When to use chat
- Any question that can be answered in a few sentences
- Follow-up questions after an explanation
- Confirmations, decisions, quick lookups, status checks
- Anything where a short answer is the complete answer

### When to use explain
Switch when the question contains words like: explain, describe, walk me through,
how does X work, what is X, why does X exist.
Also switch when the user wants concept, feature, system, architecture, or codebase understanding, or when a correct answer would require more than three paragraphs to be useful.



## Mac
- Projects root: `~/Projects`
- iOS projects: `~/Projects/iOS`
- Shell/config repo: `~/.nconf/AGENTS.md`
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
- Conflicts: call out and stop to ask. Do not guess when instructions conflict.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- Leave breadcrumb notes in thread.

## Flow & Runtime
- Use repo’s package manager/runtime; no swaps w/o approval.
- Use Codex background for long jobs; tmux only for interactive/persistent (debugger/server).

## Build / Test
- Before handoff: run full gate (lint/typecheck/tests/docs).
- Tests target the outermost interaction surface (outside-in, black-box). Do not add tests for internal functions, private methods, or implementation details.
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

## Architecture
- Less is more
- Single-owner minimal mode is the default
- No proactive future-proofing
- Unless Explicitly Requested: No backwards compatiblity, optional pathways
- Fix lints early, they may change your design

## Code Style
- Prefer guard clauses + early returns; avoid `else`.
- Keep functions/methods small; reduce cognitive load.
- Avoid loop-in-loop; extract helper function.
- Avoid nesting deeper than 3 levels.
- Keep files <500 LOC; split/refactor as needed.
- No deprecated aliases, no no-op placeholders, no tombstones, no compatibility branches, no residue.
- Never add legacy/deprecation guardrail tests for removed CLI/API surfaces

## Tools
- read `~/.ngents/TOOLS.md` first for usage
- use `zoxide` to find paths on system
- common: `trash`, `gh`, `zoxide`
- specialized: `ngents`, `xcp`, `axe`, `oracle`, `kpw`, `mcporter`
- For debugging, logging, server running use `tmux` and read docs/tmux.md

### MCP Access
- Usage/source of truth: `TOOLS.md` (`mcporter`).

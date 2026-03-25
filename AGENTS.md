# AGENTS.md
- ngents is a set of tools, docs, instructions, protocols to improve your workflow.
- `~/.ngents/AGENTS.md` is symlinked to `~/.agents.md/AGENTS.md`.
- Instructions portable across machines.

## Agent Protocol
- Context: Prioritize `docs` for fast access to repo/shared combined docs, notes, skills.
- MCP: If a skill or command references an MCP you do not have wired up, use `mcporter` first; it is the universal on-demand MCP path and avoids persistent config/context pollution.
- Bugs: prove bug first by creating a correct path test, if it fails, fix the bug, then validate it passes.
- Web: search early; quote exact errors; prefer 2025–2026 sources; use `kpw` for JS-based pages; 
- Docs: update docs only where the requested behavior changed, and write only present-state facts; never add migration/removal/history wording (removed, no longer, previously, now, will).
- Guardrails: use `trash` for deletes.
- Process: streamlined step by step processes we follow in docs/process
- Output: Precise & Concise. Fact check yourself before you speak.
- Output: No inline file/line references unless I directly ask for them.
- Precision: When describing code, use code signatures, not lines or files.
- Be Flexible: Rigid ideas break. When writing, reading instructions, consider the nuance on a case by case basis. Ask if unclear. Don't speak in absolutes. Don't interpret in absolutes.
- Do not broaden the task: If you notice cascading necessary changes, make sure you get explicit permission. Label broadening requests with `BROADEN:`.

## Documentation Protocol
 - `docs` is the canonical source for documentation discovery.
 - Run `docs` before text search for current instructions, maps, and entrypoints.
 - Use `docs` to build context before reading source or searching with `rg`.
 - If documentation is missing or unclear, follow the docs process to identify and plug the gap.

## Writing Style
- Follow higher-priority system formatting rules when they conflict.
- DRY: Group related content without compressing structure past readability.
	- DRY is the most important principle in writing code and text.
	- Think before you write. Organize it into groups.
	- Use lists to:
		- Avoid repeating
		- Group relevant information
		- Explain hierarchy
	- Use short paragraphs by default
	- Do not convert list-shaped content into prose
	- Nest bullet points with indentation when there are multiple items related to the previous bullet point
- Do not add framing or summary sentences at the end
- Write for scan speed
	- State only the behavior necessary
	- Drop code symbols unless the name itself matters
- Remove qualifiers that do not change the decision
	- Prefer plain nouns over implementation nouns
	- Collapse “how” into the shortest accurate verb
	- Usually unnecessary: just, explicit, effectively
- Prefer short sentences, but keep enough connective phrasing for clear structure
	- 1 sentence = 1 fact, short and direct



## Mac
- Projects Index: `docs ls machine`
- iOS projects: `~/Projects/iOS`
- Shell/config: `~/.nconf/AGENTS.md`

## Host Context Resolution
- Use `~/.nconf/docs/hosts/README.md` when host-specific context is needed.
- Follow the host resolution instructions documented there when applicable.
- Do not guess host aliases, SSH targets, or network topology.

## Docs
- Read & Maintain Docs
- Before Code: run `docs`
- Order: `docs` -> source -> execute. No deep search before docs scan.
- Follow links until domain makes sense; honor `Read when` hints.
- Keep notes short; update docs when behavior/API changes (no ship w/o docs).
- Add `read_when` hints on cross-cutting docs.
- Add `short` summary for compact `docs` output

## Critical Thinking
- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options.
- Conflicts: call out and stop to ask. Do not guess when instructions conflict.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- Required when writing: Derive wording from consumer semantics, not from the user's phrasing. Identify the layer's job, discard contrastive framing, and write only the positive contract for that consumer.

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
- Avoid manual `git stash`; if Git auto-stashes during pull/rebase, that’s fine (hint, not hard guardrail).
- If user types a command ("pull and push"), that’s consent for that command.
- No amend unless asked.
- Multi-agent: check `git status/diff` before edits; ship small commits.

## Language/Stack Notes
- Swift: use workspace helper/daemon; validate `swift build` + tests; keep concurrency attrs right.
- TypeScript: use repo PM; keep files small; follow existing patterns.

## Architecture
- Less is more
- Single-owner minimal mode is the default
- Fix lints early, they may change your design

## Code Style
- Prefer guard clauses + early returns; avoid `else`.
- Keep functions/methods small; reduce cognitive load.
- Avoid loop-in-loop; extract helper function.
- Avoid nesting deeper than 3 levels.
- Keep files <500 LOC; split/refactor as needed.
- Keep variable/method/function names short and consider context:
	- No abbreviations beyond language convention standards (i,n,std,etc.)
	- Proactively rename long variables to shorter names when possible.
	- Examples ( Bad -> Good )
		- `Ring.ringThickness` -> `Ring.thickness`
		- `HTTP.makeHttpRequest` -> `HTTP.request`
		- `HomeView.pendingDeleteHomeview` -> `HomeView.pendingDelete`
		- `findContainingDocsRoot(directoryPath: string)` -> `findTargetRoot(directoryPath: string, target = 'docs')`

## Developer Protocol
- No proactive future-proofing
- Guardrail: legacy-guardrail code is forbidden by default
- Guardrail: never insert anything "just in case"
- Remove means purge: when asked to remove a feature, flag, CLI option, or API surface, delete all traces. Never add error-throwing stubs, deprecation guards, or removal-verification tests as a substitute for deletion.
- No residue: every artifact must justify its existence in the final design. If a file, function, method, type, comment, flag, branch, wrapper, alias, helper, or test no longer has a concrete job, delete it.
- Do not leave pointer files, redirect comments, compatibility shims, placeholder code, dead wrappers, no-op helpers, or explanatory leftovers unless explicitly requested in this thread.
- Maintain source of truth: When behavior or authority moves, the new location becomes the only source of truth. Remove the old structure entirely instead of leaving a stub behind.
- No deprecated aliases, no no-op placeholders, no tombstones, no compatibility branches, no residue.
- Never write tests to assert non-existance of something

## Communication Adjustments
- Output: If I ask for an absolute path, print the literal absolute path in plain text

## Editing Constraints Override
- Prefer normal shell commands for pure filesystem operations such as `mv`, `cp`.
- Choose the simplest safe tool that matches the kind of change: content edits use `apply_patch`; file moves, copies, and directory creation use normal filesystem commands.

---
name: waypoint-flow
description: Install and apply waypoint flow, an opt-in repo commit cadence. Use when asked for `$waypoint-flow setup`, when a repo wants waypoint flow, or when the repo `AGENTS.md` says to read `$waypoint-flow` once per session before making changes. After it is loaded, follow the repo’s `Waypoint Gate` and create waypoint commits for your own verified changes.
---

# Waypoint Flow

## Overview

Waypoint flow means you commit automatically after the configured `Waypoint Gate` passes.

## `$waypoint-flow setup`

When invoked as `$waypoint-flow setup`, read [references/setup.md](references/setup.md) and follow it exactly.

## Runtime Rule

- Read the exact command or exact ordered command list under `Waypoint Gate:` in `AGENTS.md`.
- Keep working normally until that exact `Waypoint Gate` passes.
- Once that `Waypoint Gate` passes, commit only your own intended changes immediately.
- Do not wait for manual approval.

## Waypoint Commit

Produce high-signal commits that are easy to review and easy to understand later.
Prioritize clarity and rationale quality over matching historical wording patterns.

## Commit Message Quality Bar

Every non-merge commit message must answer "why" either:
- explicitly: direct rationale language (`because`, `so that`, `to`, `in order to`, `to avoid`, `to prevent`)
- implicitly: clear intent and effect that make the rationale obvious from the bullet itself

When in doubt, make the why explicit.

## Workflow
1. Review the current diff
- Read staged, unstaged, and untracked (new file) changes.
- Note that you might not be the only one making changes, always be cautious.
- Read any untracked/new files and confirm they’re intentional before deciding scope.
- Do not label a file “unrelated” until you’ve reviewed its diff or content.
- Never commit unexpected changes you did not make.

2. Inspect commit style
- Read recent commits to understand conventions that matter for tooling and history.
- Keep conventions that improve readability; do not copy weak patterns.
- If local style conflicts with the quality bar, follow the quality bar.

3. Validate staging
- Stage only the intended files or hunks.
- Verify the staged diff before committing.
- Keep unrelated edits unstaged.

4. Compose the message
- Subject: imperative, concise, no trailing period.
- Body: blank line, then `-` bullets.
- Each bullet starts with a verb and is a single sentence.
- At least one bullet must communicate rationale, explicitly or implicitly.
- Use 1-5 bullets based on the size and complexity of the change.
- Cover the important parts of the change instead of forcing a fixed bullet count.
- Keep lines reasonably short.

5. Commit safely
- Prefer a heredoc with `-F -` to avoid escaped `\n`:

```bash
git commit -F - <<'EOF'
Subject in imperative mood

- Bullet one
- Bullet two
EOF
```

6. Why-check before commit
- Ask: "Could a reviewer answer why this change exists from this message alone?"
- If no, rewrite the body before committing.

7. Post-commit sanity check
- After committing, run `git status -sb` to confirm expected remaining changes before proceeding.

## Quick Template

```text
<Subject>

- <Key point 1>
- <Key point 2>
...
```

## Good vs Weak Bodies

Good:
- Replace wrapper test targets with direct `ios test` usage to match current workflow.
- Keep SwiftLint analyzer `xcodebuild` step because compiler logs are still required.

Weak:
- Update tests.
- Clean up code.

## Guardrails

- Never commit unexpected changes you did not make.
- Never commit changes outside the verified change set.

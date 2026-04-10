---
name: git-commit
description: Only invoked by the user. Use this skill to learn the commit style guide, but the commit process should be invoked by user directly using $git-commit.
disable-model-invocation: true
---

# Git Commit

## Overview

Produce high-signal commits that are easy to review and easy to understand later.
Prioritize clarity and rationale quality over matching historical wording patterns.
When the user says `$git-commit chunks`, propose multiple commit chunks grouped by coherent areas of code instead of a single commit.

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

3. Choose proposal mode
- Default mode: prepare a single-commit proposal.
- `$git-commit chunks` mode: prepare a multi-commit chunk proposal.

4. Prepare the proposal
- Use this skill for one commit at a time.
- You MUST ALWAYS present the proposal and ask for approval before committing.
- Exception: if the user invokes this skill and says `ok` in the same message, treat that as pre-approval for the proposal.
- In `$git-commit chunks` mode, group changes by coherent code areas or behaviors.
- Chunks must never rely on hunks.
- If a clean split would require hunk staging, collapse the work into fewer chunks that stage whole files only.
- Use the matching template:

<single_commit_example>
## Single commit:

<Title>
- <Bullet 1>
- <Bullet 2>

Files:
- <path>
- <path>
</single_commit_example>

<chunk_commit_example>
## Commit chunks:

### Chunk 1: <Title>
- <Bullet 1>
- <Bullet 2>

Files:
- <path>
- <path>

### Chunk 2: <Title>
- <Bullet 1>
- <Bullet 2>

Files:
- <path>
- <path>
</chunk_commit_example>

5. Validate staging after approval
- After the user approves the plan, stage only the intended files.
- Verify the staged diff before committing.
- Keep unrelated edits unstaged.
- In `$git-commit chunks` mode, stage and commit one approved chunk at a time.

6. Compose the message
- Subject: imperative, concise, no trailing period.
- Body: blank line, then `-` bullets.
- Each bullet starts with a verb and is a single sentence.
- At least one bullet must communicate rationale, explicitly or implicitly.
- Use 1-5 bullets based on the size and complexity of the change.
- Cover the important parts of the change instead of forcing a fixed bullet count.
- Keep lines reasonably short.

7. Commit safely
- Prefer a heredoc with `-F -` to avoid escaped `\n`:

```bash
git commit -F - <<'EOF'
Subject in imperative mood

- Bullet one
- Bullet two
EOF
```

8. Why-check before commit
- Ask: "Could a reviewer answer why this change exists from this message alone?"
- If no, rewrite the body before committing.

9. Amend only when asked
- If the user asks to fix an existing commit message, use `git commit --amend -F - <<'EOF' ... EOF`.
- Otherwise, do not amend.

10. Post-commit sanity check
- After committing, run `git status -sb` to confirm expected remaining changes before proceeding.
- In `$git-commit chunks` mode, repeat the staging, verification, commit, and sanity check flow for each approved chunk.

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

## Notes

- Favor clarity over cleverness; optimize for future readability.
- If automated tools touched many files, validate that those changes are actually present in the diff and propose a separate commit or explicitly confirm the user wants them included.
- In `$git-commit chunks` mode, optimize for reviewable groups of code, not maximum commit count.
- Never propose hunk-based chunking.
- If commit examples include a prefix or scope, use it consistently.
- If the repo uses single-line subjects only, omit the body.
- Never offer to push commits. Only discuss or run push operations when the user explicitly asks to push.

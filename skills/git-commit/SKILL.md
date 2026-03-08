---
name: git-commit
description: Create or amend high-signal git commits with clear rationale. Use when the user asks to commit, fix a commit message, or says to “match commit quality.”
---

# Git Commit

## Overview

Produce high-signal commits that are easy to review and easy to understand later.
Prioritize clarity and rationale quality over matching historical wording patterns.

## Commit Message Quality Bar

Every non-merge commit message must answer "why" either:
- explicitly: direct rationale language (`because`, `so that`, `to`, `in order to`, `to avoid`, `to prevent`)
- implicitly: clear intent/effect that makes rationale obvious from the bullet itself

When in doubt, make the why explicit.

## Workflow
1. Review the current diff
- Read staged, unstaged, and untracked (new file) changes
- Note that you might not be the only one making changes, always be cautious!
- Read any untracked/new files and confirm they’re intentional (not generated artifacts) before deciding scope.
- Do not label a file “unrelated” until you’ve reviewed its diff/content.

2. Inspect commit style
- Read recent commits to understand conventions that matter for tooling/history.
- Keep conventions that improve readability; do not copy weak patterns.
- If local style conflicts with the quality bar, follow the quality bar.

3. Decide single vs chunked commits
- Make the decision first using the split heuristics below.
- Group commits by implemented feature/intent, not by file type.
- Never split only because files are Markdown/docs/config versus code.
- Prefer the smallest logical groups where every commit is rollback-stable on its own.
- This decision should precede any proposal formatting.
- If a file would belong to multiple commits, either plan hunk-staging or regroup so each file is only in one commit; confirm the user’s preference.

4. Preflight commit proposal (present your decision)
- You MUST ALWAYS present a commit plan and ask for approval.
- Exception: if the user invokes this skill and says `ok` in the same message, treat that as pre-approval for the commit.
- The commit plan must use only one of the two templates below based on your decision.
- Do not use any other "uncertainty" template.

<single_commit_example>
## Single commit:

<Title>
- <Bullet 1>
- <Bullet 2>

Files:
- <path>
- <path>
</single_commit_example>

<commit_in_chunks_example>
## Commit in chunks:

Commit 1:
    <Title>
    - <Bullet 1>
    - <Bullet 2>

    Files:
    - <path>
    - <path>

---

Commit 2:
    <Title>
    - <Bullet 1>

    Files:
    - <path>

</commit_in_chunks_example>

- Present this preflight proposal immediately after the decision.
- Simple split heuristics:
  - `+` in a proposed commit title → split
  - Two nouns or two verbs in a title → split
  - Different features/intents → split
  - Different rollback-stability boundaries → split
  - Different user requests → split
  - Standalone docs-only intent (not tied to implemented feature) → split
  - Checklist/status Markdown that only reflects implemented feature state → keep with that feature commit
  - Single file spans multiple concerns → either hunk-stage or regroup by file to avoid hunks.

5. Validate staging (per commit, after approval)
- After the user approves the plan, stage commit 1 and verify the staged diff; repeat for each commit.

6. Compose the message
- Subject: imperative, concise, no trailing period.
- Body: blank line, then `-` bullets. Each bullet starts with a verb and is a single sentence.
- At least one bullet must communicate rationale (explicit or implicit).
- If rationale is non-obvious, make it explicit.
- Keep lines reasonably short (wrap ~72–80 cols if needed).

7. Commit safely (avoid literal `\n`)
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

## Quick template

```
<Subject>

- <Primary change>
- <Rationale/impact>
- <Verification or guardrail>
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
- If automated tools touched many files, validate those changes are actually present in the diff and propose a separate “format/lint only” commit (or explicitly confirm the user wants them included).
- If commit examples include a prefix or scope, use it consistently.
- If the repo uses single-line subjects only, omit the body.
- Never offer to push commits. Only discuss or run push operations when the user explicitly asks to push.

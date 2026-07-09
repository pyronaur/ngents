---
name: git-commit
description: Only invoked by the user. Use this skill to learn the commit style guide, but the commit process should be invoked by user directly using $git-commit.
disable-model-invocation: true
---

# Git Commit

## Overview

You write the commit message for work you just completed.
The diff records what changed; your message records what the diff cannot show.
The reader always has both.
When the user says `$git-commit chunks`, propose multiple commit chunks grouped by coherent areas of code instead of a single commit.

## Message Goal

A commit message records what was learned while doing the work.
Every sentence gives the reader a fact they could not reconstruct from the diff alone.

## Success Criteria

The body covers whichever of these have an answer from this work, in priority order:
1. the learning: anything believed at the start that turned out to be wrong, what was learned instead, and what proved it
2. the observation or requirement that started the work and its mechanism, naming the code path involved
3. any approach that did not survive: what it was, why it was insufficient, and in one clause how that shaped the final change
4. any external contract or constraint that had to be read for the change to be correct
5. the reason behind a decision a reviewer would question, favoring reasons nothing else records (no test, no comment)

When trimming, cut from the bottom of this list, never the top.
A test change earns a sentence only when it is itself a learning.
A criterion with no answer contributes nothing. A change with no such facts gets a title only.

## Writing Constraints

- State findings as past events (what was observed, what failed), never as timeless rules; "results must be discarded" hides how it was learned.
- Every "because" must be a reason you observed, read, or decided during this work. If you are inferring a reason in hindsight, verify it in the code or docs before writing it. If you cannot verify it, state the fact without the reason.
- No self-narration ("first I", "then I"). Facts about the code and the problem, not a story about the author.
- Short sentences, active voice, no em dashes.
- Length follows the fact count. A commit message is a text field with no size limit.

## Output Shape

Title: imperative, states the outcome, short, no trailing period.
Body: blank line after the title, then plain paragraphs, one fact per paragraph. No labels, headers, or bullet lists.

## Workflow

1. Review the current diff
- Read staged, unstaged, and untracked (new file) changes.
- Note that you might not be the only one making changes, always be cautious.
- Read any untracked/new files and confirm they’re intentional before deciding scope.
- Do not label a file “unrelated” until you’ve reviewed its diff or content.
- Never commit unexpected changes you did not make.

2. Choose proposal mode
- Default mode: prepare a single-commit proposal.
- `$git-commit chunks` mode: prepare a multi-commit chunk proposal.

3. Prepare the proposal
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

<Body paragraphs>

Files:
- <path>
- <path>
</single_commit_example>

<chunk_commit_example>
## Commit chunks:

### Chunk 1: <Title>

<Body paragraphs>

Files:
- <path>
- <path>

### Chunk 2: <Title>

<Body paragraphs>

Files:
- <path>
- <path>
</chunk_commit_example>

4. Validate staging after approval
- After the user approves the plan, stage only the intended files.
- Verify the staged diff before committing.
- Keep unrelated edits unstaged.
- In `$git-commit chunks` mode, stage and commit one approved chunk at a time.

5. Compose the message
- Follow Message Goal, Success Criteria, Writing Constraints, and Output Shape above.

6. Final check before proposing
- For each sentence: could the reader derive it from the diff alone? If yes, delete it.
- For each success criterion that had an answer: is it in the body? If not, add it.
- For each stated reason: can you point to where you learned it? If not, cut the reason and keep the fact.

7. Commit safely
- Prefer a heredoc with `-F -` to avoid escaped `\n`:

```bash
git commit -F - <<'EOF'
Subject in imperative mood

First body paragraph.

Second body paragraph.
EOF
```

8. Amend only when asked
- If the user asks to fix an existing commit message, use `git commit --amend -F - <<'EOF' ... EOF`.
- Otherwise, do not amend.

9. Post-commit sanity check
- After committing, run `git status -sb` to confirm expected remaining changes before proceeding.
- In `$git-commit chunks` mode, repeat the staging, verification, commit, and sanity check flow for each approved chunk.

## Notes

- If automated tools touched many files, validate that those changes are actually present in the diff and propose a separate commit or explicitly confirm the user wants them included.
- In `$git-commit chunks` mode, optimize for reviewable groups of code, not maximum commit count.
- Never propose hunk-based chunking.
- Never offer to push commits. Only discuss or run push operations when the user explicitly asks to push.

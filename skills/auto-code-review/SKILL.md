---
name: auto-code-review
description: Run Codex code review after substantial code changes. Use after making more than 50 lines of code changes, changes spanning 5 or more code files, or any risky shared-behavior refactor; captures the full `codex review` transcript while showing only the actionable review block.
---

# Auto Code Review

Run from the repo root after the implementation and local validation pass.

Use the helper:

```sh
bun ~/.ngents/skills/auto-code-review/scripts/codex-review.ts
```

It runs `codex review --uncommitted` with no timeout, writes the full transcript to `.tmp/work/$PI_WORKS_SLUG/review/rNNN.md`, and prints only the extracted final review. If `PI_WORKS_SLUG` is unavailable, it falls back to the repo basename.

For non-default review targets:

```sh
bun ~/.ngents/skills/auto-code-review/scripts/codex-review.ts --base main
bun ~/.ngents/skills/auto-code-review/scripts/codex-review.ts --commit <sha>
```

Override the review workspace only when needed with `--workspace <slug>` or `--workspace-dir .tmp/work/<slug>`.

## Review Loop

1. Read the printed review block first.
2. Inspect the transcript only when extraction failed or the finding needs context.
3. Fix concrete findings.
4. Re-run project validation.
5. Re-run this skill until Codex reports no actionable regressions.
6. Report the transcript path and findings summary; do not paste the full transcript into chat.

## Current Codex CLI Reality

`codex review` does not support `--json`, `-o`, or `--output-last-message`; those are `codex exec` features and currently error on `review`.

Fallback without the helper:

```sh
review_slug="${PI_WORKS_SLUG:-$(basename "$PWD")}"
mkdir -p ".tmp/work/$review_slug/review"
codex review --uncommitted > ".tmp/work/$review_slug/review/rNNN.md" 2>&1
bun ~/.ngents/skills/auto-code-review/scripts/codex-review.ts --extract-file ".tmp/work/$review_slug/review/rNNN.md"
```

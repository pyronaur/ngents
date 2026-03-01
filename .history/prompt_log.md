# Prompt Log

This file is a running record of prompt and instruction changes.
Its purpose is to preserve context and avoid repeating debates.
Each entry records:
- the issue being solved
- what changed
- why each addition or subtraction was expected to help

Update this file when behavior rules change in:
- `SYSTEM_PROMPT.md`
- `AGENTS.md`

Prompt log rules:
- Keep exactly one entry per commit.
- If prompt edits iterate before commit, update the current/latest entry instead of adding new entries.
- Keep past entries unchanged.
- Keep this file format (`Issue`, `Change`, `Theory`).
- Do not add entries for prompt-log-only edits.

## Entry Template

### YYYY-MM-DD — Short title
- Issue:
- Change:
- Theory:

## 2026-03-01 — Consolidate collaboration and writing rules

- Issue:
  - Collaboration and writing guidance was split across multiple sections and files, with overlapping intent.
  - Prompt log structure still included extra fields and lacked clear update discipline.

- Change:
  - Replaced `Intent, Conflict, and Language Rules` in `SYSTEM_PROMPT.md` with a focused `How you collaborate` section.
  - Added a dedicated `Writing style` subsection under personality guidance in `SYSTEM_PROMPT.md`.
  - Removed duplicated style-specific rules from `AGENTS.md` to reduce overlap with higher-priority prompts.
  - Updated `.history/prompt_log.md` operating rules to enforce one entry per commit and removed `Result/Notes` from template/history.

- Theory:
  - Keep style rules in one place so tone stays pragmatic.
  - Use plain words and short sentences so responses are easier to read.

## 2026-02-28 — Reduce drift in action, assumptions, and writing style

- Issue:
  - The agent drifted by acting too early, guessing through conflicts, and using dense phrasing.
  - Scope lock wording was too broad and easy to misread.

- Change:
  - Added `Intent, Conflict, and Language Rules` section in `SYSTEM_PROMPT.md`.
  - Added rule: question/discussion turns are answer-first, with no commands/edits unless explicitly requested.
  - Changed uncertainty behavior from “pick a sensible default” to “ask one short clarifying question” when multiple plausible interpretations exist.
  - Added writing rules in `SYSTEM_PROMPT.md`:
    - Say the point first, in plain words.
    - Cut filler, qualifiers, and repeat phrases.
    - Use concrete words and specific details.
    - Prefer strong active verbs over abstract nouns.
    - Keep one idea per paragraph.
    - Avoid jargon unless it is truly needed.
  - Rewrote `Scope lock` in `AGENTS.md` to separate question/discussion turns from action turns and to define extra side effects explicitly.
  - Tightened conflict handling in `AGENTS.md` to “stop and ask; do not guess.”

- Theory:
  - High-priority rules in `SYSTEM_PROMPT.md` reduce conflict with lower-priority docs and make behavior more stable.
  - An explicit “question/discussion = answer-only” rule reduces accidental side effects.
  - Replacing “sensible default” with “ask one short clarifying question” reduces wrong-path execution.
  - Concrete writing rules reduce jargon drift and improve readability under time pressure.
  - A clearer scope lock line removes ambiguity about when to act versus when to ask.

## 2026-02-28 — Remove scope lock from AGENTS

- Issue:
  - Scope lock in `AGENTS.md` was too restrictive and added friction on normal question turns.

- Change:
  - Removed the `Scope lock` line from `AGENTS.md`.

- Theory:
  - Keeping this rule only in higher-priority prompt layers avoids duplicate policy and reduces overcorrection from local guardrails.

## 2026-02-28 — Reduce citation-heavy formatting in normal answers

- Issue:
  - Responses overused inline file references, which made simple explanations noisy.

- Change:
  - Added a writing rule in `SYSTEM_PROMPT.md`: use file references only when requested or when claims are high-risk, disputed, or hard to verify.

- Theory:
  - This keeps routine answers readable while preserving evidence for cases that actually need proof.

## 2026-02-28 — Prefer nested lists over long lines

- Issue:
  - Some responses packed too many ideas into one sentence, which made them harder to scan.

- Change:
  - Added an `AGENTS.md` writing-shape rule: use nested, indented bullet lists for multi-part points, prefer short lines, and avoid semicolons.

- Theory:
  - Breaking complex ideas into list levels improves readability and reduces run-on phrasing.

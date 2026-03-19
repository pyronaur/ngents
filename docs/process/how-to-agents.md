---
title: How To Edit AGENTS.md
short: "Use when updating AGENTS.md"
summary: "Rules for writing AGENTS.md files"
read_when:
  - Need to create AGENTS.md
  - Need to update AGENTS.md
---

# How To Write AGENTS.md

## Global AGENTS.md

Loaded every session, across every project and stack.
A rule belongs here only if it applies correctly in ≥80% of sessions across any project, any stack, any context.
If it would be wrong or irrelevant outside a specific project, it does not belong here.

## Project AGENTS.md

Loaded only when working inside that project.
A rule belongs here if it applies correctly in ≥80% of work done inside this project.
Specificity is not a disqualifier — irrelevance is.
May contain both specific and abstract rules, as long as both pass the local threshold.
Situational or task-specific guidance that doesn't reach 80% belongs in a task document, not here.

## Both Files

Never restate in a local file what the global file already covers.
A local rule that narrows a global default needs no ceremony.
A local rule that contradicts a global rule must include an explicit override marker so the conflict reads as intentional.

## Abstraction

Every rule is a generalization. When you observe something specific — a mistake, a pattern, a decision — ask what principle it illustrates, then write that principle.

The test: if the specific instance that prompted the rule were renamed, replaced, or removed, would the rule still be correct and useful? If not, abstract further until it passes.

## Semantic Boundaries

Identify the consumer for each layer before writing.
Filename and path are discovery triggers; headings, summaries, and body content are payload for readers.
Do not preserve user phrasing when it mixes layers.
Re-derive the rule from the consumer's job and write only the positive contract that belongs in that layer.
Avoid contrastive wording such as "not X" when the layer should simply state what it is for.
Avoid self-description when the filename, path, or surrounding system already carries that information.

## Structure

- H1: required document title naming the project, system, or workspace this AGENTS file governs
- H2: primary sections
- H3/H4: subsections and named blocks
- Never use bold as a heading substitute

## Section Order

Policy/meta → operational workflow → code and style rules.
Do not mix workflow rules with code-style rules in the same section.

## Section Naming

1–3 words, title case, no parenthetical qualifiers.

Bad: `# Tool Usage (Required)`
Good: `## CLI Tools`

## Formatting

- List items: plain `- Key: value`; no `**bold**` wrappers; backtick code spans are fine
- Policy mandates: inline `Required: ...` label, not a heading
- CLI commands: inline backtick spans; fenced blocks only for multi-step sequences that require it
- Flat registries: `- Key: value` only, no sub-grouping or bold

## Bullet Conciseness

Each bullet is a single `Key: value` pair or a single-sentence rule.
Multiple distinct cases → sub-bullets, not run-on sentences.
No multi-sentence prose inside a single bullet.

## Redundancy

One canonical home per rule. If two sections say the same thing, delete one.
Catch-all sections that restate structured sections above them should be removed and their items folded into the correct topical section.
In a project file, redundancy with the global file is a bug, not a reminder.

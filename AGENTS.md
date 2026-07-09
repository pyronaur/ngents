# AGENTS.md

## Notation Legend
- `!foo -h`: means execute in bash: `foo -h`
- `$foobar`: means "foobar" skill

## Rules
- Always read docs first: `!docs` docs index
	- Deepen: List relevant topics to see if guidance is available
	- Deepen: Read relevant docs to your current task
- Read: Inspect silently. Do not print, quote, summarize, or paste file contents.
- Output: Show absolute paths. No inline `file:line` refs unless asked.
- Guardrails: `!trash` to delete
- References: In tracked docs, record durable references, not resolved local paths. Use `$skill` for skills, `!docs ...` for docs, repo names/URLs for source references, and repo-relative paths for files. Put machine-local paths only in explicitly machine-local private docs.
- Posture: When mistaken, correct the output directly. If the mistake caused confusion or wasted work, acknowledge it briefly and move on.
- Corrections: Treat my corrections as edits, not as new rules. Make the one change, in one place. Don't duplicate it, negate it, or restate it. A fact that must persist gets written once and never repeated.
- No Backward Compatibility: Unless explicitly asked - do not version fields, migrations, backward compatibility.

## Communication
- I am an experienced software engineer. Answer at that level.
- Lead with the conclusion.
- Include the evidence needed to support it, any material caveat, and the next action.
- Keep all required facts, decisions, caveats, and next steps. Trim introductions, repetition, generic reassurance, and optional background first.
- Do not answer questions I did not ask.
- Ask only when missing information materially affects correctness, permissions, or scope; otherwise state the smallest reasonable assumption.
- Use lists when the content is list-shaped: enumerating distinct items, steps, options, categories, comparisons, ideas.
- Use nested lists to:
	- Group related ideas
	- Write shorter sentences with more clarity
	- Improve clarity and scannability

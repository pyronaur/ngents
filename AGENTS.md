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
- Keep your responses concise!
- Questions: **Do not answer questions I did not ask!**
	- Answer only the the question I asked and make it direct
	- If you are unsure, ask for clarification.

## Communication rule nr.1
<most_important_rule>

Keep your responses concise!
I am an experienced software engineer. Answer directly without providing extra context.
Default to the shortest reply that answers the request; DO NOT add extra explanation, structure, examples, caveats, or summaries.
**Keep It Short**
- Drop: intro (exactly right, not quite, maybe); filler (just/really/basically/actually/simply); pleasantries (sure/certainly/of course/happy to)

**Answer Scope**
- Keep answer tight: answer the question asked head on and stop:
	- "What is X?" → definition. Stop.
	- "How does X work?" → mechanism. Stop.
	- "Why X?" → reason. Stop.
	- 
**Example**
<example>

No:
> Sure! I'd be happy to help you with that.
> Direct answer: ...
> The issue you're experiencing is likely caused by...
> [...]
> In summary, ...

Yes:
> Auth middleware bug: Token expiry check uses < not <=.\n## Fix: ...:


</example>

</most_important_rule>

##  Output
- First: Direct answer
	- Then: Stop, unless I ask for more information about the answer
- Use lists when the content is list-shaped: enumerating distinct items, steps, options, categories, comparisons, ideas.
- Use nested lists to:
	- Group related ideas
	- Write shorter sentences with more clarity
	- Improve clarity and scannability

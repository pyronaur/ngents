# AGENTS.md
- Use `!trash` for deletion.
- In tracked docs, record durable references: `$skill`, `!docs ...`, source repos or URLs, and repo-relative file paths. Reserve machine-local paths for explicitly machine-local private docs.
- Do not add versioned fields, migrations, or backward compatibility unless requested.

## Docs
- Start with `!docs`; scan relevant topics and read their docs before source or external research.
- Read files silently. Do not print, quote, summarize, or paste their contents.
- Notation in AGENTS.md files, `docs/*` and skills:
	- `!foo -h`: execute `foo -h` in bash.
	- `$foobar`: use the `foobar` skill.

## Autonomy
- Ask before external writes, destructive actions, scope expansion.

## Communication
- Write for an experienced software engineer and stay within the request.
- Lead with the conclusion.
- Show all required facts, decisions, caveats, and next steps.
- Trim introductions, repetition, generic reassurance, and optional background first.
- Be direct and tactful. Acknowledge friction when relevant; omit canned reassurance and unnecessary sign-offs.
- Use lists when the content is list-shaped; nest only to clarify grouping.

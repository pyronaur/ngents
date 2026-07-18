# AGENTS.md
- Use `!trash` for deletion.
- In tracked docs, record durable references: `$skill`, `!docs ...`, source repos or URLs, and repo-relative file paths. Reserve machine-local paths for explicitly machine-local private docs.
- Do not add versioned fields, migrations, or backward compatibility unless requested.
- `@name[/path]`: resolves to `./name[/path]`;

## Docs
- New task/missing context: Use `!docs`; scan relevant topics and read their docs before source or external research.
- Read files silently. Do not print, quote, summarize, or paste their contents.
- Notation in AGENTS.md files, `docs/*` and skills:
	- `!foo -h`: execute `foo -h` in bash.
	- `$foobar`: use the `foobar` skill.

## Autonomy
- Do not expand scope without permission

## Communication
- Write for an experienced software engineer and stay within the request.
- Lead with the conclusion.
- Show all required facts, decisions, caveats, and next steps.
- Trim introductions, repetition, generic reassurance, and optional background first.
- Be direct and tactful. Acknowledge friction when relevant; omit canned reassurance and unnecessary sign-offs.
- Use lists when the content is list-shaped; nest only to clarify grouping.


## Rule: Planned Scope
If I have agreed to implementation, implement what is asked.
If you have an idea of an improvement, different implementation, alternative approach STOP. Implement first what was requested. Supply your ideas as proposals later.
You are not allowed to change direction without user guidance or explicit consent.
Before you begin each session, your first thought is: Did the user consent to this objective? If not, STOP.

## Workflow
After 100+ loc code changes, show total loc added/removed/net, grouped by:
- tests
- docs
- source code

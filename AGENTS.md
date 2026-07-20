# AGENTS.md
- Use `!trash` for deletion.
- In tracked docs, record durable references: `$skill`, `!docs ...`, source repos or URLs, and repo-relative file paths. Reserve machine-local paths for explicitly machine-local private docs.
- Do not add versioned fields, migrations, or backward compatibility unless requested.
- `@name[/path]`: resolves to `./name[/path]`;

## Docs
- Notation in AGENTS.md files, `docs/*` and skills:
	- `!foo -h`: execute `foo -h` in bash.
	- `$foobar`: use the `foobar` skill.

## Rule: Planned Scope
If I have agreed to implementation, implement what is asked.
If you have an idea of an improvement, different implementation, alternative approach STOP. Implement first what was requested. Supply your ideas as proposals later.
You are not allowed to change direction without user guidance or explicit consent.
Before you begin each session, your first thought is: Did the user consent to this objective? If not, STOP.

## Workflow
After 100+ loc code changes, show total loc added/removed/net, grouped by:
- tests
- plain text (docs, markdown files)
- source code

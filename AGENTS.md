# AGENTS.md
- Onboard: `x sitrep [-C <repo>]` to get repo overview: tree, git status, changes, history. 
- Use `!trash` for deletion.
- In tracked docs, record durable references: `$skill`, `!docs ...`, source repos or URLs, and repo-relative file paths. Reserve machine-local paths for explicitly machine-local private docs.
- Do not add versioned fields, migrations, or backward compatibility unless requested.
- `@name[/path]`: resolves to `./name[/path]`;

## Docs
When I provide ##documentation index, proactively read relevant files.
When documentation is #injected directly:
	- Re-read if it's a reminder and you need to refresh your memory
	- If it's injected in full, take the documentation provided as context
- Notation in AGENTS.md, documentation, and skills:
	- `!foo -h`: execute `foo -h` in bash.
	- `$foobar`: use the `foobar` skill.

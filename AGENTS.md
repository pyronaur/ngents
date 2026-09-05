# AGENTS.md
`x sitrep [-C <path(default $PWD)>]` to get basic directional understanding of the repo (tree, git status, recent history)
Instead of `rm` use `trash` for deletion.
If I point you to information and expect you to read it, read it before you do anything else.

## Docs
When I provide `##documentation` index, proactively read relevant files.
When documentation is `#injected` directly:
- Re-read if it's a reminder and you need to refresh your memory
- If it's injected in full, take the documentation provided as context

Referencing documentation in files:
- For documentation: !`docs ...`
- For skills: `$skill`
- Use repository relative file paths when available
- User home paths should start with `~/`

## Communication
Please speak plainly without jargon, mimic my word choice and sentence structure.
I don't want to read large clumps of text, Pi supports Mermaid charts, you can show diagrams instead.

## Code
Avoid unnecessary complexity, for example we don't need versioned fields, migrations, backward compability (unless I explicitly ask).

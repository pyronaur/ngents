---
summary: "Practical authoring guide for new `ngents` bunmagic scripts in this repo"
read_when:
  - Creating a new script under `~/.ngents/scripts`.
  - Need ngents-specific conventions for strict mode, args, and verification.
---

# ngents Script Authoring

This guide is specific to `ngents` scripts in `~/.ngents/scripts`.
For core concepts, see `docs/bunmagic/bunmagic-101.md`.

## Command Routing Rules

- Top-level files in `~/.ngents/scripts` map to `ngents <slugified-name>`
- Nested script paths are not discovered as commands
- Files starting with `_` and `.d.ts` files are ignored

## Command Management Policy

- Do not run `bunmagic link` from agent workflow unless user explicitly asks.
- Do not run `bunmagic create`; create/edit script files directly in this repo.

## Strict-Mode Behavior

`ngents` workflows should assume strict behavior.

- Unknown commands should fail fast
- Do not rely on interactive auto-create flows for normal execution
- Prefer explicit validation and explicit usage errors in script code

## Minimal Script Template

```ts
/**
 * Short description of the command
 * @autohelp
 * @usage ngents my-command <input> [--dry]
 * @flag --dry Preview behavior without writes
 */
export default async function () {
  const [input] = args
  if (!input) {
    throw new Exit("Usage: ngents my-command <input> [--dry]")
  }

  if (flags.dry) {
    console.log(`Dry run: ${input}`)
    return
  }

  console.log(`Run: ${input}`)
}
```

## Args and Help Conventions

- Bunmagic prepares command input before script logic runs
- Inside the script, `args[0]` is the first CLI argument passed to that command
- Keep side effects inside `export default async function () { ... }`
- Use `@autohelp` + `@usage` + `@flag` for consistent help UX

## Reload and Bins

- See `docs/bunmagic/command-mapping.md` for bin wiring and when `bunmagic reload` is actually needed.

## Non-Interactive Safety

When prompts are used, guard for non-TTY environments:

```ts
if (!process.stdin.isTTY) {
  throw new Exit("Interactive prompt requires a TTY")
}

const answer = await ask("Continue?", "yes")
console.log(answer)
```

## Pre-Handoff Checklist

1. Confirm command name resolves from script file name and path.
2. Confirm `--help` output is meaningful and complete.
3. Confirm missing required args produce clear usage errors.
4. Confirm non-interactive paths do not hang on prompts.
5. Confirm filesystem writes are explicit and intentional.

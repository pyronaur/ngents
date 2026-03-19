# ngent-docs

Standalone Node/NPM package for the `docs` CLI.

User-facing `docs` CLI documentation lives in `docs/ngents-docs.md`.

## Install

```bash
npm install
npm link
```

## Package Layout

Package root: `scripts/ngent-docs`

CLI entrypoint: `bin/docs.ts`

Root help copy and Liquid template logic live in `templates/root-help.md`.

## Development Commands

```bash
npm test
make lint-dry
make lint
make verify
```

## Source Layout

- `bin/docs.ts` process entrypoint
- `src/core/command-dispatch.ts` Commander bootstrap and top-level CLI dispatch
- `src/core/command-definition.ts` command definition and registration contract
- `src/commands/` command modules for `ls`, `park`, `topic`, `query`, and `update`
- `src/runtime/browse*.ts` docs/topic discovery, parsing, and rendering
- `src/runtime/help.ts` root help entrypoint
- `src/runtime/root-help-template.ts` Liquid root-help renderer
- `templates/root-help.md` editable root help template
- `docs/ngents-docs.md` product documentation: purpose, principles, usage, and behavior
- `tests/` CLI-facing and root-help coverage

## Command Contract

Each command definition uses:

- `path` as `readonly [string, ...string[]]`
- `description`
- `configure(command)` for Commander options
- `optionsSchema` (Zod)
- `run({ projectDir, args, options })`

`run` receives positional `args` plus `options` typed from `optionsSchema`.

Validation behavior:

- Commander parses CLI args and options.
- Parsed options are validated through the command `optionsSchema`.
- Validation failures are treated as usage errors.
- Runtime command errors are treated as runtime errors.

## Exit Codes

- `0` success (`EXIT_SUCCESS`)
- `1` runtime error (`EXIT_RUNTIME_ERROR`)
- `2` usage error (`EXIT_USAGE_ERROR`)

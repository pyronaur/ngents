# ndex

Standalone Node/NPM command package for the `ndex` CLI.

## Install

```bash
npm install
npm link
```

## Commands

```bash
ndex
ndex --help
ndex ls [where]
ndex topic [topic] [section]
ndex query [--limit <n>] <query...>
ndex query status
```

Examples:

```bash
ndex
ndex --help
ndex ls
ndex ls .
ndex ls global
ndex ls docs/architecture
ndex topic
ndex topic qmd
ndex topic qmd references
ndex query shell environment policy
ndex query --limit 3 swiftui scroll view best practices
ndex query status
```

## Metadata

Use `short` in frontmatter for compact ndex output. Use `summary` for fuller expanded browse text.

## Development Commands

```bash
npm test
make lint-dry
make lint
make verify
```

## API Docs

- `docs/api-reference.md`

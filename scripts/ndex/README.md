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
ndex ls [topic] [section] [--expand] [--global]
ndex query [--limit <n>] <query...>
ndex query status
```

Examples:

```bash
ndex
ndex ls
ndex ls --global
ndex ls ios --expand
ndex query shell environment policy
ndex query --limit 3 swiftui scroll view best practices
ndex query status
```

## Development Commands

```bash
npm test
make lint-dry
make lint
make verify
```

## API Docs

- `docs/api-reference.md`

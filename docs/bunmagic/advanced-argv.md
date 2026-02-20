---
summary: "Task-agnostic Bunmagic argv playground (args/flags first, raw argv fallback)"
read_when:
  - Need to inspect how Bunmagic parses args/flags/argv.
  - Need a safe demo for `--` passthrough and raw argv recovery.
---

# Argv Playground

Use this script to inspect Bunmagic parsing and compare:
- normal path: `args` + `flags`
- advanced path: raw `process.argv` parsing for `--` passthrough

Rule of thumb:
- Most scripts should use only `args` + `flags`.
- Use raw `process.argv` only for advanced passthrough patterns.

Script path:
- `~/.ngents/docs/bunmagic/examples/argv-playground.ts`

Run with `bunmagic exec`:

```bash
bunmagic exec ~/.ngents/docs/bunmagic/examples/argv-playground.ts alpha --verbose
```

```bash
bunmagic exec ~/.ngents/docs/bunmagic/examples/argv-playground.ts -- --literal '--name=value' tail
```

Optional shell interpolation demo:

```bash
bunmagic exec ~/.ngents/docs/bunmagic/examples/argv-playground.ts -- --demo '$(echo test)'
```

---
title: ng hig-doctor
summary: Local CLI wrapper for running HIG Doctor with repo-level excludes and exact concern ignores.
short: Wrapper usage, config, and examples for `ng hig-doctor`.
read_when:
  - Need to run the local `ng hig-doctor` wrapper instead of upstream `hig-doctor`.
  - Need `.higignore.yaml` examples for `excludedPaths` or `ignoredConcerns`.
  - Need to understand the wrapper's output and exit behavior in app repos.
---

# ng hig-doctor

Use `ng hig-doctor` from an app repo when you want HIG audit output filtered through repo-local wrapper rules.

The wrapper:

- runs the vendored HIG Doctor scanner and pattern detector from `docs topic app hig-doctor`,
- reads `.higignore.yaml` from the current working directory,
- skips configured paths before pattern detection,
- filters exact accepted concerns after detection,
- prints markdown concerns to `stdout`.

## Basic usage

Run from the repo root that owns `.higignore.yaml`:

```bash
ng hig-doctor
ng hig-doctor Sources
ng hig-doctor CountdownKit/Sources
```

Pass the directory you want scanned. Exclude rules and exact ignores are still resolved relative to the current working directory.

## `.higignore.yaml`

The wrapper supports two config sections:

```yaml
excludedPaths:
  - '**/Testing/**'
  - 'CountdownKit/Sources/CountdownKit/Fixtures/**'

ignoredConcerns:
  - file: CountdownKit/Sources/CountdownKit/Feature/ShippingView.swift
    pattern: ignoresSafeArea
    line: 42
    reason: Full-bleed content intentionally extends edge to edge.
```

### `excludedPaths`

Use `excludedPaths` for code that is outside product HIG review scope, such as:

- fixture generators,
- visual-regression helpers,
- testing-only UI support,
- other non-shipping UI scaffolding.

Rules:

- each entry is a non-empty glob string,
- paths are matched relative to the current working directory,
- excluded files are skipped before pattern detection,
- excluded files do not appear in concerns, positives, patterns, or ignored concern output.

### `ignoredConcerns`

Use `ignoredConcerns` only for exact accepted exceptions in shipping code.

Each entry must include:

- `file`
- `pattern`
- `line`
- `reason`

The wrapper matches all four fields exactly.

## Output

When visible concerns remain:

- markdown is written to `stdout`,
- concern count and relevant HIG skill hints are written to `stderr`,
- the command exits with code `1`.

When all concerns are filtered or nothing is found:

- ignored concerns can still be printed in markdown,
- the command exits with code `0`.

When config or wrapper setup is invalid:

- the command exits with code `2`.

## Common workflow

1. Run `ng hig-doctor <directory>`.
2. If output includes non-shipping fixture or support code, add a matching `excludedPaths` glob.
3. If a shipping concern is intentionally accepted, add an exact `ignoredConcerns` entry with a concrete reason.
4. Re-run the command and keep only product-relevant concerns visible.

## Help

Show the built-in command help:

```bash
ng hig-doctor --help
```

## Related docs

- Use `docs topic app hig-doctor` for the upstream Apple HIG skill set and reference material.
- Use `docs tools` for the shared command catalog entry.

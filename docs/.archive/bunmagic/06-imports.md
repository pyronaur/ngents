---
summary: "Import npm packages directly inside bunmagic scripts"
read_when:
  - Need third-party npm packages in a bunmagic script.
---

## Overview

Bunmagic scripts can import npm packages.

## Behavior

Script runner binaries installed by bunmagic use a Bun shebang with `--install=fallback`. This enables on-demand installation when an imported package is not already available.

The `bunmagic exec` command executes the target file in the current Bun process and does not enable `--install=fallback` by itself.

When `--install=fallback` installs packages, Bun may write files in the current working directory (for example `bun.lockb` and `node_modules/`).

## Reproducibility

On-demand installation can fetch newer versions over time. For reproducible runs, execute scripts from a project directory with explicit dependencies and a committed lockfile.

## Pinning And Lockfiles

- Use a `package.json` and commit the lockfile (`bun.lockb`) for deterministic installs.
- Prefer running scripts from a project directory where dependencies are already installed (`bun install`) instead of relying on fallback installs.

## Private Registries

When a script imports private packages, on-demand installation may require registry configuration and credentials. If the environment is not configured, the import fails as a command failure.

## Offline Behavior

When imports trigger `--install=fallback`, the first run may require network access. Without network access, Bun fails to install missing packages.

## Examples

```ts
import cowsay from "cowsay"
console.log(cowsay.say({ text: "Hello" }))

// Multiple packages
import { marked } from "marked"
import chalk from "chalk"

const html = marked("# Hello")
console.log(chalk.blue(html))
```

## Related

- Command reference: [Bunmagic Commands](/reference/00-bunmagic-commands/)

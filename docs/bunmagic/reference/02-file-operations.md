---
summary: "bunmagic file-system APIs: Bun file ops, paths, glob, SAF, and editor integration"
read_when:
  - Working with files or directories in bunmagic scripts.
  - Need safe write/rename behavior via SAF.
---

## Overview

This page describes filesystem-related globals available in bunmagic scripts, compatibility globals, and SAF deprecation status.

For the `files.*` API reference, see [Files API](/reference/filesystem/files-api/).

## Global Usage

In bunmagic scripts, filesystem helpers are global.

```ts
await files.ensureDir('./output')
await files.outputFile('./output/state.json', JSON.stringify({ ok: true }, null, 2))

if (await files.pathExists('./output/state.json')) {
  const state = JSON.parse(await files.readFile('./output/state.json')) as { ok?: boolean }
  console.log(state.ok)
}
```

For imported modules:

```ts
import * as files from 'bunmagic/files'
import { outputFile, pathExists } from 'bunmagic/files'
```

## Primary API (Recommended)

Use `files.*` for new code.

- Path/checks: `resolve`, `stem`, `pathExists`, `isFile`, `isDir`
- Directory: `ensureDir`, `ensureFile`, `emptyDir`
- Read/write: `readFile`, `readBytes`, `writeFile`, `outputFile`, `editFile`
- Movement: `copy`, `move`, `remove`, `glob`
- Collision-safe: `ensureUniquePath`, `writeFileSafe`, `copySafe`, `moveSafe`

Detailed reference: [Files API](/reference/filesystem/files-api/)

## Compatibility Globals

These exist in `1.4.x` for compatibility:

- `isDirectory()` -> forwards to `files.isDir()`
- `ensureDirectory()` -> calls `files.ensureDir()` and returns `true`
- `glob()`
- `resolveTilde()`

Prefer `files.*` in new examples.

## Path Helpers

### `$HOME`

User home directory path.

**Type:** `string`

### `resolveTilde()`
**Usage:** `resolveTilde(input: string): string`

Expands leading `~` in paths.

**Parameters:**
- `input` - Path string

**Returns:**
- Path with a leading `~` expanded to `$HOME`

**Examples:**
```ts
const p = resolveTilde("~/Projects")
console.log(p)
```

### `cd()`
**Usage:** `cd(path: string | SAF): void`

Changes the current working directory.

When `path` is a string, the value is passed through `resolveTilde(...)`. When `path` is a legacy `SAF` instance, bunmagic uses `path.path`.

**Parameters:**
- `path` - Target directory path (string) or legacy `SAF` instance

**Examples:**
```ts
cd("~")
cd("~/Projects/bunmagic")
```

### `cwd()`
**Usage:** `cwd(): Promise<string>`

Returns the current working directory path.

**Returns:**
- Promise resolving to the current working directory path

## JSON Pattern (Current API)

`files.*` does not include dedicated JSON helpers. Use explicit parse/stringify.

```ts
const p = './tmp/data.json'
const state = await files.pathExists(p)
  ? (JSON.parse(await files.readFile(p)) as Record<string, unknown>)
  : {}

state.updatedAt = new Date().toISOString()
await files.outputFile(p, `${JSON.stringify(state, null, 2)}\n`)
```

## Editor Integration

### `openEditor(path)`

Opens a file or directory in the configured editor.

```ts
await openEditor('~/Projects/my-script.ts')
```

## SAF (Legacy, Deprecated)

:::caution[Deprecated in 1.4.x]
`SAF` is deprecated and will be removed in `1.5.0`.

Use `files.*` for all new code.
:::

Migration guide: [/migrations/saf-to-files/](/migrations/saf-to-files/)

`SAF` remains available in `1.4.x` for compatibility and emits a one-time deprecation warning unless silenced with `BUNMAGIC_SILENCE_DEPRECATIONS=1`.

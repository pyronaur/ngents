---
summary: "Canonical files.* API for filesystem operations in bunmagic 1.4.x"
read_when:
  - "Updating or writing bunmagic filesystem examples."
  - "Need exact exported `bunmagic/files` functions/types/options."
---

## Overview

`files.*` provides filesystem helpers for Bunmagic scripts and for imported modules.

For filesystem globals, compatibility helpers, and SAF status, see [Filesystem Overview](/reference/filesystem/overview/).

In Bunmagic scripts, `files` is a global:

```ts
await files.outputFile('./tmp/run.json', JSON.stringify({ ok: true }, null, 2))
```

In imported modules:

```ts
import * as files from 'bunmagic/files'
// or
import { outputFile, pathExists } from 'bunmagic/files'
```

## Types

These types are part of the public `bunmagic/files` type surface.

- `PathLike = string`
- `BlobInput = Blob | NodeJS.TypedArray | ArrayBufferLike | string | Bun.BlobPart[] | BunFile` (`BunFile` is a Bun type)
- `SuffixOptions = { separator?: string; start?: number; maxAttempts?: number }`
- `MoveCopyOptions = { overwrite?: boolean; errorOnExist?: boolean }`
- `WriteTextOptions = { flag?: 'w' | 'wx'; atomic?: boolean }`
- `GlobScanOptions` (from Bun) is used by `glob()`

## Common Behaviors

- `PathLike` inputs must be non-empty strings. Empty or whitespace-only paths throw `TypeError`.
- Path arguments are resolved to absolute paths. `~` and `~/...` expand to the home directory.
- `pathExists()`/`isFile()`/`isDir()` return `false` for failed checks.

## Functions

### resolve()

**Usage:** `resolve(input: PathLike, ...rest: PathLike[]): string`

Resolves path-like inputs to an absolute path.

### stem()

**Usage:** `stem(input: PathLike): string`

Returns the basename without the last extension.

### pathExists()

**Usage:** `pathExists(path: PathLike): Promise<boolean>`

Resolves the path and returns `true` if it exists.

### isFile()

**Usage:** `isFile(path: PathLike): Promise<boolean>`

Resolves the path and returns `true` if it exists and is a file.

### isDir()

**Usage:** `isDir(path: PathLike): Promise<boolean>`

Resolves the path and returns `true` if it exists and is a directory.

### ensureDir()

**Usage:** `ensureDir(path: PathLike): Promise<string>`

Creates a directory (recursive) and returns the resolved path.

### ensureFile()

**Usage:** `ensureFile(path: PathLike): Promise<string>`

Creates an empty file if it does not exist. Parent directories are created as needed.

### emptyDir()

**Usage:** `emptyDir(path: PathLike): Promise<string>`

Creates a directory (recursive) and removes its contents.

### readFile()

**Usage:** `readFile(path: PathLike): Promise<string>`

Reads a file as UTF-8 text.

### readBytes()

**Usage:** `readBytes(path: PathLike): Promise<Uint8Array>`

Reads a file as raw bytes.

### writeFile()

**Usage:** `writeFile(path: PathLike, input: BlobInput, options?: WriteTextOptions): Promise<number>`

Writes content to a file.

**Defaults:**
- `flag: 'w'`
- `atomic: false`

**Options:**
- `flag: 'w'` overwrites the target if it exists
- `flag: 'wx'` fails if the target already exists
- `atomic: true` writes to a temporary file and renames into place

### outputFile()

**Usage:** `outputFile(path: PathLike, input: BlobInput, options?: WriteTextOptions): Promise<number>`

Ensures the parent directory exists, then writes content to a file.

### editFile()

**Usage:** `editFile(path: PathLike, updater: (content: string) => string | Promise<string>, options?: WriteTextOptions): Promise<string>`

Reads a file as text, passes the content to `updater`, and writes the returned string back to the file.

### copy()

**Usage:** `copy(source: PathLike, destination: PathLike, options?: MoveCopyOptions): Promise<string>`

Copies a file or directory and returns the resolved destination path.

**Defaults:**
- `overwrite: false`
- `errorOnExist: true`

When `overwrite` is `false` and the destination exists:
- If `errorOnExist` is `true`, throws an error with `code: 'EEXIST'`.
- If `errorOnExist` is `false`, returns the destination path without copying.

### move()

**Usage:** `move(source: PathLike, destination: PathLike, options?: MoveCopyOptions): Promise<string>`

Moves a file or directory and returns the resolved destination path.

**Defaults:**
- `overwrite: false`
- `errorOnExist: true`

When `overwrite` is `false` and the destination exists:
- If `errorOnExist` is `true`, throws an error with `code: 'EEXIST'`.
- If `errorOnExist` is `false`, returns the destination path without moving.

When `overwrite` is `true`:
- Removes the destination before moving when it already exists.
- Rejects overlapping source and destination paths.

### remove()

**Usage:** `remove(path: PathLike): Promise<string>`

Removes a file or directory (recursive, force) and returns the resolved path.

### glob()

**Usage:** `glob(pattern?: string, options?: GlobScanOptions): Promise<string[]>`

Scans files using `Bun.Glob` and returns the matches.

**Defaults:**
- `pattern: '*'`
- `absolute: true`
- `onlyFiles: true`

When `options.cwd` is not set, `glob()` uses the Bun shell current working directory (from `pwd`), not `process.cwd()`.

### ensureUniquePath()

**Usage:** `ensureUniquePath(path: PathLike, options?: SuffixOptions): Promise<string>`

Returns the input path when it does not exist. When it exists, returns a sibling path with a numeric suffix.

**Defaults:**
- `separator: '_'`
- `start: 1` (minimum `1`)
- `maxAttempts: 10_000`

### writeFileSafe()

**Usage:** `writeFileSafe(path: PathLike, input: BlobInput, options?: WriteTextOptions & { suffix?: SuffixOptions }): Promise<string>`

Writes a file without overwriting by selecting a non-colliding path and writing with `flag: 'wx'`.

### copySafe()

**Usage:** `copySafe(source: PathLike, destination: PathLike, options?: MoveCopyOptions & { suffix?: SuffixOptions }): Promise<string>`

Copies without overwriting by selecting a non-colliding destination path.

### moveSafe()

**Usage:** `moveSafe(source: PathLike, destination: PathLike, options?: MoveCopyOptions & { suffix?: SuffixOptions }): Promise<string>`

Moves without overwriting by selecting a non-colliding destination path.

## Examples

```ts
const configPath = files.resolve('~/.config/my-app/config.json')

const config = await files.pathExists(configPath)
  ? JSON.parse(await files.readFile(configPath)) as Record<string, unknown>
  : {}

config.updatedAt = new Date().toISOString()
await files.outputFile(configPath, `${JSON.stringify(config, null, 2)}\n`)
```

```ts
await files.outputFile('./notes.txt', 'hello\n')
await files.editFile('./notes.txt', (content) => content.toUpperCase())
```

```ts
await files.writeFile('./report.txt', 'base report')
const safePath = await files.writeFileSafe('./report.txt', 'new report')
console.log(safePath) // ./report_1.txt
```

## SAF Status

`SAF` is deprecated and planned for removal in `2.0.0`.

Migration guide: [/migrations/saf-to-files/](/migrations/saf-to-files/)

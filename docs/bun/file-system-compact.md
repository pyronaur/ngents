---
summary: "Compact reference: Bun.file/Bun.write + node:fs and node:fs/promises APIs"
read_when:
  - Need a condensed Bun filesystem API reference from official Bun docs.
  - Replacing deprecated SAF/files.* usage with Bun/Node-native filesystem APIs.
---

## Scope

This is the compact filesystem source-of-truth for Bunmagic scripts.

- Preferred runtime APIs: `Bun.file(...)`, `Bun.write(...)`, `node:fs/promises`
- Bunmagic helper to keep: `glob()` (because it follows Bun shell cwd behavior)
- Deprecated in Bunmagic: `SAF`, `files.*` (except `glob`)

## Official Docs (Primary Sources)

- Bun File I/O guide: `https://bun.sh/docs/runtime/file-io`
- Bun `Bun.file` reference: `https://bun.sh/reference/bun/file`
- Bun `BunFile` reference: `https://bun.sh/reference/bun/BunFile`
- Bun `Bun.write` reference: `https://bun.sh/reference/bun/write`
- Bun Node compatibility (`node:fs` status): `https://bun.sh/docs/runtime/nodejs-compat`
- Node `fs` docs (all forms): `https://nodejs.org/api/fs.html`

## Bun Native FS (Condensed)

### `Bun.file(pathOrFdOrUrl, options?) -> BunFile`

- Lazy `Blob`-like handle; creating handle does not read file.
- Inputs: `string` path, `file:// URL`, numeric fd.
- Optional `type` override for MIME.
- Works for non-existing paths; use `await file.exists()` to check.

### `BunFile` core surface

- Properties: `size`, `type`, `name`, `lastModified`
- Reads:
  - `await file.text()`
  - `await file.json()`
  - `await file.arrayBuffer()`
  - `await file.bytes()`
  - `file.stream()`
  - `await file.formData()` (non-standard, body-style parsing)
- File ops:
  - `await file.exists()`
  - `await file.delete()`
  - `await file.write(data)` (equivalent write target behavior)
  - `file.writer()` for incremental writes
  - `file.slice(...)` for ranged view

### `Bun.write(destination, input, options?) -> Promise<number>`

- Destination: `string` path, `URL`, `BunFile`
- Input: `string`, `Blob`, `TypedArray`, `ArrayBuffer`, `Response`, `BunFile`
- Overwrites target file (truncates when needed).
- Creates parent path by default (`createPath` option controls behavior).
- Returns bytes written.

### Bun stdio as files

- `Bun.stdin`, `Bun.stdout`, `Bun.stderr` are `BunFile` instances.

### Practical defaults

- Read text/json: `Bun.file(path).text()/json()`
- Existence: `await Bun.file(path).exists()` (avoid pre-check when operation+catch is enough)
- Write/copy: `await Bun.write(dest, dataOrFile)`

## Node FS API Map (Compact but Broad)

### Imports

```ts
import * as fs from 'node:fs/promises'
import { createReadStream, createWriteStream } from 'node:fs'
```

Use `node:fs/promises` for app code by default. Use callback/sync forms only when needed.

### `node:fs/promises` top-level APIs

- Access/meta: `access`, `stat`, `lstat`, `statfs`, `realpath`, `readlink`
- Ownership/perms/times: `chmod`, `chown`, `lchmod`, `lchown`, `lutimes`, `utimes`, `truncate`
- Directory lifecycle: `mkdir`, `mkdtemp`, `opendir`, `readdir`, `rm`, `rmdir`
- File lifecycle: `open`, `rename`, `link`, `symlink`, `unlink`
- File content: `readFile`, `writeFile`, `appendFile`
- Copy/move-ish: `copyFile`, `cp`, `rename`
- Watch: `watch`
- Newer utility surface on current Node docs: `glob`
- Constants namespace: `constants`

### `FileHandle` methods (from `await open(...)`)

- Lifecycle: `close`
- Metadata: `stat`, `chmod`, `chown`, `utimes`, `truncate`, `sync`, `datasync`
- Reads: `read`, `readFile`, `readv`, `readLines`, `createReadStream`
- Writes: `write`, `writeFile`, `appendFile`, `writev`, `createWriteStream`

### Callback + Sync APIs (`node:fs`)

- Same operation families exist as callback and `*Sync` forms.
- Extra watcher/stream primitives live here:
  - `watch`, `watchFile`, `unwatchFile`
  - `createReadStream`, `createWriteStream`

## Migration Map from Deprecated Bunmagic FS Helpers

- `files.readFile` -> `Bun.file(path).text()`
- `files.readBytes` -> `Bun.file(path).bytes()` or `arrayBuffer()`
- `files.writeFile` / `files.outputFile` -> `Bun.write(path, data)` (+ `mkdir` when explicit parent prep needed)
- `files.pathExists` -> `Bun.file(path).exists()` or operation+catch
- `files.isFile` / `files.isDir` -> `stat/lstat` and inspect kind
- `files.ensureDir` -> `mkdir(path, { recursive: true })`
- `files.copy` -> `cp`/`copyFile`
- `files.move` -> `rename` (with `EXDEV` fallback to copy+unlink)
- `files.remove` -> `rm(path, { recursive: true, force: true })`
- `files.ensureUniquePath` / `*Safe` -> explicit collision strategy in script logic
- Keep `glob()` helper when you want Bun shell cwd-aware globbing

## Bun-in-Bunmagic Notes

- `path` global is still valid and useful for path joins/resolution.
- `files.*` and `SAF` are legacy compatibility surfaces only.
- If you need portable behavior clarity, prefer explicit `node:fs/promises` calls in script code.

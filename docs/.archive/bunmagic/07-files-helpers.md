---
summary: "Legacy files.* helper reference (deprecated; glob remains supported)"
read_when:
  - Maintaining older scripts that still call `files.*`.
  - Migrating scripts from Bunmagic helper FS APIs to Bun/Node-native APIs.
---

## Status

`files.*` is a legacy compatibility layer.

- Deprecated in current `1.x`
- Planned removal in `2.0.0`
- Exception: `glob()` remains supported and is still useful

Preferred docs for new code: `docs/bun/file-system-compact.md`

## Why This Page Still Exists

Older scripts still import/use:

```ts
import * as files from 'bunmagic/files'
```

This page exists so migration work is mechanical and low-risk.

## Deprecated Helper -> Native Replacement

- `files.resolve(...)` -> `path.resolve(...)`
- `files.stem(...)` -> `path.parse(...).name`
- `files.pathExists(...)` -> `await Bun.file(path).exists()` or operation+catch
- `files.isFile(...)` / `files.isDir(...)` -> `stat/lstat` checks
- `files.ensureDir(...)` -> `mkdir(path, { recursive: true })`
- `files.ensureFile(...)` -> `mkdir(dirname)` + `open(..., 'a')` or `Bun.write(...)`
- `files.emptyDir(...)` -> `readdir` + `rm`
- `files.readFile(...)` -> `Bun.file(path).text()`
- `files.readBytes(...)` -> `Bun.file(path).bytes()`
- `files.writeFile(...)` -> `Bun.write(path, data)`
- `files.outputFile(...)` -> `mkdir(dirname, { recursive: true })` + `Bun.write(...)`
- `files.editFile(...)` -> explicit read/transform/write flow
- `files.copy(...)` -> `cp(...)` or `copyFile(...)`
- `files.move(...)` -> `rename(...)` (with `EXDEV` fallback when required)
- `files.remove(...)` -> `rm(path, { recursive: true, force: true })`
- `files.ensureUniquePath(...)` -> explicit suffix strategy in script
- `files.writeFileSafe(...)` / `copySafe(...)` / `moveSafe(...)` -> explicit unique-path + write/copy/move flow
- `files.glob(...)` -> still supported (keep using it as needed)

## Minimal Migration Template

```ts
import { mkdir, rm } from 'node:fs/promises'

const target = './tmp/state.json'

await mkdir('./tmp', { recursive: true })
await Bun.write(target, `${JSON.stringify({ ok: true }, null, 2)}\n`)

const exists = await Bun.file(target).exists()
if (exists) {
  const state = await Bun.file(target).json()
  console.log(state)
}

await rm('./tmp', { recursive: true, force: true })
```

## Official Docs

- Bun file APIs: `https://bun.sh/docs/runtime/file-io`
- Node fs APIs: `https://nodejs.org/api/fs.html`

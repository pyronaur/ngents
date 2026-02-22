---
summary: "Migration guide for deprecated SAF/files.* to Bun.file/Bun.write + node:fs/promises"
read_when:
  - SAF or files.* deprecation warnings appear in Bunmagic scripts.
  - Migrating legacy Bunmagic FS helpers to native Bun/Node APIs.
---

## Note on Filename

This doc path keeps its historical name (`saf-to-files`) for continuity.
Current migration target is native Bun + Node FS APIs, not `files.*`.

## Status

- `SAF`: deprecated, removal planned in `2.0.0`
- `files.*`: deprecated, removal planned in `2.0.0` (except `glob`)
- New code should use `Bun.file`, `Bun.write`, and `node:fs/promises`

## Warning Strings (Current Direction)

Warnings point to Bun/Node FS docs:

- `https://bun.sh/docs/runtime/file-io`
- `https://nodejs.org/api/fs.html`

## Quick Mapping

| Legacy | Native replacement |
| --- | --- |
| `SAF.from(path)` | `path.resolve(path)` + `Bun.file(...)` |
| `await saf.exists()` | `await Bun.file(path).exists()` |
| `await saf.isFile()` | `stat(path).isFile()` |
| `await saf.isDirectory()` | `stat(path).isDirectory()` |
| `await saf.write(data)` | `await Bun.write(path, data)` |
| `await saf.bytes()` | `await Bun.file(path).bytes()` |
| `await saf.edit(fn)` | `const next = fn(await Bun.file(path).text()); await Bun.write(path, next)` |
| `await saf.ensureDirectory()` | `await mkdir(dirname(path), { recursive: true })` |
| `await saf.delete()` | `await rm(path, { recursive: true, force: true })` |
| `await SAF.prepare(path)` | explicit unique-path suffix function |
| `files.outputFile(path, data)` | `mkdir(dirname(path), { recursive: true })` + `Bun.write(path, data)` |

## Rewrite Example (JSON)

```ts
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const p = './state.json'
const file = Bun.file(p)

const state = (await file.exists())
  ? (await file.json() as { count?: number })
  : {}

state.count = (state.count ?? 0) + 1
await mkdir(path.dirname(p), { recursive: true })
await Bun.write(p, `${JSON.stringify(state, null, 2)}\n`)
```

## Collision-safe Write Example

```ts
import { stat } from 'node:fs/promises'

async function uniquePath(base: string): Promise<string> {
  let i = 0
  let candidate = base
  while (true) {
    try {
      await stat(candidate)
      i += 1
      const dot = base.lastIndexOf('.')
      candidate = dot >= 0
        ? `${base.slice(0, dot)}_${i}${base.slice(dot)}`
        : `${base}_${i}`
    } catch {
      return candidate
    }
  }
}

const target = await uniquePath('./report.txt')
await Bun.write(target, 'report')
```

## Keep Using `glob()`

`glob()` remains the Bunmagic helper exception because it aligns with Bun shell cwd behavior and is still convenient in scripts.

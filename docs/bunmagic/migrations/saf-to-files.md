---
summary: "Bridge SAF to files.* helpers during the 1.4.x deprecation sweep"
read_when:
  - "SAF warnings appear when running scripts in 1.4.x."
  - "Need an implementation-verified SAF → files.* mapping."
---

## Status

- `SAF` is deprecated in `1.4.x`.
- `SAF` is scheduled for removal in `1.5.0`.
- New code should use `files.*`.

Current warning message:

`[bunmagic] SAF is deprecated and will be removed in v1.5.0. Use files.* helpers. See docs: https://bunmagic.com/migrations/saf-to-files`

Temporarily silence deprecation warnings with:

```bash
BUNMAGIC_SILENCE_DEPRECATIONS=1
```

## Quick Mapping

| SAF | files.* replacement |
| --- | --- |
| `SAF.from(path)` | `files.resolve(path)` |
| `SAF.from(dir, target)` | `files.resolve(dir, target)` |
| `await saf.exists()` | `await files.pathExists(path)` |
| `await saf.isFile()` | `await files.isFile(path)` |
| `await saf.isDirectory()` | `await files.isDir(path)` |
| `await saf.write(data)` | `await files.writeFile(path, data)` |
| `await saf.bytes()` | `await files.readBytes(path)` |
| `await saf.edit(fn)` | `await files.editFile(path, fn)` |
| `await saf.ensureDirectory()` | `await files.ensureDir(path.dirname(files.resolve(path)))` |
| `await saf.delete()` | `await files.remove(path)` |
| `await SAF.prepare(path)` | `await files.ensureUniquePath(path)` |
| `const t = await SAF.prepare(path); await t.write(data)` | `await files.writeFileSafe(path, data)` |

## JSON Rewrite Pattern

```ts
// Before
const saf = SAF.from('./state.json')
const state = await saf.json<{ count?: number }>()
await saf.json({ count: (state.count ?? 0) + 1 })

// After
const p = './state.json'
const state = await files.pathExists(p)
  ? (JSON.parse(await files.readFile(p)) as { count?: number })
  : {}

state.count = (state.count ?? 0) + 1
await files.outputFile(p, `${JSON.stringify(state, null, 2)}\n`)
```

## Safe Collision Pattern

```ts
// Before
const target = await SAF.prepare('./report.txt')
await target.write('report')

// After
const target = await files.writeFileSafe('./report.txt', 'report')
console.log(target)
```

## Move / Rename Pattern

```ts
// Before
const file = SAF.from('./data/report.json')
file.directory = './out'
file.extension = '.txt'
await file.update()

// After
const source = files.resolve('./data/report.json')
const destination = files.resolve('./out/report.txt')
await files.moveSafe(source, destination)
```

## Notes

- `files.editFile(...)` returns updated content (`string`), not a file handle.
- `files.remove(...)` removes files or directories recursively.
- `files.outputFile(...)` should be used when parent directories may not exist.
- Use `flag: 'wx'` when you want writes to fail if destination exists.
- Prefer `ensureUniquePath` / `*Safe` helpers for suffix-based collision handling.

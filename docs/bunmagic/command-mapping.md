---
summary: "How bunmagic discovers sources and maps files to runnable commands"
read_when:
  - Adding or renaming bunmagic scripts in `~/.ngents`.
  - Need to confirm how bunmagic resolves source config -> namespace -> script command.
---

# bunmagic Command Mapping

Bunmagic command discovery is driven by `~/.bunmagic/config.json`, not a hardcoded `scripts/` convention.

## 1) Source of Truth: `~/.bunmagic/config.json`

- Bunmagic reads `sources[]`; each entry is:
  - `dir`: absolute directory to scan for scripts
  - optional `namespace`: command prefix for that directory
- Example from this machine:
  - `{ "namespace": "ngents", "dir": "~/.ngents/scripts" }`
- This means you control command roots by changing `sources[]` (`bunmagic link`, `bunmagic unlink`, or direct config edit).

## 2) Discovery Rules per Source Directory

- Scan is top-level only for that `dir`:
  - `*.ts`, `*.mjs`, `*.js`
- Not recursive for scripts.
- Ignored:
  - files starting with `_`
  - `*.d.ts`
- Slug comes from filename stem and is slugified.
  - `My Script.ts` -> `my-script`

## 3) Command Shape

- With namespace:
  - `<namespace> <slug>`
  - Example: `ngents docs` from `~/.ngents/scripts/docs.ts`
- Without namespace:
  - `<slug>` directly

## 4) How Commands Become Executable

- `bunmagic reload` creates shell wrappers in `~/.bunmagic/bin`.
- Namespaced source:
  - creates one namespace bin: `~/.bunmagic/bin/<namespace>`
  - wrapper runs: `bunmagic-exec-namespace <source-dir> <namespace> $@`
  - scripts execute through namespace router at runtime
- Non-namespaced source:
  - creates one bin per script slug via `bunmagic-exec`

## 5) Reload Behavior (Important)

- For namespaced sources (for example `ngents`), adding a new script file under the source directory usually does not require `bunmagic reload`.
- Reason: the existing namespace bin already dispatches into the source directory at runtime.
- `bunmagic reload` is mainly for bin wiring changes, for example:
  - new or removed source directory
  - namespace changed
  - missing/stale namespace bin
  - creating/removing top-level alias bins (for example `@global`)

## 6) Alias Behavior

- `@alias <name>`:
  - adds alternate command key in script map
  - for non-namespaced sources, also gets its own bin file
  - for namespaced sources, works within namespace routing (no separate top-level bin)
- `@global <name>`:
  - creates top-level bin alias even when script lives in a namespace
  - this is how a namespaced script can be called globally

## 7) Collision + Ordering Rules

- Source order in `~/.bunmagic/config.json` matters.
- Global command collisions resolve by whichever bin already exists / is claimed first during reload.
- Same-source duplicate slugs/aliases are warned and skipped.

## 8) Fast Verification

Run these when mapping feels off:

```bash
bunmagic list ngents --info
bunmagic which ngents
bunmagic which "ngents docs"
cat ~/.bunmagic/bin/ngents
cat ~/.bunmagic/config.json
```

## 9) Implementation References

These files are in the Bunmagic open-source repo, with paths relative to that repo root (for example `bunmagic/src/...` in local checkouts).

- Script discovery: `src/lib/scripts.ts`
- Source loading: `src/lib/sources.ts`
- Namespace/script bins: `src/scripts/reload.ts`
- Namespace runtime dispatch: `src/bin/bunmagic-exec-namespace.ts`, `src/run.ts`

---
summary: "Practical guide for choosing TypeScript refactor tools across discovery, codemods, structural rewrites, and cleanup."
read_when:
  - Planning a large TypeScript refactor across many files.
  - Choosing between `rg`, `ast-grep`, `comby`, `ts-morph`, and `jscodeshift`.
  - Repeating symbol rename, module extraction, import rewiring, or deletion-heavy cleanup work.
---

# TypeScript Refactor Tooling

Use different tools for different refactor shapes. The fastest path is usually:

1. discover with `rg`
2. choose one rewrite tool for the actual change
3. run the repo's normal lint/typecheck/tests to catch leftovers

Do not treat all refactors as search-and-replace problems. The right tool depends on whether the change is about text, syntax shape, or TypeScript meaning.

## Default Tool Stack

### `rg`

Use `rg` first for discovery and scoping.

Good for:

- finding ownership of a behavior or symbol
- counting how many call sites exist
- locating old import paths, option objects, or surface names
- finding docs/tests/config references that also need cleanup

`rg` is the inventory tool, not the rewrite tool.

### `ts-morph`

Use `ts-morph` for type-aware or import-aware refactors.

Good for:

- renaming exported functions, types, enums, or constants across files
- moving code into a new module and rewriting imports
- adding, removing, or rewriting import declarations
- traversing TypeScript AST with project context
- writing one focused codemod script for a repo-local change

This is the best default when the risk is "break symbol usage or import wiring across many files."

Treat `ts-morph` as a library, not a global machine tool. Install it in the repo that needs the refactor and write a small script against that repo's `tsconfig.json`.

### `ast-grep`

Use `ast-grep` for repeated syntax-shaped rewrites when you do not need type information.

Good for:

- replacing one call shape with another
- rewriting repeated statement or expression forms
- removing wrappers or option-object ceremony with consistent syntax
- updating import/export syntax patterns

This is usually the best bulk-rewrite tool after the architecture decision is already made.

### `comby`

Use `comby` for lightweight balanced rewrites when regex is too brittle and a TS AST script is too much setup.

Good for:

- one-off balanced rewrites in `.ts`, `.js`, `.md`, `.json`
- cleanup passes across mixed file types
- broad but still structured text replacement

It is a good middle ground between regex and AST tooling.

### `jscodeshift`

Use `jscodeshift` when you specifically want recast-style codemods or already have transforms written for it.

Good for:

- established codemod workflows built around recast/Babel-style transforms
- teams that already have a `jscodeshift` transform library
- changes where preserving code style/printing behavior through recast matters

If starting from scratch, prefer:

- `ts-morph` for type-aware refactors
- `ast-grep` for repeated structural rewrites

## Decision Matrix

Use this rule:

- find where to operate: `rg`
- rename or move a symbol across many files: `ts-morph`
- create a new module and rewire imports: `ts-morph`
- replace a repeated syntax shape: `ast-grep`
- do a balanced one-off rewrite across code/docs/tests: `comby`
- use an existing recast codemod workflow: `jscodeshift`

## Refactor Shapes And Best Tool

### Symbol rename

Best tool:

- `ts-morph`

Why:

Text search alone is not safe when symbols are imported, re-exported, shadowed, or type-only.

### Module extraction

Best tool:

- `ts-morph`

Why:

The hard part is moving ownership while keeping imports coherent.

### API shape migration

Best tool:

- `ast-grep`
- sometimes `ts-morph` if imports/types also change materially

Why:

Repeated call-site transformations are usually syntax-shaped first.

### Delete-and-clean refactor

Best tool:

- `rg` to map the old surface
- `ast-grep` or `comby` for broad cleanup
- repo lint/typecheck/tests to catch dead references

Why:

Once the decision is "purge the old path," the main risk becomes incomplete cleanup.

### Mixed code + docs + config cleanup

Best tool:

- `comby`
- plus `rg` for discovery

Why:

This is broader than a code-only AST rewrite and usually benefits from balanced matching across file types.

## Installation Guidance

### Worth having globally

- `rg`
- `ast-grep`
- `comby`

These are broadly useful across repositories and have low setup cost.

### Prefer in-repo installation

- `ts-morph`
- `jscodeshift`

Reason:

- the useful unit is usually a repo-local codemod script
- the codemod should target the repo's parser/config/tsconfig
- keeping the dependency local makes the transform reproducible for future runs

## Suggested Workflow

1. Use `rg` to inventory the current surface.
2. Name the exact repeated pattern before picking a tool.
3. If the change is symbol/import aware, write a focused `ts-morph` script.
4. If the change is syntax-shaped, start with `ast-grep`.
5. Use `comby` for lightweight balanced cleanup across mixed files.
6. Only use `jscodeshift` when you already want recast-style codemods.
7. Run the repo's normal lint/typecheck/tests after the rewrite.

## Practical Baseline

For most TypeScript codebases, a strong baseline is:

- `rg` for discovery
- `ast-grep` for structural rewrites
- `comby` for balanced cleanup
- `ts-morph` installed per repo for cross-file semantic refactors

That covers most real-world refactor work without carrying unnecessary tooling.

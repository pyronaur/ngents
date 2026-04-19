---
name: ts-lint-setup
description: Set up or upgrade strict TypeScript/JavaScript linting with Oxlint (type-aware), dprint (formatter), jscpd (0% duplication), and knip, routed through `gate`. Use when a repo needs lint tooling installed, Gatefile validation wired, or lint configuration standardized without silencing rules.
disable-model-invocation: true
---

# TS Lint Setup

This skill is the shared, maintained baseline for strict TypeScript/JavaScript
lint setup across projects. Treat it as the current best-known default, not as
a verbatim file-layout recipe.

When applying this skill to a repo:
- preserve the meaning of the policy, not the literal path names or file layout
- adapt config placement, globs, and entry points to the repo structure
- report only meaningful deltas when comparing a repo to this skill

Meaningful deltas:
- rule presence or absence
- rule values
- custom rule messages
- duplication thresholds
- formatter/linter coverage intent
- whether tests are linted and how they are configured

Usually not meaningful by themselves:
- repo root vs subdirectory config placement
- different but equivalent path globs
- project-specific directory names

Follow this workflow to install lint tooling, update AGENTS.md through
`$gatefile`, copy the shared
baseline templates, adapt them to the repo, wire lint through Gatefile, and
validate through `gate`.

Do not weaken lint rules. Do not add exclusions to hide lint violations. Do not
raise duplication thresholds.
Lint scope must target real TypeScript/JavaScript source code. When a repo has
tests, tests should be linted too, but test scope may use separate config/rules
from runtime source. Temporary files, weak sources (for example JSON), and
compiled output must stay excluded.

## 1) Install Or Upgrade Lint Dependencies

Install these dev dependencies using the repo's existing package manager. This
skill does not dictate package-manager choice.

Install:
- `dprint@latest`
- `oxlint@latest`
- `oxlint-tsgolint@latest` (required for Oxlint type-aware rules)
- `oxlint-plugin-inhuman@latest` (custom strictness rules)
- `oxlint-plugin-complexity@latest` (complexity rule plugin)
- `jscpd@latest`
- `knip@latest`

Examples:

```bash
bun add -d dprint@latest oxlint@latest oxlint-tsgolint@latest oxlint-plugin-inhuman@latest oxlint-plugin-complexity@latest jscpd@latest knip@latest
npm install -D dprint@latest oxlint@latest oxlint-tsgolint@latest oxlint-plugin-inhuman@latest oxlint-plugin-complexity@latest jscpd@latest knip@latest
```

## 2) Update AGENTS.md Through Gatefile

If the repo needs an `AGENTS.md` update, use `$gatefile`
`references/guide-agents-file.md`.

Do not add TypeScript/JavaScript lint policy prose here.
Keep AGENTS focused on `gate`.
Let Gatefile own the workflow wording and runtime branches.

## 3) Copy Config Templates

Copy the templates into the repo root:
- `assets/templates/dprint.json` -> `dprint.json`
- `assets/templates/.oxlintrc.json` -> `.oxlintrc.json`
- `assets/templates/.jscpd.json` -> `.jscpd.json`
- `assets/templates/.jscpd.tests.json` -> `.jscpd.tests.json` when the repo has tests
- `assets/templates/knip.json` -> `knip.json`

See `references/templates.md` for allowed tweaks.

Mandatory config expectations:
- dprint is the formatter.
- Oxlint is the linter and runs in type-aware mode.
- Lint scope targets real TypeScript/JavaScript source files.
- Tests are linted when the repo has tests.
- Runtime source and tests may use separate config or rule values when that
  improves signal. Keep that separation explicit.
- Exclude temporary directories, weak sources (for example JSON), and compiled
  output directories.
- In multi-language repos, keep this lint policy scoped to TypeScript/JavaScript
  instead of unrelated language sources.
- Keep excludes minimal and evidence-based. For every include/ignore line you
  add, verify the path/pattern exists in the repo (excluding `node_modules`).
  If the match count is `0`, do not add that line.
- Do not pre-add framework-specific directories or filename patterns unless the
  project actually contains them.
- Adapt paths and globs to the repo. Different directory names or config
  locations are not meaningful deltas by themselves.
- Oxlint enables these plugins: `eslint`, `typescript`, `unicorn`, `oxc`,
  `import`, plus the JS plugins `oxlint-plugin-inhuman` and
  `oxlint-plugin-complexity`.
- Oxlint enforces import hygiene rules:
- `typescript/consistent-type-imports` with `{ "fixStyle": "inline-type-imports" }`
- `typescript/no-import-type-side-effects`
- `import/no-duplicates`
- `import/no-self-import`
- Oxlint enforces `eslint/no-unused-vars: ["error", { "args": "after-used", "vars": "all", "caughtErrors": "all" }]`.
- Do not add unused-binding ignore-pattern escapes without explicit user
  approval.
- Oxlint enforces the strict `max-*` guardrails:
- `max-depth: 3`
- `max-params: 3`
- `max-lines: 500`
- `max-lines-per-function: 100`
- `max-statements: 32`
- `max-nested-callbacks: 3`
- `max-classes-per-file: 1` (ignore expressions)
- Oxlint enforces `curly: all` and `no-else-return` (no `else` after `return`).
- Oxlint enforces inhuman rules:
- `inhuman/require-guard-clauses`
- `inhuman/no-swallowed-catch`
- `inhuman/export-code-last`
- `inhuman/no-empty-wrappers`
- `inhuman/no-switch`
- `inhuman/no-else`
- Oxlint enforces `oxc/no-barrel-file`.
- Oxlint enforces cleanup/style rules:
- `typescript/no-unnecessary-type-constraint`
- `typescript/no-useless-empty-export`
- `eslint/no-unneeded-ternary`
- `eslint/no-useless-concat`
- `unicorn/prefer-array-flat-map`
- `unicorn/no-abusive-eslint-disable`
- Oxlint enforces `complexity/complexity`.
- Oxlint enforces banned-type rules:
- `typescript/no-wrapper-object-types`
- `typescript/no-restricted-types` for:
- `object` with message: `Use a specific object shape. If the data is already typed, prefer generics. Reserve unknown as a last resort for incoming external data before validation.`
- `Object` with the same message
- `Function` with message: `Declare the callable signature explicitly.`
- Oxlint enforces type-aware assertion safety rules:
- `typescript/consistent-type-assertions` with `{ "assertionStyle": "never" }`
- `typescript/no-non-null-assertion`
- `typescript/no-unnecessary-type-assertion`
- `typescript/no-unsafe-type-assertion`
- `typescript/non-nullable-type-assertion-style`
- `as const` remains allowed; ban `as SomeType` and other type assertions.
- `jscpd` runtime/source config keeps:
- `threshold: 0`
- `minTokens: 40`
- `minLines: 3`
- `jscpd` test config keeps:
- `threshold: 0`
- `minTokens: 60`
- `minLines: 7`
- Gatefile should own lint routing and decide when lint runs from the diff.
- Consult `$gatefile` before changing `.gatefile.json5`.

When comparing a repo to this skill, call out only actual config differences:
- changed rule values
- changed thresholds
- added or missing rules
- changed custom messages
- different source/test coverage intent

Do not call out:
- equivalent path/glob differences
- root vs subdirectory config placement

### Why These Guardrails Exist

- `max-depth: 3`: Deep nesting hides the happy path and correlates with bugs.
- `max-params: 3`: Many parameters usually signal weak abstractions and fragile call sites.
- `max-lines: 500`: Very long files become dumping grounds and are hard to review.
- `max-lines-per-function: 100`: Long functions mix concerns and are risky to change.
- `max-statements: 32`: Too many statements usually means “does too much.”
- `max-nested-callbacks: 3`: Callback nesting rapidly explodes complexity.
- `max-classes-per-file: 1`: Multiple classes per file blurs boundaries and ownership.
- `curly: all` and `no-else-return`: Make control flow explicit and push toward early returns.
- `inhuman/*` rules: Enforce guard clauses, forbid swallowed errors, prevent `switch`/`else`, and forbid empty wrapper exports.
- `oxc/no-barrel-file`: Discourage barrels and keep exports near their definitions.
- Import hygiene rules: Keep type-only imports explicit, prevent side-effect-only
  leftovers from inline type imports, and block duplicate or self imports.
- Cleanup/style rules: Remove empty export noise, unnecessary type constraints,
  weak ternaries, useless string concat, abusive lint suppression, and prefer
  `flatMap` over `map(...).flat()` style chains.
- `complexity/complexity`: Keep control-flow complexity from drifting into opaque code paths.
- Banned-type rules: Push code away from vague placeholder types and toward
  specific shapes, generics, and explicit callable signatures.
- Type-aware assertion rules: Ban `as SomeType` style casts, keep `as const`, and prevent unsafe casts and non-null assertions from hiding type risk.
- `jscpd threshold: 0`: Duplication multiplies maintenance cost and causes drift.

## 4) Wire Lint Through Gatefile

Use Gatefile as the public validation surface. Agents should run `gate`.

Required outcomes:
- Add or update lint-related gate entries in `.gatefile.json5`.
- Keep lint scope ownership in lint config files, not in AGENTS prose.
- Prefer running the concrete lint commands directly in Gatefile.
- Only use an existing repo entrypoint when it is already the real
  source-of-truth command for that proof, not a wrapper added just for Gatefile.
- Do not add custom orchestrators such as `.lint/run.ts`.
- Do not add `make`-based lint wrappers.

Gatefile guidance:
- Select lint gates from real TypeScript/JavaScript source paths and lint
  config files whose content can change lint results.
- Build each gate selector for that gate's exact proof surface. Do not reuse one
  broad match list across multiple gates.
- A gate match should include only files whose changed content can change that
  exact command's result on the next `gate` run.
- Do not include package manifests or lockfiles in a gate match unless that gate
  command reads them directly on every run or the gate itself performs the
  install step that materializes their effect.
- Do not treat invocation wrappers as selector inputs. Follow `$gatefile`
  guidance for selector design.
- Use simple gate keys that identify the proof without redundant package
  prefixes.
- Use human-readable gate names that describe what the gate actually does.
- A gate name should tell a reader the action and subject clearly enough that
  they do not need to inspect `run` to understand the proof.
- Keep output terse and evidence-based.
- If the repo needs a lint-only proof path during setup, expose it as a normal
  gate key so it can be exercised with `gate run <key>`.
- Put lint edge-case guidance on the failing Gatefile lint step with
  `guidance`, not in AGENTS prose or skill text. See
  `references/templates.md` for the pattern.

## 5) Validate Through Gatefile

After setup, validate through the repo's Gatefile:

```bash
gate
```

If the repo exposes a dedicated lint gate, you may also use:

```bash
gate run <lint-key>
```

This skill explicitly allows a targeted gate run during setup when you need to
prove the lint wiring directly.

Validation rules:
- Validate the repo's intended gate behavior. If a gate is designed to fix,
  format, or otherwise mutate, validate that behavior instead of forcing a
  check-only substitute.
- Expect failures in existing repos. Report the most important failures.
- Do not silence or weaken rules to make the run pass.

## Project-Specific Values

Templates must remain generic. Do not add repo-specific ignores, file names, or
entry points. Always update these values per repo:
- `knip.json` `entry`
- `jscpd` source/test `path` or equivalent scope fields
- Any ignore patterns for known generated artifacts
- Lint include/ignore patterns to match the repo's source and test layout while
  excluding tmp/weak sources/compiled output
- Every ignore pattern must be justified by an actual project match; remove
  zero-match patterns (for example, no `*.spec.*` ignore when there are zero
  spec files).

## Guardrails

- Never raise duplication thresholds.
- Never add exclusions to hide lint complaints.
- Never disable lint rules without explicit user approval.
- Never silently blur runtime-source and test scopes. If tests are linted, use
  explicit test config or test-specific rule overrides.
- Never widen lint scope to temporary files, weak sources, or compiled output
  just to increase coverage.
- Prefer incremental, reviewable config/script changes before auto-fixing.

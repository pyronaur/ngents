---
name: ts-lint-setup
description: Set up or upgrade strict TypeScript/JavaScript linting with Oxlint (type-aware), dprint (formatter), jscpd (0% duplication), and knip, plus a strict AGENTS.md lint policy. Use when a repo needs lint tooling installed, lint scripts wired, AGENTS.md hardened, or lint configuration standardized without silencing rules.
---

# TS Lint Setup

Follow this workflow to install lint tooling, harden AGENTS.md, copy known-good
config templates, and validate with a dry, non-destructive lint run.

Do not weaken lint rules. Do not add exclusions to hide lint violations. Do not
raise duplication thresholds.
Lint scope must target real TypeScript/JavaScript source code, not tests,
temporary files, weak sources (for example JSON), or compiled output.

## 1) Choose The Package Manager (bun preferred)

Detect the repo’s package manager and use it consistently for installs and
scripts.

Prefer `bun` when both are true:
- The `bun` command is available.
- The repo shows bun intent (for example `bun.lock` / `bun.lockb`, or
  `package.json` includes `"packageManager": "bun@..."`).

Otherwise, use `npm`.

## 2) Install Or Upgrade Lint Dependencies

Install these dev dependencies using the chosen manager:
- `dprint@latest`
- `oxlint@latest`
- `oxlint-tsgolint@latest` (required for Oxlint type-aware rules)
- `oxlint-plugin-inhuman@latest` (custom strictness rules)
- `jscpd@latest`
- `knip@latest`

Bun:

```bash
bun add -d dprint@latest oxlint@latest oxlint-tsgolint@latest oxlint-plugin-inhuman@latest jscpd@latest knip@latest
```

Npm:

```bash
npm install -D dprint@latest oxlint@latest oxlint-tsgolint@latest oxlint-plugin-inhuman@latest jscpd@latest knip@latest
```

## 3) Harden AGENTS.md (strict policy)

Ensure the repo has a root `AGENTS.md`. If it is missing, copy the template. If
it exists, merge in the strict lint policy without weakening it.

Template location:
- `assets/templates/AGENTS.md`

Required outcomes:
- Enforce zero lint complaints (no warnings, no errors, no duplication, no
  unused code).
- Forbid silencing, disabling, or weakening lint rules.
- Forbid raising duplication thresholds.
- Require user approval before ignoring any lint.
- Require `make lint` as the only lint command agents run directly.
- Require `make lint-dry` for check-only runs.
- Require frequent lint checks during active TypeScript/JavaScript development
  (for example after each meaningful implementation chunk) so style and
  structure issues are caught early.
- In multi-language repos, apply this frequent-run requirement to
  TypeScript/JavaScript work only.
- Run lint only after execution-affecting TypeScript/JavaScript source code
  changes (exception: step 6 validation run in this skill).

## 4) Copy Config Templates

Copy the templates into the repo root:
- `assets/templates/dprint.json` -> `dprint.json`
- `assets/templates/.oxlintrc.json` -> `.oxlintrc.json`
- `assets/templates/.jscpd.json` -> `.jscpd.json`
- `assets/templates/knip.json` -> `knip.json`

See `references/templates.md` for allowed tweaks.

Mandatory config expectations:
- dprint is the formatter.
- Oxlint is the linter and runs in type-aware mode.
- Lint scope targets only runtime TypeScript/JavaScript source files.
- Exclude tests, temporary directories, weak sources (for example JSON), and
  compiled output directories.
- In multi-language repos, keep this lint policy scoped to TypeScript/JavaScript
  instead of unrelated language sources.
- Keep excludes minimal and evidence-based. For every include/ignore line you
  add, verify the path/pattern exists in the repo (excluding `node_modules`).
  If the match count is `0`, do not add that line.
- Do not pre-add framework-specific directories or filename patterns unless the
  project actually contains them.
- Oxlint enables these plugins: `eslint`, `typescript`, `unicorn`, `oxc`,
  `import`.
- Oxlint enables the JS plugin: `oxlint-plugin-inhuman`.
- Oxlint enforces the strict `max-*` guardrails:
- `max-depth: 3`
- `max-params: 3`
- `max-lines: 500`
- `max-lines-per-function: 80`
- `max-statements: 24`
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
- Oxlint enforces type-aware assertion safety rules:
- `typescript/consistent-type-assertions` with `{ "assertionStyle": "never" }`
- `typescript/no-non-null-assertion`
- `typescript/no-unnecessary-type-assertion`
- `typescript/no-unsafe-type-assertion`
- `typescript/non-nullable-type-assertion-style`
- `as const` remains allowed; ban `as SomeType` and other type assertions.
- jscpd duplication threshold remains `0`.

### Why These Guardrails Exist

- `max-depth: 3`: Deep nesting hides the happy path and correlates with bugs.
- `max-params: 3`: Many parameters usually signal weak abstractions and fragile call sites.
- `max-lines: 500`: Very long files become dumping grounds and are hard to review.
- `max-lines-per-function: 80`: Long functions mix concerns and are risky to change.
- `max-statements: 24`: Too many statements usually means “does too much.”
- `max-nested-callbacks: 3`: Callback nesting rapidly explodes complexity.
- `max-classes-per-file: 1`: Multiple classes per file blurs boundaries and ownership.
- `curly: all` and `no-else-return`: Make control flow explicit and push toward early returns.
- `inhuman/*` rules: Enforce guard clauses, forbid swallowed errors, prevent `switch`/`else`, and forbid empty wrapper exports.
- `oxc/no-barrel-file`: Discourage barrels and keep exports near their definitions.
- Type-aware assertion rules: Ban `as SomeType` style casts, keep `as const`, and prevent unsafe casts and non-null assertions from hiding type risk.
- `jscpd threshold: 0`: Duplication multiplies maintenance cost and causes drift.

## 5) Wire Scripts And Makefile

Ensure `package.json` scripts include both a default auto-fix lint pipeline and
a check-only lint pipeline, and that Makefile targets delegate to them.

Recommended script structure:

```json
{
  "scripts": {
    "lint": "<pm> run lint:dprint:fix && <pm> run lint:oxlint:fix && <pm> run typecheck && <pm> run jscpd && <pm> run knip",
    "lint-dry": "<pm> run lint:dprint && <pm> run lint:oxlint && <pm> run typecheck && <pm> run jscpd && <pm> run knip",
    "lint:dprint": "dprint check",
    "lint:oxlint": "oxlint --type-aware --tsconfig tsconfig.json .",
    "lint:dprint:fix": "dprint fmt",
    "lint:oxlint:fix": "oxlint --type-aware --tsconfig tsconfig.json --fix .",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "jscpd": "jscpd --config .jscpd.json",
    "knip": "knip"
  }
}
```

Replace `<pm>` with `bun` or `npm` to match the repo.
Keep script targets as `.`. Lint scope must be configured in `dprint.json`,
`.oxlintrc.json`, and `.jscpd.json` via includes/ignore patterns.

Ensure the Makefile has a real tab before the command:

```make
.PHONY: lint lint-dry

lint:
	<pm> run lint

lint-dry:
	<pm> run lint-dry
```

Do not run `npm run lint` / `bun run lint` directly. Use `make lint`.
Remember that `make lint` runs auto-fix by default. Use `make lint-dry` for
check-only runs (especially during setup).

Do not add a separate `lint-fix` script. The default `lint` script should fix.

## 6) Validate With A Dry, Non-Destructive Lint Run

After setup, run a single non-fixing lint pass to confirm wiring and that the
linters complain as expected:

```bash
make lint-dry
```

This skill explicitly allows the validation run even though the changes may be
configuration-only.

Validation rules:
- Do not run auto-fixers in this step.
- Expect failures in existing repos. Report the most important failures.
- Do not silence or weaken rules to make the run pass.

## Project-Specific Values

Templates must remain generic. Do not add repo-specific ignores, file names, or
entry points. Always update these values per repo:
- `knip.json` `entry`
- Any ignore patterns for known generated artifacts
- Lint include/ignore patterns to exclude tests/tmp/weak sources/compiled output
- Every ignore pattern must be justified by an actual project match; remove
  zero-match patterns (for example, no `*.spec.*` ignore when there are zero
  spec files).

## Guardrails

- Never raise duplication thresholds.
- Never add exclusions to hide lint complaints.
- Never disable lint rules without explicit user approval.
- Never widen lint scope to tests, temporary files, weak sources, or compiled
  output just to increase coverage.
- Prefer incremental, reviewable config/script changes before auto-fixing.

# Templates

Templates live in `assets/templates/`:
- `assets/templates/AGENTS.md`
- `assets/templates/dprint.json`
- `assets/templates/.oxlintrc.json`
- `assets/templates/.jscpd.json`
- `assets/templates/.jscpd.tests.json`
- `assets/templates/.lint/run.ts`
- `assets/templates/knip.json`

Script/Makefile expectations:
- Provide `make lint` (auto-fix) and `make lint-dry` (check-only) as the only
  public lint entrypoints.
- Require a hidden `.lint/run.ts` orchestrator written in TypeScript with Bun.
- Use Bun only to execute the lint runner and its leaf scripts; do not treat
  this skill as package-manager policy for the repo.
- Keep lint command targets as `.` and control scope only through lint config
  files (`dprint.json`, `.oxlintrc.json`, `.jscpd.json`,
  `.jscpd.tests.json`).
- Do not add top-level `package.json` `lint` / `lint-dry` shortcuts when a
  Makefile exists.
- Keep only leaf package scripts in `package.json`; the runner should call
  those leaf scripts.
- The runner must execute every configured step and fail only after the full
  pipeline completes.
- Successful steps should print only a concise pass line; failed steps should
  print full captured output.
- When a repo has tests, prefer `jscpd:src` and `jscpd:tests` plus a combined
  `jscpd` script.
- When a repo has no tests, omit the test config and keep `jscpd` source-only.
- Never run `npm run lint` / `bun run lint` directly when a Makefile exists.

Comparison rule:
- Report meaningful config deltas only: rule presence, rule values, rule
  messages, thresholds, and source/test coverage intent.
- Do not treat path names, repo layout, config placement, or equivalent globs
  as noteworthy by themselves.
- Treat AGENTS changes semantically; preserve the lint policy meaning, not
  literal wording.

## Tweak Rules

Allowed tweaks:
- Update ignore patterns only for clearly generated artifacts.
- Update `knip.json` `entry` to real entry points.
- Adjust dprint `lineWidth` only if the repo already has a clear standard.
- Update `.lint/run.ts` step labels or leaf-step list to match the repo's real
  lint pipeline.
- Update dprint `includes`/`excludes` to cover the repo root and the repo's
  actual source/test layout while excluding tmp/compiled artifacts (do not use
  it to hide lint violations).
- Update source/test globs and config placement to match the repo structure.
- Update `jscpd` source/test scope fields to match the repo layout.
- Keep Oxlint type-aware wiring intact when type-aware rules are enabled.
- Keep AGENTS repo-specific wording as long as the strict lint policy meaning is
  preserved.

Disallowed tweaks without user approval:
- Raising duplication thresholds.
- Disabling or silencing lint rules.
- Adding exclusions to hide lint violations.
- Removing `--type-aware` or `oxlint-tsgolint` when type-aware rules are
  enabled.
- Replacing the runner with short-circuiting `&&` chains for the top-level lint
  entrypoints.
- Moving lint scope control out of config files into script path arguments.
- Silently mixing test policy into runtime-source config instead of using
  explicit test config or test-specific overrides.
- Adding repo-specific file names or ignores to the shared templates.

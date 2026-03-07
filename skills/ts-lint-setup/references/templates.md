# Templates

Templates live in `assets/templates/`:
- `assets/templates/AGENTS.md`
- `assets/templates/dprint.json`
- `assets/templates/.oxlintrc.json`
- `assets/templates/.jscpd.json`
- `assets/templates/.jscpd.tests.json`
- `assets/templates/knip.json`

Script/Makefile expectations:
- Provide both `lint` (auto-fix) and `lint-dry` (check-only) pipelines.
- Route both through `make lint` and `make lint-dry`.
- Keep lint command targets as `.` and control scope only through lint config
  files (`dprint.json`, `.oxlintrc.json`, `.jscpd.json`,
  `.jscpd.tests.json`).
- When a repo has tests, prefer `jscpd:src` and `jscpd:tests` plus a combined
  `jscpd` script.
- When a repo has no tests, omit the test config and keep `jscpd` source-only.
- Do not add a separate `lint-fix` script. Default `lint` should fix.
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
- Moving lint scope control out of config files into script path arguments.
- Silently mixing test policy into runtime-source config instead of using
  explicit test config or test-specific overrides.
- Adding repo-specific file names or ignores to the shared templates.

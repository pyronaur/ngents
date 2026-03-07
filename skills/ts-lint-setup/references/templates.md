# Templates

Templates live in `assets/templates/`:
- `assets/templates/AGENTS.md`
- `assets/templates/dprint.json`
- `assets/templates/.oxlintrc.json`
- `assets/templates/.jscpd.json`
- `assets/templates/knip.json`

Script/Makefile expectations:
- Provide both `lint` (auto-fix) and `lint-dry` (check-only) pipelines.
- Route both through `make lint` and `make lint-dry`.
- Keep lint command targets as `.` and control scope only through lint config
  files (`dprint.json`, `.oxlintrc.json`, `.jscpd.json`).
- Do not add a separate `lint-fix` script. Default `lint` should fix.
- Never run `npm run lint` / `bun run lint` directly when a Makefile exists.

## Tweak Rules

Allowed tweaks:
- Update ignore patterns only for clearly generated artifacts.
- Update `knip.json` `entry` to real entry points.
- Adjust dprint `lineWidth` only if the repo already has a clear standard.
- Update dprint `includes`/`excludes` to cover the repo root while excluding known
  non-source files such as tests/tmp/compiled artifacts (do not use it to hide
  lint violations).
- Keep Oxlint type-aware wiring intact when type-aware rules are enabled.

Disallowed tweaks without user approval:
- Raising duplication thresholds.
- Disabling or silencing lint rules.
- Adding exclusions to hide lint violations.
- Removing `--type-aware` or `oxlint-tsgolint` when type-aware rules are
  enabled.
- Moving lint scope control out of config files into script path arguments.
- Adding repo-specific file names or ignores to the shared templates.

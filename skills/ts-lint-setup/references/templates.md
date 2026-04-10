# Templates

Templates live in `assets/templates/`:
- `assets/templates/dprint.json`
- `assets/templates/.oxlintrc.json`
- `assets/templates/.jscpd.json`
- `assets/templates/.jscpd.tests.json`
- `assets/templates/knip.json`

Gatefile expectations:
- Provide Gatefile-owned lint routing; agents should run `gate`.
- Consult `$gatefile` before changing `.gatefile.json5`.
- Expose a normal lint gate key when the repo needs a lint-only validation path
  during setup.
- Prefer running concrete lint commands directly in Gatefile.
- Put lint edge-case operator guidance on the failing lint gate via a run
  object `guidance` footer, not in AGENTS prose.
- Only use an existing repo entrypoint when it is already the real
  source-of-truth command for that proof, not a wrapper added just for
  Gatefile.
- Keep lint command targets as `.` and control scope only through lint config
  files (`dprint.json`, `.oxlintrc.json`, `.jscpd.json`,
  `.jscpd.tests.json`).
- Build one selector per gate. Do not reuse one broad match list across
  multiple lint gates.
- Match only files whose changed content can change that exact gate's result on
  the next `gate` run.
- Do not include package manifests or lockfiles in a gate match unless the gate
  command reads them directly on that run or the gate itself performs the
  install step that materializes their effect.
- Use simple gate keys without redundant package prefixes unless disambiguation
  is truly necessary.
- Use human-readable gate names that describe what the gate actually does and
  what subject it applies to.
- Do not add custom lint orchestrators such as `.lint/run.ts`.
- Do not add `make`-based lint wrappers.

Comparison rule:
- Report meaningful config deltas only: rule presence, rule values, rule
  messages, thresholds, and source/test coverage intent.
- Do not treat path names, repo layout, config placement, or equivalent globs
  as noteworthy by themselves.

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
- Keep `eslint/no-unused-vars: ["error", { "args": "after-used", "vars": "all", "caughtErrors": "all" }]`.
- Do not add unused-binding ignore-pattern escapes unless the user explicitly
  approves a real exception.

Lint-failure guidance pattern:

```json5
run: {
  label: 'TypeScript lint',
  cmd: 'npm exec -- oxlint --type-aware .',
  guidance: [
    'If addressing these lints would require unreasonable or hacky workarounds, stop and write a brief problem description to the user.',
    'Exceptions are rare and reserved for edge cases where no truly clean solution exists.',
  ],
}
```

Disallowed tweaks without user approval:
- Raising duplication thresholds.
- Disabling or silencing lint rules.
- Adding underscore-name or ignore-pattern escapes for unused bindings.
- Adding exclusions to hide lint violations.
- Removing `--type-aware` or `oxlint-tsgolint` when type-aware rules are
  enabled.
- Moving lint scope control out of config files into script path arguments.
- Silently mixing test policy into runtime-source config instead of using
  explicit test config or test-specific overrides.
- Adding repo-specific file names or ignores to the shared templates.

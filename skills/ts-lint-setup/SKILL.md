---
name: ts-lint-setup
description: Set up, review, or update strict TypeScript/JavaScript linting with Oxlint, dprint, jscpd, Dupehound, Knip, and Gatefile.
disable-model-invocation: true
---

# TS Lint Setup
This skill provides the shared baseline for strict TypeScript/JavaScript linting. Use it as a guide to policy and coverage, then fit the files, globs, entries, and config placement to the project.
Use `references/configuration.md` to distinguish policy changes from equivalent project-layout changes.

## Set up or update
A practical sequence:
1. Inspect the package manager, existing TypeScript version, source and test layout, generated output, lint config, package scripts, Gatefile, and local trunk branch.
2. Install or upgrade the lint packages through the project package manager.
3. Copy the relevant assets for a new setup; merge them with existing config during an update.
4. Adapt project-specific paths, globs, entries, ignores, and config placement with `references/configuration.md`.
5. Adapt `assets/templates/.gatefile.json5` to the project’s Gatefile conventions.
6. Run the chosen Gatefile path and distinguish policy differences from existing code findings.

During an update, compare the existing config with the assets by meaning. Keep the project’s layout and compatible project-specific checks. Update scripts, CI, docs, or agent instructions when they call a command that changed.

A review uses the same comparison and verification without installing packages or editing files.

## Packages
Install or upgrade:
- `dprint`
- `oxlint`
- `oxlint-tsgolint`
- `oxlint-plugin-inhuman`
- `oxlint-plugin-complexity`
- `jscpd`
- `knip`

Let the project package manager and dependency policy choose releases.
Keep the project’s TypeScript dependency; add `typescript` when the project does not have one.

The setup assumes the system `dupehound` command exists on `PATH`; it is not a project package.

## Coverage
Start with the project’s real TypeScript/JavaScript files, then group them by responsibility:
- shipped source
- tests
- development scripts and small utilities
- project-specific groups that need distinct treatment

Tests can use separate config or overrides when that improves the signal. Keep the separation explicit.

Keep temporary files, weak sources such as JSON, dependencies, and compiled output outside this policy. In a multi-language repository, leave unrelated languages alone.

Inventory the extensions used by authored TypeScript/JavaScript files before adapting templates. Treat asset extension lists as candidates; copied config contains only extensions present in the project.

Put one project’s filenames, entries, and generated paths in its copied config rather than the shared assets. Account for every authored TypeScript/JavaScript file in the intended lint bucket unless the user accepts a documented exception.

## Gatefile
Gatefile owns lint routing and decides when each proof runs from the diff. The included asset covers the common setup; read `$gatefile` when the project needs a different integration.
See the Gatefile section in `references/configuration.md` for command, selector, and mutation guidance.

## Verify
Run the project’s normal Gatefile path:
```bash
gate
```

When the project exposes a lint-only gate, a targeted run can prove its wiring:
```bash
gate run <lint-key>
```

Confirm that each command scans the intended files.

Existing projects may fail on code findings. Report those findings without changing policy to make the run pass.

## Keep the baseline intact
- do not weaken or disable shared lint rules without user approval
- do not add exclusions to hide findings
- do not raise source or test duplication thresholds
- keep test and runtime-source policy explicit
- prefer reviewable config and routing changes before any requested auto-fix

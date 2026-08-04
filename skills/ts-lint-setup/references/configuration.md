# Adapting the configuration
The assets contain the executable policy: rules, options, messages, thresholds, plugins, and formatter values.
This guide explains how to fit that policy to a project and why the less obvious parts exist.

## Existing configuration
Merge the baseline with useful project-specific checks and plugins. Preserve additions that do not weaken shared policy or remove files from its intended scope.

Report differences that change behavior:
- added or missing rules
- changed options or messages
- changed duplication policy
- changed formatter/linter coverage
- changed source/test treatment

Treat equivalent paths, globs, config locations, and file splits as project layout rather than policy drift.

## Extension globs
Derive the project extension set from its authored files. Use that set in dprint includes, Oxlint file globs, and Gatefile selectors.
Asset globs list supported candidates; adaptation removes absent extensions.

## dprint
`assets/templates/dprint.json` owns formatter behavior.
Adapt its includes and excludes to the project’s real source and test layout. Generated output, dependencies, and temporary files stay outside formatting scope.
Keep an established project line width when it differs from the template.

## Oxlint
`assets/templates/.oxlintrc.json` owns plugins, rules, options, messages, and test overrides.
Keep `oxlint-tsgolint` with the type-aware Oxlint run. It supplies the type-aware rules; installing Oxlint alone does not.

Adapt source and test globs to forms that exist in the project. Tests inherit the shared policy, then use the test override where suite structure needs different limits.
The built-in function-size rule counts suite callbacks as ordinary functions. The inhuman rule can distinguish tests, helpers, and suite containers, which lets test functions stay small without treating a large suite container as one test.

Both complexity checks apply: the ordinary rule supplies the familiar baseline, while the inhuman plugin adds context-aware checks.

Assertion rules keep `as const` available while exposing casts and non-null assertions that can hide type risk.

Unused-binding ignore patterns create a silent escape from dead-code checks, so add one only for a user-approved exception.

### Why the guardrails exist
- Size and complexity limits keep files and functions reviewable and expose code that mixes responsibilities.
- Depth, callback, guard-clause, `else`, and `switch` checks keep the main path visible.
- Catch, wrapper, alias, and single-use-helper checks surface swallowed errors and indirection that hides ownership.
- Import and barrel checks keep dependencies and exports close to their definitions.
- Cleanup rules remove constructs that add noise without behavior.
- Restricted-type and assertion rules favor specific shapes, explicit call signatures, and validated external data.

## jscpd
Profiles:
- `assets/templates/.jscpd.json`: runtime source
- `assets/templates/.jscpd.tests.json`: tests
- `assets/templates/.jscpd.schemas.json`: runtime schemas

Adapt each profile’s scan path to the project. Passing a config filename gives jscpd settings, not scan paths, so confirm the command reports files from the intended scope.
Keep `mode` set to `weak` so comments cannot hide code clones.

Source and test clones multiply maintenance and let equivalent code drift. Both profiles accept no reported clone. The test profile starts detection later so short setup and assertion patterns do not dominate the result.

### Runtime schemas
Runtime schemas are executable contracts built with libraries such as Zod, Effect Schema, or TypeBox.
Keep schemas in dedicated files and give them their own duplication check. Schema declarations repeat field names, wrappers, and small contract shapes by design; their profile looks for short structural clones while allowing a small aggregate amount of that repetition.

Adapt schema paths and patterns only when the project has schema files. When schemas live below a source scan root, exclude that project path from the source profile so the profiles do not count the same files.

Tests can live in dedicated directories, beside source, or both. Use paths and patterns that match the project instead of adding framework conventions in advance.

## Dupehound
Dupehound owns structural duplication involving functions touched by the committed branch. jscpd remains the current-tree source, test, and schema clone check.

The template compares committed `HEAD` with the local trunk and expands touched functions to their clone families. Its catch-all clean/dirty selector reflects that Git-history input rather than a path-routed dirty set.

Adapt the base revision when the project’s local trunk is not `main`. Dupehound scans every supported language below the command path, so this gate is repository-wide in a multi-language project.

## Knip
`assets/templates/knip.json` defines the shipped-runtime reachability boundary.
Keep entries limited to real production entry points and project globs limited to runtime source. A broad tsconfig can include tests and development files, which can make dead runtime code appear reachable.

Test-only use does not make code part of the shipped runtime. Keep helper-only test surfaces explicit rather than letting tests define production reachability.

In Knip patterns, trailing `!` marks a production pattern. Leading `!` excludes matches; a production-only exclusion uses both markers.

Knip suppresses configuration hints in production mode. Use a normal run when you need those hints while adapting globs.

## Gatefile
`assets/templates/.gatefile.json5` provides a complete common integration. Adapt gate names, selectors, working directories, config locations, and optional steps to the project.

Prefer direct tool commands. Reuse an existing project command when it already owns the same proof; avoid wrappers created only for Gatefile.

Each selector should describe the files whose changed contents can alter that command’s result. Build one selector per gate.

Include a package manifest when the command reads it; Knip does. Leave out lockfiles and invocation wrappers that only launch the command.

Gate selectors use repository-root paths. Commands and config paths resolve from the gate’s working directory.

Keep intentional mutating gates when the project uses them, and validate their chosen behavior.

Put operator guidance on the failing Gatefile step. Keep lint scope in tool config instead of AGENTS prose.

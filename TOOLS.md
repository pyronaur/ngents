# TOOLS.md

Portable tool catalog for `~/.ngents`.

- Keep machine-specific paths/accounts/secrets out of this file.
- If a tool is host-only, document it in `~/.nconf/docs/hosts/`.

## trash

Recoverable delete policy.

- Use `trash …` instead of raw `rm` by default.
- Use raw `rm` only when explicitly requested.

## gh

GitHub CLI for PR/issues/actions/release checks.

- Use `gh help` for command discovery.
- Prefer `gh` over browser scraping for GitHub URLs.
- CI triage baseline: `gh run list`, `gh run view <id>`.

## xcp

Xcode project/workspace helper.

- Use `xcp --help`.
- Common jobs: targets, groups, files, build settings, assets.

## xcodegen

Generate Xcode projects from YAML specs.

- Use `xcodegen --help`.

## axe

Simulator UI automation helper.

- Use `axe list-simulators` to discover devices.
- Common actions: `describe-ui`, `tap`, `type`, hardware button actions.

## oracle

Bundle prompt + files for second-model review.

- Use when stuck, for design checks, or bug cross-validation.
- Run `oracle --help` once per session before first use.

## mcporter

MCP server launcher/caller.

- Prefer persisted home config servers over one-off long flags.
- Prefer short selectors like `server.tool`.
- Examples:
  - `mcporter call exa.web_search_exa ...`
  - `mcporter call xcodebuild.list_sims`

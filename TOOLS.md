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

## k browser

Browser-backed web fetch for JS-heavy pages.

- Prefer `k browser` when normal fetch/search hits a JavaScript wall.
- Firecrawl via `mcporter` is fallback only, used when `k browser` fails.
- Keep repo docs portable: do not add internal hosts or endpoint details.
- Golden paths:
  - `k browser <url>`
  - `k browser <url> --markdown`
  - `k browser --help`

## mcporter

Single MCP path for this repo.

- Policy:
  - no Codex MCP servers
  - use `mcporter` only
  - prefer local configured servers + `server.tool` selectors

- Workflow:
  - list local servers: `mcporter list`
  - view local config detail: `mcporter config list --json`
  - inspect a server’s tools/schema: `mcporter list <server> --schema`
  - call a tool: `mcporter call <server.tool> key=value`
  - use function-call syntax when clearer: `mcporter call '<server.tool>(arg: "value")'`
  - prefer machine-readable output for scripts: `--output json`
  - auth when needed: `mcporter auth <server>`

- Quick local examples:
  - `mcporter call exa.web_search_exa query="OpenAI URL" numResults=1`
  - `mcporter call xcodebuild.list_sims`

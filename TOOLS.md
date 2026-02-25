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

## zoxide

Directory matcher; search without navigation.

- Use `zoxide query <term>` for top match path.
- Use `zoxide query -l <term>` to list matches.
- Use `zoxide query -l -s <term>` to include scores.
- Use `zoxide query -l --base-dir <path> <term>` to scope search.
- `query` prints paths only; no directory change.

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

## kpw

Session-safe Playwright wrapper for web browsing and extraction.

- Fast one-off extraction (auto cleanup):
  - `kpw read <url> --markdown`
  - `kpw read <url> --selector="main article" --markdown`
- Sticky session flow (reused tab by default):
  - `kpw session status`
  - `kpw session start`
  - `kpw session open <url>`
  - `kpw -- tab-list`
  - `kpw session end`
- Use forward mode for direct Playwright actions:
  - `kpw -- tab-list`
  - `kpw -- snapshot`
- Notes:
  - `kpw session status` is read-only; it does not create a session.
  - `kpw session open` requires an active sticky session.
  - `kpw -- open <url>` is blocked; use `kpw session open <url>` or `kpw read`.
  - temp sessions auto-clean after 5 minutes; sticky sessions auto-clean after 24 hours idle.
- Keep repo docs portable: do not add internal hosts or endpoint details.

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

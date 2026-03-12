---
summary: "Authoritative machine-wide guide for the local CDP Chrome session used with Playwright."
read_when:
  - Need to start, stop, or inspect the local Chrome CDP session.
  - Need the single source of authority for the shared local Playwright browser profile.
  - Need the config file path or schema for the local CDP browser.
---

# Local CDP Browser

This document is the tracked source of authority for the machine-wide local CDP Chrome session.

## Commands

Use the `cdp` namespace:

```bash
cdp status
cdp start
cdp stop
```

These commands read machine-local settings from `~/.ngents/local/cdp.json`.

## One-Time Setup

Link the skill-local scripts into Bunmagic v2:

```bash
bmt link ~/.ngents/skills/browser-local/scripts --ns cdp
bmt reload --force
```

Verification:

```bash
bmt which cdp start
bmt which cdp status
bmt which cdp stop
```

## Config

Machine-local config lives in:

```bash
~/.ngents/local/cdp.json
```

Schema:

```json
{
  "chromeApp": "Google Chrome",
  "profilePath": "/absolute/path/to/profile",
  "cdpEndpoint": "http://127.0.0.1:46222",
  "extraArgs": ["--no-first-run", "--no-default-browser-check"]
}
```

Rules:

- `chromeApp`: macOS app name passed to `open -na`.
- `profilePath`: Chrome `--user-data-dir`.
- `cdpEndpoint`: local HTTP CDP endpoint with explicit port.
- `extraArgs`: optional extra Chrome flags.

Use `NGENTS_CDP_CONFIG=/path/to/cdp.json` to override the config path for testing.

## Expected Behavior

- `cdp status`
  - exit `0` when the configured endpoint is healthy
  - exit `1` when nothing is listening on the configured port
  - exit `2` when the port is occupied but the endpoint is not valid CDP
  - exit `3` for config errors
- `cdp start`
  - starts Chrome with the configured profile and remote-debugging port
  - exits `0` if the session is already healthy
  - refuses to start if another process already owns the configured port
- `cdp stop`
  - stops the configured listener if it matches the expected profile/port process
  - exits `0` when already stopped
  - refuses to kill an unrelated listener on the configured port

## Playwright Usage

Repo-specific browser docs may add repo-specific safety rules.
They must not redefine the machine-level profile path, CDP port, or Chrome launch contract.

Preferred attach order:

1. Run `cdp status`.
2. Run `cdp start` if needed.
3. Use the repo-local Playwright config if the repo provides one.
4. Fall back to the configured CDP endpoint when no repo-local browser contract exists.

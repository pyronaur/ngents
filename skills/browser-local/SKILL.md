---
name: browser-local
description: Start, inspect, and stop the machine-wide local Chrome CDP session and attach Playwright safely. Use when a task needs the shared local browser profile, the `cdp start|status|stop` commands, local CDP endpoint details, or machine-wide browser guidance before applying repo-specific Playwright rules.
---

# Browser Local

Use this skill for the machine-wide browser contract only.
Keep repo-specific browser rules in the repo that owns them.

## Workflow

1. Read [cdp.md](/Users/n14/.ngents/docs/browser/cdp.md) when you need the authoritative machine-wide contract.
2. Run `cdp status`.
3. If the session is stopped, run `cdp start`.
4. If a repo provides its own Playwright config or browser workflow, follow that after the CDP session is healthy.
5. Run `cdp stop` only when the user explicitly wants the shared browser session stopped.

## Rules

- Treat `~/.ngents/docs/browser/cdp.md` as the tracked source of authority.
- Treat `~/.ngents/local/cdp.json` as the machine-local config source of truth.
- Prefer repo-local Playwright config when a repo provides one.
- Do not restate or fork the machine-level profile path or CDP port in repo docs.
- Do not close the shared browser session unless the user asked.
- If `cdp status` reports `listener-conflict`, stop and diagnose the port owner before running browser automation.

## Commands

- `cdp status`: inspect config, port ownership, and CDP health.
- `cdp start`: launch Chrome with the configured profile and CDP port.
- `cdp stop`: stop only the expected listener for the configured profile/port.

The command implementations live in `scripts/`.

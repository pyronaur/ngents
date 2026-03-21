---
summary: "Shared browser contract: `cdp` owns the ngents Chrome and keeps personal Chrome available."
read_when:
  - Need the shared browser contract on this machine.
  - Need to start, stop, inspect, or attach to the shared browser.
---

# Shared Browser Contract

This machine uses one shared Chrome session for automation and one personal Chrome session for normal browsing.
`cdp` owns the shared automation browser.
`~/.ngents/local/cdp.json` tells `cdp` how to launch and find it.
Plain `agent-browser` connects to the live shared browser through the configured CDP port.
`cdp start` and `cdp status` refresh that `agent-browser` connection automatically.
`cdp start` and `cdp status` also ensure a personal Chrome app instance is open with Chrome's standard user-data root and Chrome's recorded last-used personal profile.

## Ownership

- The shared browser session is the browser source of truth.
- `cdp` owns browser lifecycle.
- `~/.ngents/local/cdp.json` configures `cdp`.
- Plain `agent-browser` is the default browser-control CLI against the shared browser.
- `agent-browser` attaches to the browser that `cdp` owns; it does not define a separate browser runtime.
- `cdp` keeps a separate personal Chrome app instance available, but that personal browser does not expose the shared CDP endpoint.

## `cdp` Owns Browser Launch

`cdp` reads:

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

This file chooses:

- which Chrome app to run
- which Chrome user-data-dir the shared browser uses
- which CDP endpoint that browser exposes
- which extra Chrome launch flags are passed

`NGENTS_CDP_CONFIG=/path/to/cdp.json` only changes which config file `cdp` reads.
It does not configure `agent-browser`.

## `agent-browser` Owns Browser Control

Use plain `agent-browser` after `cdp start` or `cdp status`.

Examples:

```bash
agent-browser tab
agent-browser get url
agent-browser snapshot -i
agent-browser get text body
```

`cdp start` and `cdp status` run `agent-browser connect <port>` against the configured shared-browser port, so plain `agent-browser` commands target the live shared browser without extra flags.

## Operate The Shared Browser With `cdp`

Use:

```bash
cdp status
cdp start
cdp stop
```

- `cdp status` shows the configured browser, user-data-dir, endpoint, and session health.
- `cdp status` repairs the stack by ensuring personal Chrome is open, starting the shared browser if needed, and refreshing the `agent-browser` connection.
- `cdp start` ensures personal Chrome is open, starts the shared browser if needed, and refreshes the `agent-browser` connection.
- `cdp stop` stops the shared browser session.

## Use It In This Order

1. Run `cdp status`.
2. Run `cdp start` if the browser is stopped.
3. Use plain `agent-browser` for browser control against the shared browser while personal browsing stays in the separate personal Chrome app instance.

Repo docs may add repo-specific workflow, but they must not redefine the shared browser user-data-dir or endpoint.

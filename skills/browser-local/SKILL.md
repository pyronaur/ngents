---
name: browser-local
description: Apply the shared local browser contract on this machine before using repo-specific browser workflows.
---

# Browser Local

Use this skill when a task needs the shared local browser on this machine.

Read [cdp.md](/Users/n14/.ngents/docs/browser/cdp.md) for the actual browser contract.

## Do This

1. Run `cdp status`.
2. Run `cdp start` if the shared browser is stopped.
3. Use plain `agent-browser` for browser control against the shared browser.

## Boundaries

- `cdp` owns the shared browser process.
- `~/.ngents/local/cdp.json` configures `cdp`.
- Do not stop the shared browser unless the user asked.

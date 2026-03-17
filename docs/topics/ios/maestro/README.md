---
summary: Local map for the imported Maestro docs subset under the iOS topic.
read_when:
  - Need to know whether Maestro publishes Markdown docs and where they come from.
  - Need the local entrypoint for the imported Maestro docs subset.
---

# Maestro

This directory vendors the official Maestro iOS platform docs plus the Maestro CLI reference that is relevant to iOS testing.

## Source of truth

- Published docs: <https://docs.maestro.dev>
- Docs repo: <https://github.com/mobile-dev-inc/maestro-docs>
- LLMS index: <https://docs.maestro.dev/llms.txt>
- Pinned upstream commit for this import: `b8763944987d312b4cfe9ca9b5c3ecf756df3b77`

## Local layout

- `references/ios.md`: the upstream iOS platform doc.
- `references/swiftui.md`: the upstream SwiftUI doc.
- `references/uikit.md`: the upstream UIKit doc.
- `references/cli-overview.md`: CLI overview.
- `references/cli-install.md`: CLI install guide.
- `references/cli-update.md`: CLI update guide.
- `references/cli-commands-and-options.md`: CLI flags and subcommands.
- `references/cli-environment-variables.md`: CLI environment variables.
- `references/cli-specify-and-start-devices.md`: iOS simulator/device targeting and `start-device` usage.
- `references/api-reference/`: the upstream Maestro API reference relevant to iOS testing, including commands, selectors, and workspace configuration.

## Refresh

Run:

```bash
./import.sh
```

To refresh against the latest upstream default branch instead of the pinned commit:

```bash
UPSTREAM_REF=main ./import.sh
```

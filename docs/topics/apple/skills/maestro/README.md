---
summary: Local map for the Maestro skill docs and the remaining imported platform and CLI references.
read_when:
  - Need the local entrypoint for Maestro docs.
  - Need to know which local Maestro docs path is canonical.
  - Need the remaining imported platform or CLI references.
---

# Maestro

This directory is the Maestro skill entrypoint.

The canonical local official Maestro docs bundle lives under `docs topic apple testing/maestro`.

This skill directory keeps only the remaining imported iOS platform and CLI references that are not part of that bundle.

## Source of truth

- Published docs: <https://docs.maestro.dev>
- Docs repo: <https://github.com/mobile-dev-inc/maestro-docs>
- LLMS index: <https://docs.maestro.dev/llms.txt>

## Local layout

- Canonical official docs bundle: `~/.n/local/docs/topics/apple/testing/maestro/`
- `references/ios.md`: the upstream iOS platform doc.
- `references/swiftui.md`: the upstream SwiftUI doc.
- `references/uikit.md`: the upstream UIKit doc.
- `references/cli-overview.md`: CLI overview.
- `references/cli-install.md`: CLI install guide.
- `references/cli-update.md`: CLI update guide.
- `references/cli-commands-and-options.md`: CLI flags and subcommands.
- `references/cli-environment-variables.md`: CLI environment variables.
- `references/cli-specify-and-start-devices.md`: iOS simulator/device targeting and `start-device` usage.

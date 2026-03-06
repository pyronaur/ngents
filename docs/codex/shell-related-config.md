---
summary: "Shell-related Codex config reference: config file location, trust rules, profiles, and shell feature flags"
read_when:
  - Need to know where Codex reads config.toml from.
  - Need to understand project-scoped Codex config and trust behavior.
  - Need the shell-adjacent config keys outside shell_environment_policy.
---

# Shell-Related Codex Config

Source:
- https://developers.openai.com/codex/config-reference/#configtoml
- https://developers.openai.com/codex/cli/features/#tips-and-shortcuts

## Config Locations

User-level config lives at:

```toml
~/.codex/config.toml
```

Project-scoped overrides can live at:

```toml
.codex/config.toml
```

Codex only loads project-scoped config for trusted projects.

## Shell-Relevant Keys

`allow_login_shell`
- Allows shell-based tools to use login-shell semantics.
- The docs say it defaults to `true`.

`shell_environment_policy.*`
- Main control surface for subprocess environment inheritance and filtering.

`profile`
- Default profile applied at startup.

`profiles.<name>.*`
- Profile-scoped overrides for supported config keys.

`features.shell_tool`
- Enables the default shell tool for running commands.
- Documented as stable and on by default.

`features.shell_snapshot`
- Snapshots shell environment to speed up repeated commands.
- Documented as beta.

## CLI Override Path

The local `codex --help` output documents inline config overrides with `-c` / `--config`.

Example:

```sh
codex -c shell_environment_policy.inherit=all
```

## Environment Setup Guidance

The Codex CLI features doc says to make sure the environment is already set up before launching Codex so it does not spend time figuring out what to activate. That guidance applies to:

- virtual environments
- language toolchains
- required daemons
- expected environment variables

## Practical Use

- Put stable personal defaults in `~/.codex/config.toml`.
- Use `.codex/config.toml` only for repo-specific behavior you want applied in trusted projects.
- Use profiles when you want named environment modes instead of one global shell policy.

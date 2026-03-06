---
summary: "Codex shell environment policy reference: inheritance, whitelisting, overrides, and profile loading"
read_when:
  - Need to control which environment variables Codex passes to subprocesses.
  - Need to make Codex shell commands match local shell setup without leaking too much environment.
  - Need the documented meaning of inherit, include_only, exclude, set, or experimental_use_profile.
---

# Codex Shell Environment Policy

Source:
- https://developers.openai.com/codex/config-advanced/#shell-environment-policy
- https://developers.openai.com/codex/config-reference/#configtoml

## Scope

`shell_environment_policy` controls which environment variables Codex passes to subprocesses it launches.

The official docs recommend starting from either:
- `inherit = "none"` for a clean baseline
- `inherit = "core"` for a trimmed baseline

Then layer on filters and explicit overrides.

## Keys

`shell_environment_policy.inherit`
- Baseline environment inheritance.
- Allowed values: `all`, `core`, `none`.

`shell_environment_policy.set`
- Explicit environment variables injected into every subprocess.

`shell_environment_policy.exclude`
- Case-insensitive glob patterns removed after the baseline is assembled.

`shell_environment_policy.include_only`
- Case-insensitive glob whitelist.
- When set, only matching variables are kept.

`shell_environment_policy.ignore_default_excludes`
- Controls whether Codex keeps the automatic filtering for env vars containing names like `KEY`, `SECRET`, and `TOKEN`.
- `false` keeps the default secret filtering in place.

`shell_environment_policy.experimental_use_profile`
- Tells Codex to use the user shell profile when spawning subprocesses.

## Matching Rules

- Patterns are case-insensitive globs.
- Supported glob syntax includes `*`, `?`, and character ranges like `[A-Z]`.

## Example

```toml
[shell_environment_policy]
inherit = "none"
set = { PATH = "/usr/bin", MY_FLAG = "1" }
ignore_default_excludes = false
exclude = ["AWS_*", "AZURE_*"]
include_only = ["PATH", "HOME"]
```

## Practical Guidance

- Use `inherit = "core"` when you want a safer default and let your shell profile rebuild the useful environment.
- Use `include_only` when you need a predictable allowlist.
- Use `set` for small, intentional overrides such as `NCONF_MINIMAL = "1"` or a fixed `EDITOR`.
- Keep `ignore_default_excludes = false` unless you have a strong reason to forward secret-like variables.

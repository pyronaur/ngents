---
summary: "Codex customization: local overrides and payload validation"
read_when:
  - Need to quickly see what Codex is customized to use on this machine.
  - Need to validate the active base instructions in a session payload.
---

# Codex Customization

## Customized State

- Runtime home: `~/.agents`
- System prompt file: `~/.ngents/SYSTEM_PROMPT.md`
- Runtime config file: `~/.agents/config.toml`
- Active override key:
  - `model_instructions_file = "/Users/n14/.ngents/SYSTEM_PROMPT.md"`

## Payload Validation

```bash
ROLL=$(ls -t ~/.agents/sessions/*/*/*/rollout-*.jsonl | head -n 1)

# Effective base instructions source + path:
jq -r 'select(.type=="session_meta") | .payload.base_instructions | {source, path}' "$ROLL"

# Optional preview:
jq -r 'select(.type=="session_meta") | .payload.base_instructions.text' "$ROLL" | sed -n '1,40p'
```

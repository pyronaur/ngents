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
- Active override key: none
- Disabled override in config:
  - `# model_instructions_file = "/Users/n14/.ngents/SYSTEM_PROMPT.md"`

## Writer Profile Layout

- Writer runtime/state home: `~/.agents/profiles/writer`
- Writer runtime config: `~/.agents/profiles/writer/config.toml`
- Writer AGENTS symlink: `~/.agents/profiles/writer/AGENTS.md -> ~/.ngents/profiles/writer/AGENTS.md`
- Writer auth link: `~/.agents/profiles/writer/auth.json -> ~/.agents/auth.json`
- Writer instruction source: `~/.ngents/profiles/writer/SYSTEM.md`

## Payload Validation

```bash
ROLL=$(ls -t ~/.agents/sessions/*/*/*/rollout-*.jsonl | head -n 1)

# Effective base instructions source + path:
jq -r 'select(.type=="session_meta") | .payload.base_instructions | {source, path}' "$ROLL"

# Optional preview:
jq -r 'select(.type=="session_meta") | .payload.base_instructions.text' "$ROLL" | sed -n '1,40p'
```

```bash
WRITER_ROLL=$(ls -t ~/.agents/profiles/writer/sessions/*/*/*/rollout-*.jsonl | head -n 1)

# Writer AGENTS payload:
jq -r 'select(.type=="turn_context") | .payload.user_instructions' "$WRITER_ROLL" | sed -n '1,40p'

# Writer system prompt preview:
jq -r 'select(.type=="session_meta") | .payload.base_instructions.text' "$WRITER_ROLL" | sed -n '1,40p'
```

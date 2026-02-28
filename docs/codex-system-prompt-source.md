---
summary: "Codex prompt configuration: what you can configure and where original/default prompt values come from"
read_when:
  - Need a concise guide to configurable prompt knobs only.
  - Need to find original/default text for base instructions or personality.
  - Need to confirm what cannot be customized from config.
---

# Codex Prompt Configuration

## TL;DR

- You can directly configure:
  - base instructions (`model_instructions_file`)
  - extra developer instructions (`developer_instructions`)
  - personality mode (`personality`)
  - AGENTS instruction files (`AGENTS.override.md` / `AGENTS.md`)
- `model_instructions_file` only overrides base `instructions` text.
- Other injected wrappers/sections are built-in behavior and not fully free-text configurable via normal config.

## Payload Visual Map

Legend:

- `[C]` fully configurable text/value
- `[M]` behavior configurable, but text is mostly built-in
- `[N]` not free-text configurable from normal config

```text
responses_request
├─ instructions [C]
│  └─ base instructions text
│     (from model_instructions_file override or model defaults)
└─ input
   ├─ developer message
   │  ├─ permissions block [M]
   │  ├─ developer_instructions [C]
   │  ├─ personality application [M]
   │  └─ built-in wrappers/tags [N]
   ├─ contextual user message
   │  ├─ AGENTS content [C]
   │  └─ built-in wrappers/tags [N]
   └─ actual user turn content [C]
```

Notes:

- First payload usually includes full contextual injections.
- Later payloads may include either full context again or context-diff updates.

## What You Can Configure (And Original Values)

### 1) Base Instructions (`instructions`)

- Configure with: `model_instructions_file` (or runtime override).
- Your active override file: `~/.ngents/SYSTEM_PROMPT.md`.
- Original/default text sources:
  - model catalog text in `codex-rs/core/models.json` (`base_instructions` for the active model)
  - fallback prompt in `codex-rs/core/prompt.md`
  - mirror fallback in `codex-rs/protocol/src/prompts/base_instructions/default.md`

### 2) Developer Instructions (extra developer block)

- Configure with: `developer_instructions`.
- Original/default value: empty (nothing injected from this key unless you set it).

### 3) Personality

- Configure with: `personality` (`none`, `friendly`, `pragmatic`) and `features.personality`.
- Original/default behavior:
  - default personality is `pragmatic` when personality feature is enabled and no explicit value is set
  - personality text defaults come from model metadata in `codex-rs/core/models.json` (`model_messages`)

### 4) AGENTS Instructions

- Configure by editing:
  - `$CODEX_HOME/AGENTS.override.md` (preferred when present)
  - `$CODEX_HOME/AGENTS.md`
  - project `AGENTS.override.md` / `AGENTS.md` chain
- Optional discovery controls:
  - `project_doc_fallback_filenames`
  - `project_root_markers`
  - `project_doc_max_bytes`

## What You Cannot Fully Customize From Normal Config

- Built-in wrapper/tag structure around injected messages.
- Built-in formatting/templates for internal instruction wrappers.
- Exact text of several runtime-generated helper sections (unless you patch Codex source or use a custom build).

## Practical Precedence

For prompt-relevant config values (high to low):

1. runtime/session overrides (for example `-c key=value`)
2. trusted project/repo config
3. user config (`$CODEX_HOME/config.toml`)
4. system/admin/cloud requirement constraints

Then base instructions text resolves as:

1. configured base override (`model_instructions_file` / runtime override)
2. resumed thread saved base instructions
3. active model default text

## Check Effective Prompt Text In A Session

```bash
ROLL=$(ls -t ~/.codex/sessions/*/*/*/rollout-*.jsonl | head -n 1)

# Effective base instructions text:
jq -r 'select(.type=="session_meta") | .payload.base_instructions.text' "$ROLL"

# Developer/user injected message text:
jq -r 'select(.type=="response_item" and .payload.type=="message" and (.payload.role=="developer" or .payload.role=="user")) | .payload.role + " :: " + .payload.content[0].text' "$ROLL"
```

## Refresh Override File From Fallback Prompt

```bash
cp ~/Projects/Open-Source/codex/codex-rs/core/prompt.md ~/.ngents/SYSTEM_PROMPT.md
```

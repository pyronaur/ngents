---
title: Espanso Reference
short: Dense Espanso v2 syntax and options reference.
read_when:
  - Need a compact but authoritative Espanso match/config reference.
  - Writing or reviewing snippets, forms, regex triggers, variables, or app-specific configs.
  - Tuning Espanso behavior without re-reading the full upstream docs.
summary: "Schema-first Espanso v2 reference for match syntax, variable types, forms, and config options."
---

# Espanso Reference

Scope:
- Targets Espanso v2 syntax, including `espanso 2.3.x`.
- Upstream JSON schemas are the source of truth for accepted keys and value shapes.
- Official docs are the source of behavior semantics and caveats.
- Match files: `match/*.yml`; config files: `config/*.yml`.

## Fast Mental Model

- Espanso has two YAML domains:
- Match files define snippets and dynamic expansions.
- Config files define where expansions apply and how injection/search/forms behave.
- Core authoring loop:
1. Define matches in `match/*.yml`.
2. Optionally define `global_vars`.
3. Set global behavior in `config/default.yml`.
4. Add filtered config files for app-specific overrides.

## File Shapes

### Match files

Top-level keys:
- `$schema`: optional schema URL string.
- `imports`: array of match files to load.
- `anchors`: anchor declarations for anchors/aliases.
- `matches`: array of match objects.
- `global_vars`: array of reusable variable definitions.

Minimal shape:

```yaml
matches:
  - trigger: ":sig"
    replace: "Best,\nName"
```

### Config files

Top-level keys are peers in one object:
- Filters: `filter_title`, `filter_exec`, `filter_class`, `filter_os`
- Match loading: `includes`, `extra_includes`, `excludes`, `extra_excludes`
- Behavior/options: remaining config options (`backend`, `toggle_key`, `search_shortcut`, etc.)

Minimal shape:

```yaml
filter_exec: "Code"
enable: false
```

## Match Syntax Coverage

### Match object contract

A match object must contain exactly one content-producing family:
- `replace`
- `form`
- `html`
- `image_path`
- `markdown`

Common keys:
- `trigger`: one literal trigger string.
- `triggers`: multiple literal triggers for one match.
- `regex`: regex trigger (instead of literal trigger).
- `replace`: plain-text replacement (`string | null`).
- `vars`: local variables used by the match.
- `word`: require both left and right word boundaries.
- `left_word`: require only left/start word boundary.
- `right_word`: require only right/end word boundary.
- `propagate_case`: carry trigger casing into replacement.
- `uppercase_style`: `capitalize`, `capitalize_words`, `uppercase` (requires `propagate_case: true`).
- `force_mode`: `clipboard` or `keys` injection override.
- `force_clipboard`: legacy boolean clipboard override.
- `label`: search UI display label.
- `search_terms`: extra search keywords.
- `comment`: metadata/comment string.
- `anchor`: anchor/alias hook.

Literal vs regex:
- Prefer `trigger` for one literal trigger.
- Prefer `triggers` for multiple literals sharing one behavior.
- Use `regex` when literals/forms/choices cannot model input cleanly.

Combined literal match example:

```yaml
matches:
  - triggers: [":br", ":best"]
    replace: |
      Best regards,
      $|$
    word: true
    propagate_case: true
    uppercase_style: capitalize_words
    label: "Signoff"
    search_terms: ["signoff", "email", "closing"]
    force_mode: clipboard
```

### Plain text replacement

- `replace` accepts plain text.
- Example value: `replace: "¯\\_(ツ)_/¯"`.

### Multiline replacement

- Use YAML block scalars for multiline output.
- Example value: `replace: |` followed by multiline body.

### Cursor hint

- `$|$` sets cursor position after expansion.

### Multiple literal triggers

- `triggers` defines multiple literal triggers for one match.

### Word-boundary controls

- `word: true`: both boundaries required.
- `left_word: true`: left boundary only.
- `right_word: true`: right boundary only.

### Case propagation

- `propagate_case: true` enables case propagation.
- `uppercase_style`: `capitalize`, `capitalize_words`, `uppercase`.
- Behavior:
- typed `:greet` -> `hello world`
- typed `:Greet` -> style-dependent capitalized output
- typed `:GREET` -> uppercase output

### Search UI metadata

- `label`: search UI display label.
- `search_terms`: extra keywords for lookup.

### Per-match injection override

- `force_mode: clipboard | keys` overrides global mode per match.
- `force_clipboard` is the older boolean shortcut.

### Regex triggers

Rules:
- Use `regex:` instead of `trigger:`.
- Regex flavor is Rust regex (not PCRE).
- Named groups become variables.
- Regex matching costs more than literal triggers.
- `max_regex_buffer_size` limits recent input retained for regex matching.

Examples:

```yaml
matches:
  - regex: ":greet\\((?P<person>.*)\\)"
    replace: "Hello {{person}}"

  - regex: "=sum\\((?P<num1>.*?),(?P<num2>.*?)\\)"
    replace: "{{result}}"
    vars:
      - name: result
        type: shell
        params:
          cmd: "expr {{num1}} + {{num2}}"
```

### Replacement mode families

#### `replace`

- Plain text with variable interpolation.

#### `form`

- Shorthand form syntax.
- `form` layout is the replacement template.

#### `html`

- Rich-text/HTML payload.

#### `markdown`

- Markdown-to-rich-text payload.
- `paragraph: true` is valid only with `markdown`; it avoids adding an extra paragraph/newline wrapper.

#### `image_path`

- Inserts image from disk.

Combined family examples:

```yaml
matches:
  - trigger: ":now"
    replace: "Time: {{clock}}"
    vars:
      - name: clock
        type: date
        params:
          format: "%H:%M"

  - trigger: ":wrap"
    form: |
      <[[tag]]>

      $|$

      </[[tag]]>
    form_fields:
      tag:
        default: div

  - trigger: ":warn"
    html: "<strong>Warning</strong>"

  - trigger: ":mdsig"
    markdown: |
      **Thanks,**

      Name
    paragraph: true

  - trigger: ":logo"
    image_path: "/absolute/path/to/logo.png"
```

## Forms Coverage

- Two forms:
- Shorthand: `form` + `form_fields`
- Verbose: `type: form` variable in `vars`

### Shorthand form

- Best when form output is the final output.

```yaml
matches:
  - trigger: "::gag"
    form: |
      <[[tag]]>

      $|$

      </[[tag]]>
    form_fields:
      tag:
        default: mytag
```

### Verbose form

- Best when fields feed `replace`, `shell`, or `script`.

```yaml
matches:
  - trigger: ":email"
    replace: |
      To: {{form1.to}}
      Subject: {{form1.subject}}
    vars:
      - name: form1
        type: form
        params:
          layout: |
            To: [[to]]
            Subject: [[subject]]
          fields:
            to:
              default: team@example.com
            subject:
              default: Status update
```

### Form field shapes

Supported field options:
- Text field keys: `default`, `multiline`
- Choice/list field keys: `type`, `values`, `default`, `trim_string_values`

`values` accepts:
- array of strings
- multiline string

`trim_string_values: true` trims surrounding whitespace and drops empty entries when `values` is a multiline string.

Combined field example:

```yaml
field_text:
  default: "value"
  multiline: true

field_choice:
  type: choice
  values:
    - One
    - Two
  default: Two

field_list:
  type: list
  values: |
    One
    Two
  trim_string_values: true
```

## Variable Coverage

- Interpolation syntax: `{{name}}`.
- Definition placement:
- `global_vars`: shared reusable variables at match-file top level.
- `vars`: per-match local variables.
- Evaluation model:
- Local vars evaluate in order.
- `inject_vars: true` injects known variables into later vars and shell/script environments.
- `depends_on` declares explicit dependencies (especially useful for `global_vars`).

### Common variable keys

- `name`
- `type`
- `params`
- `inject_vars`
- `depends_on`

### `shell`

- Runs shell command; captures stdout.
- Params:
- `cmd`: command string
- `shell`: `bash`, `cmd`, `nu`, `powershell`, `pwsh`, `sh`, `wsl`, `wsl2`, `zsh`
- `trim`: trim trailing whitespace/newlines
- `debug`: include shell result in Espanso logs

### `script`

- Runs command/script via argv form.
- Params:
- `args`: command + argv list
- `trim`: trim script output

### `date`

- Params:
- `format`: strftime-like format
- `offset`: seconds offset (`number | string`)
- `tz`: IANA timezone
- `locale`: locale tag

### `echo`

- Params:
- `echo`: literal value

### `clipboard`

- Reads clipboard content.
- No `params` required.

### `choice`

- Shows chooser; returns selected `id`.
- Shape: `values` is an array of `{ label, id }`.

### `form`

- Verbose form variable type (same model as Forms Coverage).

### `random`

- Returns one random string from `choices`.

### `match`

- Executes another match by trigger and uses its output.

Combined variable examples:

```yaml
vars:
  - name: shell_out
    type: shell
    params:
      cmd: "echo hello"
      shell: zsh
      trim: true
      debug: false

  - name: script_out
    type: script
    params:
      args: [python3, /path/to/script.py, arg1]
      trim: true

  - name: today
    type: date
    params:
      format: "%Y-%m-%d"
      offset: 86400
      tz: "Europe/Riga"
      locale: "en-US"

  - name: literal
    type: echo
    params:
      echo: "hello"

  - name: clip
    type: clipboard

  - name: team
    type: choice
    params:
      values:
        - label: Design
          id: design
        - label: Engineering
          id: eng

  - name: form1
    type: form
    params:
      layout: "Tag: [[tag]]"
      fields:
        tag:
          default: div

  - name: emoji
    type: random
    params:
      choices: ["🙂", "😐", "🙃"]

  - name: signoff
    type: match
    params:
      trigger: ":sig"
```

## Match Loading and Organization

### `imports` in match files

- Loads other match files.
- Paths can be relative to current match file or absolute.

```yaml
imports:
  - "./emails.yml"
  - "/absolute/path/to/shared.yml"
```

### `includes` and `extra_includes` in config files

Include/exclude control keys:
- `extra_includes`: extends default includes
- `includes`: replaces default includes
- `extra_excludes`: extends default excludes
- `excludes`: replaces default excludes

Resolution + reload behavior:
- Relative paths in config include rules resolve from `config/`.
- Relative paths in match `imports` resolve from `match/`.
- External files are not auto-monitored; restart Espanso after editing them.

## Config and Options Reference

### Filter keys

Config applicability filters:
- `filter_title`: match current window title
- `filter_exec`: match executable path/name
- `filter_class`: match current window/app class
- `filter_os`: `linux`, `macos`, `windows`

Guidance:
- Prefer `filter_exec` or `filter_class`.
- Use `filter_title` only when title-specific behavior is intended.

### Include/exclude keys

- `includes`, `extra_includes`, `excludes`, `extra_excludes`
- `extra_*` extends defaults; non-`extra` replaces defaults.

### Keyboard layout override object

`keyboard_layout` object keys:
- `rules`
- `model`
- `layout`
- `variant`
- `options`

Mostly relevant on Wayland when auto-detection is incorrect.

### Full options list

#### Global/app activation and UI

- `enable`: boolean; disable Espanso for matching config scope.
- `auto_restart`: boolean; default `true`; restart worker and refresh after config changes.
- `show_icon`: boolean; show/hide status icon.
- `show_notifications`: boolean; enable/disable notifications.
- `toggle_key`: enum; `OFF`, `CTRL`, `ALT`, `SHIFT`, `META`, `LEFT_CTRL`, `LEFT_ALT`, `LEFT_SHIFT`, `LEFT_META`, `RIGHT_CTRL`, `RIGHT_ALT`, `RIGHT_SHIFT`, `RIGHT_META`.
- `search_shortcut`: string; hotkey opening search UI.
- `search_trigger`: string; typed trigger opening search UI.

#### Injection and clipboard behavior

- `backend`: `clipboard | inject | auto`; default `auto`.
- `clipboard_threshold`: number; default `100`; auto-mode clipboard switch threshold.
- `preserve_keyboard`: boolean; default `true`; preserve previous clipboard content after expansion.
- `paste_shortcut`: string; custom paste shortcut (example: `CTRL+SHIFT+V`).
- `paste_shortcut_event_delay`: number; default `10`.
- `pre_paste_delay`: number; default `300`.
- `restore_clipboard_delay`: number; default `300`.
- `inject_delay`: number; delay between injected text events.
- `key_delay`: number; delay between injected key events.
- `word_separators`: array of strings; custom word boundary characters.
- `backspace_limit`: number; default `5`; backspace history depth for typo correction/undo logic.
- `undo_backspace`: boolean; default `true`; allow backspace undo of just-applied expansion.

#### Forms and search timing

- `post_form_delay`: number; default `200`.
- `max_form_width`: number; default `700`.
- `max_form_height`: number; default `500`.
- `post_search_delay`: number; default `200`.

#### Regex behavior

- `max_regex_buffer_size`: number; default `50`; size of recent input buffer retained for regex matching.

#### Patches and platform compatibility

- `apply_patch`: boolean; default `true`; disable built-in app patches when they conflict with desired behavior.
- `emulate_alt_codes`: boolean; Windows-focused.
- `evdev_modifier_delay`: number; default `10`; Wayland EVDEV modifier delay.
- `disable_x11_fast_inject`: boolean; default `false`; Linux X11 only.
- `x11_use_xclip_backend`: boolean; default `false`; Linux X11 only.
- `x11_use_xdotool_backend`: boolean; default `false`; Linux X11 only.
- `win32_exclude_orphan_events`: boolean; default `true`.
- `win32_keyboard_layout_cache_interval`: number; default `2000`.

#### Misc platform/runtime

- `filter_title`
- `filter_exec`
- `filter_class`
- `filter_os`
- `keyboard_layout`

All are valid anywhere a config object is valid (including app-specific config files).

## Authoritative Patterns

### Best default shape for reusable literal snippets

```yaml
matches:
  - trigger: ":name"
    replace: "value"
```

### Best default shape for prompted templates

```yaml
matches:
  - trigger: ":template"
    replace: |
      <{{form1.tag}}>

      $|$

      </{{form1.tag}}>
    vars:
      - name: form1
        type: form
        params:
          layout: "Tag: [[tag]]"
          fields:
            tag:
              default: div
```

### Best default shape for app-specific behavior

```yaml
filter_exec: "Code"

extra_includes:
  - "../match/coding.yml"
```

### Best default shape for temporary per-app disable

```yaml
filter_title: "YouTube"
enable: false
```

## Boundaries and Caveats

- Prefer literal `trigger`/`triggers` over `regex` unless pattern capture is required.
- Prefer verbose `form` vars when form values feed other vars or shell/script logic.
- Files loaded externally via config `includes` or match `imports` are not auto-watched; restart Espanso after edits.
- App filters are platform-dependent; a `filter_exec`/`filter_class` rule may differ across OSes.
- Built-in patches can change expected behavior; `apply_patch: false` is the escape hatch.

## Upstream Sources

Official docs:
- `https://espanso.org/docs/matches/basics/`
- `https://espanso.org/docs/matches/extensions/`
- `https://espanso.org/docs/matches/forms/`
- `https://espanso.org/docs/matches/regex-triggers/`
- `https://espanso.org/docs/matches/variables/`
- `https://espanso.org/docs/configuration/basics/`
- `https://espanso.org/docs/configuration/app-specific-configurations/`
- `https://espanso.org/docs/configuration/include-and-exclude/`
- `https://espanso.org/docs/configuration/options/`

Schemas:
- `https://raw.githubusercontent.com/espanso/espanso/dev/schemas/match.schema.json`
- `https://raw.githubusercontent.com/espanso/espanso/dev/schemas/config.schema.json`

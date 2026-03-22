Usage: docs [options] [command]

# docs
docs organizes project local and global documentation optimized for information quality.

## Overview & Organization
- All topics & docs are kept in and organized in `docs` directories
- `docs` includes project documentation, notes, etc. It also includes global machine documentation, flows, patterns, available tools, etc.
- `docs/topics` includes larger organized sets of documentation within the given topic - useful to keep `docs` lean.
- `query` indexes everything in global `docs/**` for lookup when quick scan with `ls` and `topic` doesn't include promising results at a glance. `query` doesn't index project docs directory.

### Browse
docs <where>
{{ ls_usage }}

`docs <where>` accepts one non-command selector.
It may open a topic like `docs ios` or a docs view like `docs machine`.

`{{ ls_command }} [where]` browses docs only.

`[where]` may be:
- `.`
- `global`
- `docs/subdir` or `./docs/subdir`
- a registered docs root like `browser`
- a workspace path like `~/work/foo`
- an explicit docs path like `~/work/foo/docs`

Examples
docs ios
docs machine
{{ ls_command }} .
{{ ls_command }} docs/subdir

### Query
{{ query_usage }}

Use this to search through parked global docs collections with semantic search fast.
Returns matches optimized for quick context gathering with cat/sed followups.

## Topics
{{ topic_usage }}

Topics contain specialized docs, available anywhere.
Use `{{ topic_command }} <name>` to expand available docs for topic.
`{{ topic_command }} foo` - view foo about/index first
`{{ topic_command }} foo bar` - learn about bar section

{% if topic_lines.size == 0 %}
- [no topics found]
{% else %}
{{ topics_header }}
{% for topic_line in topic_lines -%}
{{ topic_line }}
{% endfor %}
{% endif %}

{% if show_docs_index %}

## Docs
{% for docs_group in docs_groups %}
### {{ docs_group.directory_path }}
{% for entry_line in docs_group.entry_lines -%}
{{ entry_line }}
{% endfor %}
{% unless forloop.last %}

{% endunless %}
{% endfor %}
{% endif %}

To read docs operation manual use `docs --ops-help`.

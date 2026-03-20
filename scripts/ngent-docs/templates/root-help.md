Usage: docs [options] [command]

# docs
docs organizes project local and global documentation optimized for information quality.

## Overview & Organization
- All topics & docs are kept in and organized in `docs` directories
- `docs` includes project documentation, notes, etc. It also includes global machine documentation, flows, patterns, available tools, etc.
- `docs/topics` includes larger organized sets of documentation within the given topic - useful to keep `docs` lean.
- `query` indexes everything in global `docs/**` for lookup when quick scan with `ls` and `topic` doesn't include promising results at a glance. `query` doesn't index project docs directory.

## Query
{{ query_usage }}

Use this to search through parked global docs collections with semantic search fast.
Returns matches optimized for quick context gathering with cat/sed followups.

## Parking
{{ park_usage }}

Use this to attach a docs root to the global docs index.
`{{ park_command }} foo` - park `./docs` when present, otherwise `.`
`{{ park_command }} foo ~/work/bar` - park an explicit project or docs dir

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
{{ ls_usage }}
docs ios - Bare selector fallback for a topic
docs architecture - Bare selector fallback for a registered docs root
docs machine - Bare selector fallback for a parked docs root, showing topics and docs
docs ~/work/foo - Bare selector fallback for a workspace docs root
{{ ls_command }} . - Project docs, expanded descriptions
{{ ls_command }} ./docs/subdir - Project docs in dir
{{ ls_command }} docs/subdir - Matching local and global docs dirs
{{ ls_command }} architecture - Matching local and global docs dirs by registered name
{{ ls_command }} ~/work/foo - Resolve a workspace to its docs dir
{{ ls_command }} ~/work/foo/docs - Explicit docs dir
{{ ls_command }} machine - Parked global docs by name
{{ ls_command }} global - Global docs, expanded descriptions

{% for docs_group in docs_groups %}
### {{ docs_group.directory_path }}
{% for entry_line in docs_group.entry_lines -%}
{{ entry_line }}
{% endfor %}
{% unless forloop.last %}

{% endunless %}
{% endfor %}
{% endif %}

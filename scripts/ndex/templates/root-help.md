Usage: ndex [options] [command]

# ndex
ndex organizes project local and global documentation optimized for information quality.

## Overview & Organization
- All topics & docs are kept in and organized in `docs` directories
- `docs` includes project documentation, notes, etc. It also includes global machine documentation, flows, patterns, available tools, etc.
- `docs/topics` includes larger organized sets of documentation within the given topic - useful to keep `docs` lean.
- `query` indexes everything in global `docs/**` for lookup when quick scan with `ls` and `topic` doesn't include promising results at a glance. `query` doesn't index project docs directory.

## Query
ndex query [options] [terms...]

Use this to search through global docs and topics with semantic search fast.
Returns matches optimized for quick context gathering with cat/sed followups.

## Topics
ndex topic [topic] [section]

Topics contain specialized docs, available anywhere.
Use `ndex topic <name>` to expand available docs for topic.
`ndex topic foo` - view foo about/index first
`ndex topic foo bar` - learn about bar section

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
ndex ls [where]
ndex ls . - Project docs, expanded descriptions
ndex ls ./docs/subdir - Project docs in dir
ndex ls docs/subdir - Matching local and global docs dirs
ndex ls global - Global docs, expanded descriptions

{% for docs_group in docs_groups %}
{{ docs_group.directory_path }}
{% for entry_line in docs_group.entry_lines -%}
{{ entry_line }}
{% endfor %}
{% unless forloop.last %}

{% endunless %}
{% endfor %}
{% endif %}

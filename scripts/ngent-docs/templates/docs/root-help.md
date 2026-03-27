Usage: docs [options] [command]

{{ title_line }}
docs organizes project local and global documentation optimized for information quality.

{{ overview_heading_line }}
- All topics & docs are kept in and organized in `docs` directories
- `docs` includes project documentation, notes, etc. It also includes global machine documentation, flows, patterns, available tools, etc.
- `docs/topics` includes larger organized sets of documentation within the given topic - useful to keep `docs` lean.
- `query` indexes everything in global `docs/**` for lookup when quick scan with `ls` and `topic` doesn't include promising results at a glance. `query` doesn't index project docs directory.

{{ browse_heading_line }}
docs <where>
{{ ls_usage }}

`docs <where>` accepts one non-command selector.
It may open a topic like `docs <topic>` or a docs view like `docs <docs-root>`.

`{{ ls_command }} [where]` browses docs only.

`[where]` may be:
- `.`
- `global`
- `docs/subdir` or `./docs/subdir`
- a registered docs root like `browser`
- a workspace path like `~/work/foo`
- an explicit docs path like `~/work/foo/docs`

Examples
docs <topic>
docs <docs-root>
{{ ls_command }} .
{{ ls_command }} docs/subdir

{{ query_heading_line }}
{{ query_usage }}

Use this to search through parked global docs collections with semantic search fast.
Returns matches optimized for quick context gathering with cat/sed followups.

{{ topics_heading_line }}
{{ topic_usage }}

Topics contain specialized docs, available anywhere.
Use `{{ topic_command }} <name>` to expand available docs for topic.
`{{ topic_command }} foo` - view foo about/index first
`{{ topic_command }} foo bar` - learn about bar section

{% if topic_table.text == "" %}- [no topics found]{% else %}{{ topic_table.text }}{% endif %}

{% if show_docs_index %}{{ docs_heading_line }}

{% for docs_group in docs_groups %}{{ docs_group.text }}{% unless forloop.last %}

{% endunless %}{% endfor %}

{% endif %}To read docs operation manual use `docs --ops-help`.

{{ title_line }}

{% if topics %}{{ topics.title_line }}

{% render partials/topic-table.md, topic_table: topics.topic_table %}

{% endif %}
{{ docs_title_line }}

{% for docs_group in docs_groups %}{% unless forloop.first %}

{% endunless %}{%- render partials/expanded-docs-group.md, group: docs_group, spaced_entries: false -%}{% endfor %}

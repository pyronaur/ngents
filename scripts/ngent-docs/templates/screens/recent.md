{{ title_line }}
Docs agents read in past sessions, most recently read first.

{% for section in sections %}{% unless forloop.first %}

{% endunless %}{%- render partials/expanded-docs-group.md, group: section, spaced_entries: false -%}{% if section.entries.size == 0 %}- [no reads found]{% endif %}{% endfor %}

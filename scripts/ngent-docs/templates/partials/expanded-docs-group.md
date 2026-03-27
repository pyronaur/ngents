{{ group.heading_line }}
{% for entry in group.entries %}{{ entry.file_line }}
{% if entry.detail_lines.size > 0 %}{{ entry.detail_lines | join: '\n' }}{% endif %}{% unless forloop.last %}{% if spaced_entries %}

{% else %}{% endif %}{% endunless %}{% endfor -%}

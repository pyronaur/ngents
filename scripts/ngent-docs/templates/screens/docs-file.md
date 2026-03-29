{{ title_line }}
{{ path_line }}{% if metadata_lines.size > 0 or body_text %}

{% endif %}{% for line in metadata_lines %}{{ line }}{% unless forloop.last %}
{% endunless %}{% endfor %}{% if metadata_lines.size > 0 and body_text %}

{% endif %}{% if body_text %}{{ body_text }}{% endif %}

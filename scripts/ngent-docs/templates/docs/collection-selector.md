{{ title_line }}

{% if topics %}{{ topics.title_line }}

{{ topics.text }}

{% endif %}
{{ docs_title_line }}

{% for docs_group in docs_groups %}{{ docs_group.text }}{% unless forloop.last %}

{% endunless %}{% endfor %}

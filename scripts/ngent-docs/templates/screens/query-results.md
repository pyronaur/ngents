{{ tip_line }}

{% if results.size == 0 %}No results.{% else %}{% for result in results %}{{ result.heading_line }}{% if result.overview_line %}
{{ result.overview_line }}

{% endif %}{{ result.path_line }}{% for snippet_line in result.snippet_lines %}
{{ snippet_line }}{% endfor %}
{% unless forloop.last %}

{% endunless %}{% endfor %}{% endif %}

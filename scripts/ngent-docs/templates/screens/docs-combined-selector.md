{{ title_line }}

{% render screens/topic-overview.md, docs_buckets: topic_view.docs_buckets, docs_heading_line: topic_view.docs_heading_line, guide_blocks: topic_view.guide_blocks, skill_sections: topic_view.skill_sections, skills_heading_line: topic_view.skills_heading_line, title_line: topic_view.title_line %}

{{ docs_title_line }}

{% for docs_group in docs_groups %}{% unless forloop.first %}

{% endunless %}{%- render partials/expanded-docs-group.md, group: docs_group, spaced_entries: false -%}{% endfor %}

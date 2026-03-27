{% if guide_blocks.size > 0 %}{% for guide_block in guide_blocks %}{{ guide_block.text }}{% unless forloop.last %}

{% endunless %}{% endfor %}

{% endif %}{{ title_line }}{% if docs_buckets.size > 0 or skill_sections.size > 0 %}

{% endif %}{% if docs_buckets.size > 0 %}{{ docs_heading_line }}

{% for docs_bucket in docs_buckets %}{{ docs_bucket.text }}{% unless forloop.last %}

{% endunless %}{% endfor %}{% endif %}{% if docs_buckets.size > 0 and skill_sections.size > 0 %}

{% endif %}{% if skill_sections.size > 0 %}{{ skills_heading_line }}

{% for skill_section in skill_sections %}{{ skill_section.text }}{% unless forloop.last %}

{% endunless %}{% endfor %}{% endif %}

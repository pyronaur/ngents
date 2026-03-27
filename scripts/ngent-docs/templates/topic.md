{%- case view -%}
{%- when "browser" -%}
{%- render topic/browser.md, examples: examples, title_line: title_line, topic_table: topic_table, usage_line: usage_line -%}
{%- when "scoped_browser" -%}
{%- render topic/scoped-browser.md, title_line: title_line, topic_table: topic_table -%}
{%- when "overview" -%}
{%- render topic/overview.md, docs_buckets: docs_buckets, docs_heading_line: docs_heading_line, guide_blocks: guide_blocks, skill_sections: skill_sections, skills_heading_line: skills_heading_line, title_line: title_line -%}
{%- when "focused" -%}
{%- render topic/focused.md, sections: sections, title_line: title_line -%}
{%- endcase -%}

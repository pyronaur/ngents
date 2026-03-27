{%- if topic_table.row_lines.size == 0 -%}
- [no topics found]
{%- else -%}
{{ topic_table.header_line }}
{{ topic_table.row_lines | join: '\n' }}
{%- endif -%}

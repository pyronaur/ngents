{%- case view -%}
{%- when "root_help" -%}
{%- render docs/root-help.md, browse_heading_line: browse_heading_line, docs_groups: docs_groups, docs_heading_line: docs_heading_line, ls_command: ls_command, ls_usage: ls_usage, overview_heading_line: overview_heading_line, query_heading_line: query_heading_line, query_usage: query_usage, show_docs_index: show_docs_index, title_line: title_line, topic_command: topic_command, topic_table: topic_table, topic_usage: topic_usage, topics_heading_line: topics_heading_line -%}
{%- when "ops_help" -%}
{%- render docs/ops-help.md, fetch_command: fetch_command, fetch_heading_line: fetch_heading_line, fetch_usage: fetch_usage, park_command: park_command, park_heading_line: park_heading_line, park_usage: park_usage, title_line: title_line, update_command: update_command, update_heading_line: update_heading_line, update_usage: update_usage -%}
{%- when "collection_selector" -%}
{%- render docs/collection-selector.md, docs_groups: docs_groups, docs_title_line: docs_title_line, title_line: title_line, topics: topics -%}
{%- when "combined_selector" -%}
{%- render docs/combined-selector.md, docs_groups: docs_groups, docs_title_line: docs_title_line, title_line: title_line, topic_view: topic_view -%}
{%- endcase -%}

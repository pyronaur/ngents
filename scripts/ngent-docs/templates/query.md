{%- case view -%}
{%- when "results" -%}
{%- render query/results.md, result_blocks: result_blocks, tip_line: tip_line -%}
{%- when "status" -%}
{%- render query/status.md, lines: lines -%}
{%- endcase -%}

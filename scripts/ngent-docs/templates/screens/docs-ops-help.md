Usage: docs --ops-help

{{ title_line }}
This manual covers docs maintenance and meta operations.

{{ park_heading_line }}
{{ park_usage }}

Use this to attach a docs root to the global docs index.
`{{ park_command }} foo` - park `./docs` when present, otherwise `.`
`{{ park_command }} foo ~/work/bar` - park an explicit project or docs dir

{{ fetch_heading_line }}
{{ fetch_usage }}

Use this to register and refresh fetched docs through an external handler.
`{{ fetch_command }} https://example.com/spec docs/external/spec --handler url` - fetch one remote file into a docs subtree
`{{ fetch_command }} https://example.com/org/repo docs/external/spec --handler git --root api` - limit the git source root passed to the handler

{{ update_heading_line }}
{{ update_usage }}

Use this to refresh registered fetches, then rebuild the global docs QMD index and embeddings.

For command-specific syntax details, use each command's `--help`.

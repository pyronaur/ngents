#!/usr/bin/env bash

set -euo pipefail

die() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || die "missing required source file: $path"
}

trim_trailing_blank_lines() {
  awk '
    { lines[NR] = $0 }
    END {
      end = NR
      while (end > 0 && lines[end] ~ /^[[:space:]]*$/) {
        end--
      }
      for (i = 1; i <= end; i++) {
        print lines[i]
      }
    }
  '
}

extract_section() {
  local file="$1"
  local heading="$2"
  awk -v heading="$heading" '
    function heading_level(line, prefix) {
      prefix = line
      sub(/[[:space:]].*$/, "", prefix)
      return length(prefix)
    }
    function heading_text(line, text) {
      text = line
      sub(/^#{1,6}[[:space:]]+/, "", text)
      sub(/[[:space:]]+#+[[:space:]]*$/, "", text)
      return text
    }
    BEGIN {
      in_fence = 0
      found = 0
      started = 0
      target_level = 0
    }
    /^```/ {
      in_fence = !in_fence
    }
    {
      if (!in_fence && $0 ~ /^#{1,6}[[:space:]]+/) {
        level = heading_level($0)
        text = heading_text($0)
        if (started && level <= target_level) {
          exit
        }
        if (!started && text == heading) {
          started = 1
          found = 1
          target_level = level
        }
      }
      if (started) {
        print
      }
    }
    END {
      if (!found) {
        exit 42
      }
    }
  ' "$file" || die "missing heading '$heading' in $file"
}

append_section() {
  local body_file="$1"
  local source_file="$2"
  local heading="$3"

  if [[ -s "$body_file" ]]; then
    printf '\n\n' >> "$body_file"
  fi

  extract_section "$source_file" "$heading" >> "$body_file"
}

append_section_until() {
  local body_file="$1"
  local source_file="$2"
  local start_heading="$3"
  local end_heading="$4"

  if [[ -s "$body_file" ]]; then
    printf '\n\n' >> "$body_file"
  fi

  awk -v start_heading="$start_heading" -v end_heading="$end_heading" '
    function heading_text(line, text) {
      text = line
      sub(/^#{1,6}[[:space:]]+/, "", text)
      sub(/[[:space:]]+#+[[:space:]]*$/, "", text)
      return text
    }
    BEGIN {
      in_fence = 0
      started = 0
      found = 0
    }
    /^```/ {
      in_fence = !in_fence
    }
    {
      if (!in_fence && $0 ~ /^#{1,6}[[:space:]]+/) {
        text = heading_text($0)
        if (!started && text == start_heading) {
          started = 1
          found = 1
        } else if (started && text == end_heading) {
          exit
        }
      }
      if (started) {
        print
      }
    }
    END {
      if (!found) {
        exit 42
      }
    }
  ' "$source_file" >> "$body_file" || die "missing heading '$start_heading' in $source_file"
}

strip_section() {
  local body_file="$1"
  local heading="$2"
  local tmp_file

  tmp_file="$(mktemp)"
  awk -v heading="$heading" '
    function heading_level(line, prefix) {
      prefix = line
      sub(/[[:space:]].*$/, "", prefix)
      return length(prefix)
    }
    function heading_text(line, text) {
      text = line
      sub(/^#{1,6}[[:space:]]+/, "", text)
      sub(/[[:space:]]+#+[[:space:]]*$/, "", text)
      return text
    }
    BEGIN {
      in_fence = 0
      skipping = 0
      target_level = 0
    }
    /^```/ {
      in_fence = !in_fence
    }
    {
      if (!in_fence && $0 ~ /^#{1,6}[[:space:]]+/) {
        level = heading_level($0)
        text = heading_text($0)
        if (!skipping && text == heading) {
          skipping = 1
          target_level = level
          next
        }
        if (skipping && level <= target_level) {
          skipping = 0
        }
      }
      if (!skipping) {
        print
      }
    }
  ' "$body_file" > "$tmp_file"
  mv "$tmp_file" "$body_file"
}

strip_matching_lines() {
  local body_file="$1"
  local pattern="$2"
  local tmp_file

  tmp_file="$(mktemp)"
  awk -v pattern="$pattern" '$0 !~ pattern { print }' "$body_file" > "$tmp_file"
  mv "$tmp_file" "$body_file"
}

existing_frontmatter() {
  local target="$1"
  [[ -f "$target" ]] || return 1
  awk '
    NR == 1 && $0 == "---" {
      print
      in_frontmatter = 1
      next
    }
    in_frontmatter {
      print
      if ($0 == "---") {
        exit
      }
      next
    }
    {
      exit 1
    }
  ' "$target"
}

default_frontmatter() {
  local target="$1"
  case "$target" in
    "$TARGET_DIR/.docs.md")
      cat <<'EOF'
---
title: QMD
summary: Local QMD reference for setup, CLI usage, querying, SDK integration, and internals.
read_when:
  - Need to decide which QMD doc to open first.
  - Need a short local overview of the QMD docs topic.
---
EOF
      ;;
    "$TARGET_DIR/QMD.md")
      cat <<'EOF'
---
summary: What QMD is, the core concepts it uses, and which local reference doc to read next.
read_when:
  - Need the shortest overview of QMD before opening deeper references.
  - Need the local map of the QMD docs set.
---
EOF
      ;;
    "$REFERENCES_DIR/installation-and-requirements.md")
      cat <<'EOF'
---
summary: Install, verify, and upgrade QMD, then understand runtime and model requirements.
read_when:
  - Need to install or upgrade QMD.
  - Need setup, verification, or model prerequisite details.
---
EOF
      ;;
    "$REFERENCES_DIR/cli.md")
      cat <<'EOF'
---
summary: The command-line surface for QMD, including core commands and shared options.
read_when:
  - Need the QMD command surface quickly.
  - Need CLI options without reading broader usage docs.
---
EOF
      ;;
    "$REFERENCES_DIR/collections-contexts-and-indexing.md")
      cat <<'EOF'
---
summary: Collections, contexts, embedding generation, and index maintenance for local QMD stores.
read_when:
  - Need to set up or maintain QMD indexing.
  - Need collection or context management details.
---
EOF
      ;;
    "$REFERENCES_DIR/search-and-retrieval.md")
      cat <<'EOF'
---
summary: Search modes, retrieval workflows, output formats, and common search examples for QMD.
read_when:
  - Need to find something with QMD.
  - Need search and retrieval examples without syntax deep-dives.
---
EOF
      ;;
    "$REFERENCES_DIR/query-syntax.md")
      cat <<'EOF'
---
summary: Query grammar and practical guidance for shaping `lex`, `vec`, `hyde`, `expand`, and `intent` queries.
read_when:
  - Need to write or debug QMD queries precisely.
  - Need the exact query model and syntax constraints.
---
EOF
      ;;
    "$REFERENCES_DIR/sdk-and-integration.md")
      cat <<'EOF'
---
summary: Programmatic QMD usage through the SDK, including store creation, search, retrieval, and indexing APIs.
read_when:
  - Need to use QMD from Bun or Node code.
  - Need the API surface for a deeper integration.
---
EOF
      ;;
    "$REFERENCES_DIR/architecture-and-internals.md")
      cat <<'EOF'
---
summary: How QMD works internally, including search fusion, storage, indexing, embeddings, and chunking.
read_when:
  - Need to understand how QMD works behind the scenes.
  - Need internals context for debugging or advanced integrations.
---
EOF
      ;;
    *)
      die "no default frontmatter for $target"
      ;;
  esac
}

write_target() {
  local target="$1"
  local body_file="$2"
  local frontmatter_file
  local output_file

  mkdir -p "$(dirname "$target")"
  frontmatter_file="$(mktemp)"
  output_file="$(mktemp)"

  if ! existing_frontmatter "$target" > "$frontmatter_file"; then
    default_frontmatter "$target" > "$frontmatter_file"
  fi

  cat "$frontmatter_file" > "$output_file"
  printf '\n' >> "$output_file"
  trim_trailing_blank_lines < "$body_file" >> "$output_file"
  printf '\n' >> "$output_file"
  mv "$output_file" "$target"
  rm -f "$frontmatter_file"
}

write_local_docs_body() {
  cat <<'EOF'
# QMD

QMD is a local search engine for markdown notes, docs, transcripts, and other knowledge bases.

- Start with `QMD.md` for the overview and reference map.
- Use `references/installation-and-requirements.md` for setup and model prerequisites.
- Use `references/cli.md` for the command surface.
- Use `references/search-and-retrieval.md` and `references/query-syntax.md` when the task is finding or shaping results.
- Use `references/sdk-and-integration.md` and `references/architecture-and-internals.md` for deeper integrations.
EOF
}

write_local_qmd_body() {
  local revision="$1"
  cat <<EOF
# QMD - Query Markup Documents

QMD is a local search engine for markdown notes, meeting transcripts, documentation, and other knowledge bases. This local docs set preserves the upstream non-networked documentation surface and reorganizes it into canonical concept owners.

## Core Concepts

- **Collections** are named roots that QMD indexes.
- **Contexts** add higher-level meaning to collections or subpaths.
- **Search modes** let you choose between keyword, vector, and hybrid retrieval.
- **Embeddings** power semantic search and reranking.

## Reference Map

- Read [installation-and-requirements.md](references/installation-and-requirements.md) for setup, verification, and model/runtime requirements.
- Read [cli.md](references/cli.md) for the command surface and shared options.
- Read [collections-contexts-and-indexing.md](references/collections-contexts-and-indexing.md) when setting up or maintaining indexed content.
- Read [search-and-retrieval.md](references/search-and-retrieval.md) for common search workflows and retrieval examples.
- Read [query-syntax.md](references/query-syntax.md) for exact query grammar and query-shaping guidance.
- Read [sdk-and-integration.md](references/sdk-and-integration.md) for Bun/Node integrations.
- Read [architecture-and-internals.md](references/architecture-and-internals.md) for scoring, storage, indexing, chunking, and internals.

Upstream source repo for regeneration: \`$SOURCE_LABEL\` at commit \`$revision\`.
EOF
}

generate_installation_and_requirements() {
  local body_file="$1"
  : > "$body_file"
  append_section "$body_file" "$README" "Requirements"
  append_section "$body_file" "$README" "Installation"
  append_section "$body_file" "$README" "Model Configuration"
  append_section "$body_file" "$SKILL" "Status"
  append_section "$body_file" "$SKILL" "Setup"
}

generate_cli() {
  local body_file="$1"
  : > "$body_file"
  append_section "$body_file" "$CLAUDE" "Commands"
  append_section "$body_file" "$CLAUDE" "Options"
  strip_matching_lines "$body_file" "^qmd mcp([[:space:]]|$)"
}

generate_collections_contexts_and_indexing() {
  local body_file="$1"
  : > "$body_file"
  append_section "$body_file" "$README" "Collection Management"
  append_section "$body_file" "$README" "Generate Vector Embeddings"
  append_section "$body_file" "$README" "Context Management"
  append_section "$body_file" "$README" "Index Maintenance"
  append_section "$body_file" "$CLAUDE" "Collection Management"
  append_section "$body_file" "$CLAUDE" "Context Management"
}

generate_search_and_retrieval() {
  local body_file="$1"
  : > "$body_file"
  append_section_until "$body_file" "$README" "Quick Start" "Using with AI Agents"
  append_section "$body_file" "$README" "Using with AI Agents"
  append_section "$body_file" "$README" "Search Commands"
  append_section "$body_file" "$README" "Output Format"
  append_section "$body_file" "$README" "Examples"
  append_section "$body_file" "$CLAUDE" "Document IDs (docid)"
  strip_section "$body_file" "MCP Server"
}

generate_query_syntax() {
  local body_file="$1"
  : > "$body_file"
  append_section "$body_file" "$SYNTAX" "QMD Query Syntax"
  append_section "$body_file" "$SKILL" "Query Types"
  append_section "$body_file" "$SKILL" "Writing Good Queries"
  append_section "$body_file" "$SKILL" "Intent (Disambiguation)"
  append_section "$body_file" "$SKILL" "Combining Types"
  append_section "$body_file" "$SKILL" "Lex Query Syntax"
  append_section "$body_file" "$SKILL" "Collection Filtering"
  strip_section "$body_file" "MCP/HTTP API"
}

generate_sdk_and_integration() {
  local body_file="$1"
  : > "$body_file"
  append_section "$body_file" "$README" "SDK / Library Usage"
}

generate_architecture_and_internals() {
  local body_file="$1"
  : > "$body_file"
  append_section "$body_file" "$README" "Architecture"
  append_section "$body_file" "$README" "Score Normalization & Fusion"
  append_section "$body_file" "$README" "Data Storage"
  append_section "$body_file" "$README" "Environment Variables"
  append_section "$body_file" "$README" "How It Works"
  append_section "$body_file" "$CLAUDE" "Architecture"
}

SOURCE_ROOT="${DOCS_FETCH_INPUT:-}"
TARGET_DIR="${DOCS_FETCH_OUTPUT:-}"
SOURCE_LABEL="${DOCS_FETCH_SOURCE:-$SOURCE_ROOT}"
[[ -n "$SOURCE_ROOT" ]] || die "DOCS_FETCH_INPUT is required"
[[ -n "$TARGET_DIR" ]] || die "DOCS_FETCH_OUTPUT is required"

SOURCE_ROOT="$(cd "$SOURCE_ROOT" && pwd)"
REFERENCES_DIR="$TARGET_DIR/references"
README="$SOURCE_ROOT/README.md"
SYNTAX="$SOURCE_ROOT/docs/SYNTAX.md"
CLAUDE="$SOURCE_ROOT/CLAUDE.md"
SKILL="$SOURCE_ROOT/skills/qmd/SKILL.md"

require_file "$README"
require_file "$SYNTAX"
require_file "$CLAUDE"
require_file "$SKILL"

mkdir -p "$REFERENCES_DIR"

REVISION="$(git -C "$SOURCE_ROOT" rev-parse --short HEAD 2>/dev/null || printf 'unknown')"

BODY_FILE="$(mktemp)"

write_local_docs_body > "$BODY_FILE"
write_target "$TARGET_DIR/.docs.md" "$BODY_FILE"

write_local_qmd_body "$REVISION" > "$BODY_FILE"
write_target "$TARGET_DIR/QMD.md" "$BODY_FILE"

generate_installation_and_requirements "$BODY_FILE"
write_target "$REFERENCES_DIR/installation-and-requirements.md" "$BODY_FILE"

generate_cli "$BODY_FILE"
write_target "$REFERENCES_DIR/cli.md" "$BODY_FILE"

generate_collections_contexts_and_indexing "$BODY_FILE"
write_target "$REFERENCES_DIR/collections-contexts-and-indexing.md" "$BODY_FILE"

generate_search_and_retrieval "$BODY_FILE"
write_target "$REFERENCES_DIR/search-and-retrieval.md" "$BODY_FILE"

generate_query_syntax "$BODY_FILE"
write_target "$REFERENCES_DIR/query-syntax.md" "$BODY_FILE"

generate_sdk_and_integration "$BODY_FILE"
write_target "$REFERENCES_DIR/sdk-and-integration.md" "$BODY_FILE"

generate_architecture_and_internals "$BODY_FILE"
write_target "$REFERENCES_DIR/architecture-and-internals.md" "$BODY_FILE"

rm -f "$BODY_FILE"

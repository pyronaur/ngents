#!/usr/bin/env bash

set -euo pipefail

SOURCE_ROOT="${DOCS_FETCH_INPUT:-}"
TARGET_DIR="${DOCS_FETCH_OUTPUT:-}"

die() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

require_path() {
  local path="$1"
  [[ -e "$path" ]] || die "missing required source path: $path"
}

copy_path() {
  local source_path="$1"
  local target_path="$2"

  if [[ -d "$source_path" ]]; then
    mkdir -p "$target_path"
    tar -C "$source_path" \
      --exclude='.gitignore' \
      --exclude='AGENTS.md' \
      --exclude='CLAUDE.md' \
      -cf - . | tar -C "$target_path" -xf -
    return
  fi

  mkdir -p "$(dirname "$target_path")"
  cp -R "$source_path" "$target_path"
}

[[ -n "$SOURCE_ROOT" ]] || die "DOCS_FETCH_INPUT is required"
[[ -n "$TARGET_DIR" ]] || die "DOCS_FETCH_OUTPUT is required"

SOURCE_ROOT="$(cd "$SOURCE_ROOT" && pwd)"
mkdir -p "$TARGET_DIR"

for entry in \
  CONTRIBUTING.md \
  LICENSE \
  README.md \
  VERSIONS.md \
  action.yml \
  demos \
  package.json \
  packages \
  skills \
  website
do
  require_path "$SOURCE_ROOT/$entry"
  copy_path "$SOURCE_ROOT/$entry" "$TARGET_DIR/$entry"
done

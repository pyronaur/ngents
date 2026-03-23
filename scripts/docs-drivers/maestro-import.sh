#!/usr/bin/env bash

set -euo pipefail

TARGET_DIR="${DOCS_FETCH_OUTPUT:-}"
SOURCE_ROOT="${DOCS_FETCH_INPUT:-}"
SOURCE_LABEL="${DOCS_FETCH_SOURCE:-$SOURCE_ROOT}"

REFERENCE_SPECS=(
  "introduction/get-started/supported-platform/ios/README.md:ios.md"
  "introduction/get-started/supported-platform/ios/swiftui.md:swiftui.md"
  "introduction/get-started/supported-platform/ios/uikit.md:uikit.md"
  "maestro-cli/README.md:cli-overview.md"
  "maestro-cli/how-to-install-maestro-cli/README.md:cli-install.md"
  "maestro-cli/how-to-install-maestro-cli/update-the-maestro-cli.md:cli-update.md"
  "maestro-cli/maestro-cli-commands-and-options.md:cli-commands-and-options.md"
  "maestro-cli/environment-variables.md:cli-environment-variables.md"
  "flows/flow-control-and-logic/specify-and-start-devices.md:cli-specify-and-start-devices.md"
)

require_bin() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'missing required command: %s\n' "$1" >&2
    exit 1
  }
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || {
    printf 'missing required source file: %s\n' "$path" >&2
    exit 1
  }
}

copy_file() {
  local source_path="$1"
  local target_path="$2"

  mkdir -p "$(dirname "$target_path")"
  cp "$source_path" "$target_path"
}

sanitize_markdown() {
  local target_path="$1"

  perl -0pi -e 's/^description:/summary:/m' "$target_path"
  perl -0pi -e 's/^<figure>.*<\/figure>\n?//mg' "$target_path"
  perl -0pi -e 's/\n{3,}/\n\n/g' "$target_path"
}

list_api_reference_files() {
  (
    cd "$SOURCE_ROOT"
    find api-reference -type f -name '*.md' | sort
  ) | rg -v '(^|/)(README|SUMMARY)\.md$'
}

[[ -n "$SOURCE_ROOT" ]] || {
  printf 'DOCS_FETCH_INPUT is required\n' >&2
  exit 1
}
[[ -n "$TARGET_DIR" ]] || {
  printf 'DOCS_FETCH_OUTPUT is required\n' >&2
  exit 1
}

require_bin perl
require_bin rg
mkdir -p "$TARGET_DIR"

REFERENCE_COUNT=0

for spec in "${REFERENCE_SPECS[@]}"; do
  upstream_path="${spec%%:*}"
  local_path="${spec#*:}"
  copy_file "$SOURCE_ROOT/$upstream_path" "$TARGET_DIR/$local_path"
  sanitize_markdown "$TARGET_DIR/$local_path"
  REFERENCE_COUNT=$((REFERENCE_COUNT + 1))
done

API_REFERENCE_FILES="$(list_api_reference_files)"

while IFS= read -r path; do
  [[ -n "$path" ]] || continue
  require_file "$SOURCE_ROOT/$path"
  copy_file "$SOURCE_ROOT/$path" "$TARGET_DIR/$path"
  sanitize_markdown "$TARGET_DIR/$path"
  REFERENCE_COUNT=$((REFERENCE_COUNT + 1))
done <<EOF
$API_REFERENCE_FILES
EOF

printf 'Imported %s Maestro files from %s\n' "$REFERENCE_COUNT" "$SOURCE_LABEL"

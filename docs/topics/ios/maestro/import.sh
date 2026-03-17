#!/usr/bin/env bash

set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$SELF_DIR"
REFERENCES_DIR="$TARGET_DIR/references"
UPSTREAM_REF="${UPSTREAM_REF:-b8763944987d312b4cfe9ca9b5c3ecf756df3b77}"
RAW_BASE_URL="https://raw.githubusercontent.com/mobile-dev-inc/maestro-docs/${UPSTREAM_REF}"
API_BASE_URL="https://api.github.com/repos/mobile-dev-inc/maestro-docs"

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

download_file() {
  local upstream_path="$1"
  local target_path="$2"

  mkdir -p "$(dirname "$target_path")"
  curl -fsSL "${RAW_BASE_URL}/${upstream_path}" > "$target_path"
}

resolve_tree_sha() {
  curl -fsSL "${API_BASE_URL}/commits/${UPSTREAM_REF}" | jq -r '.commit.tree.sha'
}

list_api_reference_files() {
  local tree_sha="$1"

  curl -fsSL "${API_BASE_URL}/git/trees/${tree_sha}?recursive=1" \
    | jq -r '.tree[] | select(.type=="blob") | .path' \
    | rg '^api-reference/.*\.md$' \
    | rg -v '(^|/)(README|SUMMARY)\.md$'
}

sanitize_markdown() {
  local target_path="$1"

  perl -0pi -e 's/^description:/summary:/m' "$target_path"
  perl -0pi -e 's/^<figure>.*<\/figure>\n?//mg' "$target_path"
  perl -0pi -e 's/\n{3,}/\n\n/g' "$target_path"
}

cleanup_existing_import() {
  [[ -d "$REFERENCES_DIR" ]] && trash "$REFERENCES_DIR"
  [[ -f "$TARGET_DIR/LICENSE" ]] && trash "$TARGET_DIR/LICENSE"
  mkdir -p "$REFERENCES_DIR"
}

require_bin perl
require_bin jq
require_bin rg
require_bin trash

cleanup_existing_import

REFERENCE_COUNT=0

for spec in "${REFERENCE_SPECS[@]}"; do
  upstream_path="${spec%%:*}"
  local_path="${spec#*:}"
  download_file "$upstream_path" "$REFERENCES_DIR/$local_path"
  sanitize_markdown "$REFERENCES_DIR/$local_path"
  REFERENCE_COUNT=$((REFERENCE_COUNT + 1))
done

TREE_SHA="$(resolve_tree_sha)"
API_REFERENCE_FILES="$(list_api_reference_files "$TREE_SHA")"

while IFS= read -r path; do
  [[ -n "$path" ]] || continue
  download_file "$path" "$REFERENCES_DIR/$path"
  sanitize_markdown "$REFERENCES_DIR/$path"
  REFERENCE_COUNT=$((REFERENCE_COUNT + 1))
done <<EOF
$API_REFERENCE_FILES
EOF

printf 'Imported %s Maestro files from %s\n' "$REFERENCE_COUNT" "$UPSTREAM_REF"

#!/usr/bin/env bash

set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$SELF_DIR/app-store-connect-cli-skills"
UPSTREAM_REF="${UPSTREAM_REF:-a4d392e46db1c8d3fb3d2ed8cec9c971bc6f277b}"
ARCHIVE_URL="https://api.github.com/repos/rudrankriyam/app-store-connect-cli-skills/tarball/${UPSTREAM_REF}"

die() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

require_bin() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

cleanup_existing_import() {
  if [[ -d "$TARGET_DIR/skills" ]]; then
    trash "$TARGET_DIR/skills"
  fi

  if [[ -f "$TARGET_DIR/README.md" ]]; then
    trash "$TARGET_DIR/README.md"
  fi

  if [[ -f "$TARGET_DIR/LICENSE" ]]; then
    trash "$TARGET_DIR/LICENSE"
  fi
}

require_bin curl
require_bin tar
require_bin trash

WORK_DIR="$(mktemp -d)"
ARCHIVE_PATH="$WORK_DIR/archive.tar.gz"
trap 'rm -rf "$WORK_DIR"' EXIT

curl -fsSL -H 'Accept: application/vnd.github+json' "$ARCHIVE_URL" -o "$ARCHIVE_PATH"
tar -xzf "$ARCHIVE_PATH" -C "$WORK_DIR"

EXTRACTED_ROOT="$(find "$WORK_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
[[ -n "$EXTRACTED_ROOT" ]] || die "failed to locate extracted upstream root"

cleanup_existing_import

mv "$EXTRACTED_ROOT/README.md" "$TARGET_DIR/README.md"
mv "$EXTRACTED_ROOT/LICENSE" "$TARGET_DIR/LICENSE"
mv "$EXTRACTED_ROOT/skills" "$TARGET_DIR/skills"

SKILL_COUNT="$(find "$TARGET_DIR/skills" -name SKILL.md | wc -l | tr -d ' ')"
printf 'Imported %s App Store Connect CLI skills from %s\n' "$SKILL_COUNT" "$UPSTREAM_REF"

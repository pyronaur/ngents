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

  mkdir -p "$(dirname "$target_path")"
  cp -R "$source_path" "$target_path"
}

sanitize_readme() {
  local target_path="$1"

  perl -0pi -e 's/\n### Automated Validation\nPython script validates all metadata against Apple'\''s strict character limits with clear ✅\/❌ indicators and remaining character counts\.\n//g' "$target_path"
  perl -0pi -e 's/\n### Verify Installation\n\nThe skill structure should look like:\n```\n~\/\.claude\/skills\/app-store-aso\/\n├── SKILL\.md                          # Main skill instructions\n├── README\.md                         # This file\n├── scripts\/\n│   └── validate_metadata\.py         # Validation script\n└── references\/\n    └── aso_learnings\.md             # Comprehensive ASO knowledge base\n```\n//g' "$target_path"
  perl -0pi -e 's/\n## 🛠️ Validation Script\n.*?\n## 📊 Apple App Store Character Limits/\n\n## 📊 Apple App Store Character Limits/s' "$target_path"
}

sanitize_skill() {
  local target_path="$1"

  perl -0pi -e 's/\n4\. \*\*Validate Character Counts\*\*\n   - Use `scripts\/validate_metadata\.py` to verify all metadata meets Apple'\''s requirements\n   - Display validation results with character counts and limit compliance\n   - Flag any violations with specific corrections needed\n/\n4. **Validate Character Counts**\n   - Check every metadata field against Apple'\''s published limits\n   - Display character counts with pass\/fail status\n   - Flag any violations with specific corrections needed\n/' "$target_path"
  perl -0pi -e 's/\n## Metadata Validation Process\n\nAfter generating recommendations, always validate using the validation script:\n\n```bash\npython scripts\/validate_metadata\.py\n```\n\nThe script will:\n1\. Prompt for each metadata field\n2\. Calculate character counts\n3\. Check against Apple'\''s limits\n4\. Display results with ✅ \(pass\) or ❌ \(fail\) indicators\n5\. Show exact character counts and remaining characters\n\n\*\*Integration Pattern:\*\*\n- Generate metadata recommendations\n- Run validation script with recommended content\n- Display validation results to user\n- Adjust any failing fields and re-validate\n/\n## Metadata Validation Process\n\nAfter generating recommendations, always validate the metadata against Apple'\''s published limits.\n\nValidation should:\n1. Calculate character counts for each metadata field\n2. Check each field against Apple'\''s limits\n3. Display results with ✅ (pass) or ❌ (fail) indicators\n4. Show exact character counts and remaining characters\n\n**Integration Pattern:**\n- Generate metadata recommendations\n- Check the recommended content against Apple'\''s limits\n- Display validation results to the user\n- Adjust any failing fields and re-check\n/' "$target_path"
  perl -0pi -e 's/\n### scripts\/validate_metadata\.py\nPython script that validates App Store metadata against Apple'\''s character limits\. Provides interactive validation with clear pass\/fail indicators\.\n//g' "$target_path"
}

[[ -n "$SOURCE_ROOT" ]] || die "DOCS_FETCH_INPUT is required"
[[ -n "$TARGET_DIR" ]] || die "DOCS_FETCH_OUTPUT is required"

SOURCE_ROOT="$(cd "$SOURCE_ROOT" && pwd)"
mkdir -p "$TARGET_DIR"

for entry in \
  LICENSE \
  README.md \
  SKILL.md \
  references
do
  require_path "$SOURCE_ROOT/$entry"
  copy_path "$SOURCE_ROOT/$entry" "$TARGET_DIR/$entry"
done

sanitize_readme "$TARGET_DIR/README.md"
sanitize_skill "$TARGET_DIR/SKILL.md"

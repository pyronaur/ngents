#!/usr/bin/env bash
set -euo pipefail

RUN_DIR=".al/runs/smoke"
PROOF_LOG="$RUN_DIR/demo_progress.log"
PLAN_FILE="plan_smoke.md"

fail() {
  echo "$1" >&2
  exit 1
}

checked_count() {
  grep -Ec '^[[:space:]]*[-*][[:space:]]+\[[xX]\]' "$PLAN_FILE" || true
}

total_count() {
  grep -Ec '^[[:space:]]*[-*][[:space:]]+\[[ xX]\]' "$PLAN_FILE" || true
}

runtime_iteration_count() {
  if [ ! -d "$RUN_DIR" ]; then
    echo 0
    return
  fi
  ls "$RUN_DIR"/prompt.*.md 2>/dev/null | wc -l | tr -d '[:space:]'
}

expect_line() {
  local file="$1"
  local expected="$2"
  grep -Fxq "$expected" "$file" || fail "Expected '$expected' in $file"
}

assert_step_state_for_count() {
  local count="$1"
  case "$count" in
    0)
      expect_line src/step1.txt "greeting: pending"
      expect_line src/step2.txt "greeting: pending"
      expect_line src/step3.txt "greeting: pending"
      ;;
    1)
      expect_line src/step1.txt "greeting: hello from iteration-1"
      expect_line src/step2.txt "greeting: pending"
      expect_line src/step3.txt "greeting: pending"
      ;;
    2)
      expect_line src/step1.txt "greeting: hello from iteration-1"
      expect_line src/step2.txt "greeting: hello from iteration-2"
      expect_line src/step3.txt "greeting: pending"
      ;;
    3)
      expect_line src/step1.txt "greeting: hello from iteration-1"
      expect_line src/step2.txt "greeting: hello from iteration-2"
      expect_line src/step3.txt "greeting: hello from iteration-3"
      ;;
    *)
      fail "Checked count must be between 0 and 3; got $count"
      ;;
  esac
}

TOTAL="$(total_count)"
CHECKED="$(checked_count)"
ITERATION="$(runtime_iteration_count)"

[ "$TOTAL" -eq 3 ] || fail "Implementation plan must contain exactly 3 checklist items; got $TOTAL"
assert_step_state_for_count "$CHECKED"

if [ "$ITERATION" -eq 0 ]; then
  [ "$CHECKED" -eq 0 ] || fail "Before runtime starts, checked count must be 0 (got $CHECKED)"
  exit 0
fi

[ "$ITERATION" -le 3 ] || fail "Runtime iteration count must be <= 3 for this demo (got $ITERATION)"
[ "$CHECKED" -eq "$ITERATION" ] || fail "Demo rule violated: checked count ($CHECKED) must equal runtime iteration ($ITERATION)"

mkdir -p "$RUN_DIR"
printf '%s iteration=%s checked=%s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$ITERATION" "$CHECKED" >> "$PROOF_LOG"

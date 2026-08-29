#!/usr/bin/env bash
# Unit tests for scripts/check-improve-bulk-age.sh

set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
SUT="$HERE/check-improve-bulk-age.sh"

PASS=0
FAIL=0

days_ago() {
  local n=$1
  date -v-${n}d +%Y%m%d%H%M 2>/dev/null || date -d "${n} days ago" +%Y%m%d%H%M
}

run_case() {
  local name="$1"
  local setup="$2"
  local expect_substr="$3"
  local threshold="${4:-}"

  local TMP
  TMP=$(mktemp -d)

  eval "$setup"

  local output
  if [ -n "$threshold" ]; then
    output=$(CLAUDE_PROJECT_DIR="$TMP" bash "$SUT" "$threshold" 2>&1) || true
  else
    output=$(CLAUDE_PROJECT_DIR="$TMP" bash "$SUT" 2>&1) || true
  fi

  if [ -z "$expect_substr" ]; then
    if [ -z "$output" ]; then
      echo "PASS: $name"
      PASS=$((PASS + 1))
    else
      echo "FAIL: $name"
      echo "  expected: no output"
      echo "  got:      $output"
      FAIL=$((FAIL + 1))
    fi
  else
    if echo "$output" | grep -q "$expect_substr"; then
      echo "PASS: $name"
      PASS=$((PASS + 1))
    else
      echo "FAIL: $name"
      echo "  expected substring: $expect_substr"
      echo "  got:                $output"
      FAIL=$((FAIL + 1))
    fi
  fi

  rm -rf "$TMP"
}

run_case "no scratch dir at all -> warns 'has not been run'" \
  "" \
  "has not been run"

run_case "scratch/bulk-improve exists but empty -> warns 'has not been run'" \
  'mkdir -p "$TMP/scratch/bulk-improve"' \
  "has not been run"

run_case "recent run (mkdir mtime = now) -> silent" \
  'mkdir -p "$TMP/scratch/bulk-improve/20260521-120000"' \
  ""

run_case "6 days old (under default threshold of 7) -> silent" \
  'mkdir -p "$TMP/scratch/bulk-improve/old"; touch -t $(days_ago 6) "$TMP/scratch/bulk-improve/old"' \
  ""

run_case "30 days old (over threshold) -> warns with day count" \
  'mkdir -p "$TMP/scratch/bulk-improve/old"; touch -t $(days_ago 30) "$TMP/scratch/bulk-improve/old"' \
  "last ran [0-9]\+ days ago"

run_case "most recent dir wins (60d old + today) -> silent" \
  'mkdir -p "$TMP/scratch/bulk-improve/oldest" "$TMP/scratch/bulk-improve/newest"; touch -t $(days_ago 60) "$TMP/scratch/bulk-improve/oldest"' \
  ""

run_case "all dirs old (60d + 30d) -> warns" \
  'mkdir -p "$TMP/scratch/bulk-improve/a" "$TMP/scratch/bulk-improve/b"; touch -t $(days_ago 60) "$TMP/scratch/bulk-improve/a"; touch -t $(days_ago 30) "$TMP/scratch/bulk-improve/b"' \
  "last ran"

run_case "custom threshold of 3 with 6-day-old dir -> warns" \
  'mkdir -p "$TMP/scratch/bulk-improve/old"; touch -t $(days_ago 6) "$TMP/scratch/bulk-improve/old"' \
  "last ran" \
  3

run_case "custom threshold of 10 with 6-day-old dir -> silent" \
  'mkdir -p "$TMP/scratch/bulk-improve/old"; touch -t $(days_ago 6) "$TMP/scratch/bulk-improve/old"' \
  "" \
  10

echo
echo "$PASS passed, $FAIL failed"
exit $((FAIL > 0 ? 1 : 0))

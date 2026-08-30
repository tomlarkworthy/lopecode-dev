#!/usr/bin/env bash
# Tests for scripts/commit-guard.sh — each case builds a throwaway repo, stages
# something, and feeds the hook a `git commit` command.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
SUT="$HERE/commit-guard.sh"
PASS=0; FAIL=0

mkrepo() {
  local d; d=$(mktemp -d)
  git -C "$d" init -q
  git -C "$d" config user.email t@t; git -C "$d" config user.name t
  echo base > "$d/base.txt"; git -C "$d" add base.txt; git -C "$d" commit -qm base
  echo "$d"
}

ERRF=$(mktemp)
hook() { # $1 cwd, $2 command  -> prints exit code, stderr to $ERRF
  printf '{"cwd":%s,"tool_input":{"command":%s}}' "$(jq -Rn --arg v "$1" '$v')" "$(jq -Rn --arg v "$2" '$v')" \
        | bash "$SUT" 2> "$ERRF" >/dev/null; echo $?
}

check() { # name expected_rc actual_rc substr
  ERR=$(cat "$ERRF")
  if [ "$2" = "$3" ] && { [ -z "$4" ] || echo "$ERR" | grep -q "$4"; }; then
    echo "PASS: $1"; PASS=$((PASS+1))
  else
    echo "FAIL: $1 (rc $3, wanted $2)"; echo "  $ERR"; FAIL=$((FAIL+1))
  fi
}

R=$(mkrepo); echo ok > "$R/f.txt"; git -C "$R" add f.txt
check "clean small commit passes" 0 "$(hook "$R" "git commit -m x")" ""
check "non-commit git command ignored" 0 "$(hook "$R" "git status")" ""
check "non-git command ignored" 0 "$(hook "$R" "echo commit")" ""

R=$(mkrepo); dd if=/dev/zero of="$R/big.bin" bs=1m count=3 2>/dev/null; git -C "$R" add big.bin
check "blob over limit blocked" 2 "$(COMMIT_GUARD_MAX_MB=2 hook "$R" "git commit -m x")" "3 MB staged"
check "blob under default limit passes" 0 "$(hook "$R" "git commit -m x")" ""

R=$(mkrepo); mkdir "$R/nested"; git -C "$R/nested" init -q; git -C "$R/nested" config user.email t@t; git -C "$R/nested" config user.name t
echo n > "$R/nested/x"; git -C "$R/nested" add x; git -C "$R/nested" commit -qm n
git -C "$R" add -A 2>/dev/null
check "undeclared gitlink blocked" 2 "$(hook "$R" "git commit -m x")" "not in .gitmodules"
printf '[submodule "nested"]\n\tpath = nested\n\turl = ./nested\n' > "$R/.gitmodules"; git -C "$R" add .gitmodules
check "declared gitlink passes" 0 "$(hook "$R" "git commit -m x")" ""

R=$(mkrepo); echo "key = sk-or-v1-0123456789abcdef0123456789abcdef" > "$R/cfg"; git -C "$R" add cfg
check "openrouter token blocked" 2 "$(hook "$R" "git commit -m x")" "API token"
check "-C form resolves the repo" 2 "$(hook "$(dirname "$R")" "git -C $(basename "$R") commit -m x")" "API token"
check "chained command finds the commit" 2 "$(hook "$R" "git add cfg && git commit -m x")" "API token"
check "token in a removed line passes" 0 "$(git -C "$R" commit -qm t; git -C "$R" rm -q cfg; hook "$R" "git commit -m x")" ""

echo; echo "$PASS passed, $FAIL failed"
exit $((FAIL > 0 ? 1 : 0))

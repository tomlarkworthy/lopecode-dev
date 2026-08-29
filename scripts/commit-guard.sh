#!/usr/bin/env bash
# PreToolUse(Bash) hook: refuse a `git commit` whose index holds
#   (a) a gitlink (mode 160000) at a path not declared in .gitmodules
#       -- a nested repo added by `git add -A`, as in 1a38404;
#   (b) a blob over $MAX_MB (default 20) -- the 79 MB sketch in the same commit;
#   (c) an added line carrying an API token (openrouter / anthropic / github).
# Git's own hooks are disabled in this checkout (.git/hooks/*.backup), and every
# agent write already passes through PreToolUse, so the gate lives here.
#
# Reads the hook JSON on stdin. Only `git [-C dir] ... commit` commands are
# inspected; the target repo is `dir` resolved against the hook's cwd.
# Exit 2 blocks the call with the message on stderr; anything else lets it run.
set -u

MAX_MB="${COMMIT_GUARD_MAX_MB:-20}"

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
[ -n "$CMD" ] || exit 0
[ -n "$CWD" ] || CWD=$(pwd)

# One physical line at a time: a chain like `git add x && git -C sub commit` may
# commit in several repos.
REPOS=()
while IFS= read -r line; do
  # split on ; && || | so each git invocation is seen on its own
  printf '%s\n' "$line" | sed -E 's/(&&|\|\||;|\|)/\n/g' | while IFS= read -r seg; do
    seg="${seg#"${seg%%[![:space:]]*}"}"
    case "$seg" in
      git\ *) ;;
      *) continue ;;
    esac
    printf '%s\n' "$seg" | grep -qE '(^| )commit( |$)' || continue
    dir=$(printf '%s\n' "$seg" | sed -nE 's/^git +-C +("([^"]*)"|'"'"'([^'"'"']*)'"'"'|([^ ]+)).*/\2\3\4/p')
    printf '%s\n' "${dir:-.}"
  done
done <<< "$CMD" > "${TMPDIR:-/tmp}/commit-guard-$$"
while IFS= read -r d; do [ -n "$d" ] && REPOS+=("$d"); done < "${TMPDIR:-/tmp}/commit-guard-$$"
rm -f "${TMPDIR:-/tmp}/commit-guard-$$"
[ "${#REPOS[@]}" -gt 0 ] || exit 0

PROBLEMS=()
for d in "${REPOS[@]}"; do
  case "$d" in /*) repo="$d" ;; *) repo="$CWD/$d" ;; esac
  git -C "$repo" rev-parse --git-dir >/dev/null 2>&1 || continue
  top=$(git -C "$repo" rev-parse --show-toplevel)

  declared=""
  [ -f "$top/.gitmodules" ] && declared=$(git -C "$top" config -f .gitmodules --get-regexp 'submodule\..*\.path' 2>/dev/null | awk '{print $2}')

  while IFS=$'\t' read -r meta path; do
    [ -n "$meta" ] || continue
    set -- $meta
    mode="$2"; sha="$4"; status="$5"
    [ "$status" = "D" ] && continue
    if [ "$mode" = "160000" ]; then
      if ! printf '%s\n' "$declared" | grep -qxF "$path"; then
        PROBLEMS+=("$top: '$path' is staged as a gitlink (nested repo) but is not in .gitmodules — unstage it (git rm --cached $path) or declare it")
      fi
      continue
    fi
    if [ "$mode" != "000000" ] && [ "$sha" != "0000000000000000000000000000000000000000" ]; then
      size=$(git -C "$repo" cat-file -s "$sha" 2>/dev/null || echo 0)
      if [ "$size" -gt $((MAX_MB * 1024 * 1024)) ]; then
        PROBLEMS+=("$top: '$path' is $((size / 1048576)) MB staged (limit ${MAX_MB} MB) — a blob this size is permanent history")
      fi
    fi
  done < <(git -C "$repo" diff --cached --raw --no-renames 2>/dev/null | sed -E 's/^:([^\t]*)\t/\1\t/')

  hits=$(git -C "$repo" diff --cached -U0 --no-color 2>/dev/null \
    | grep -E '^\+' | grep -vE '^\+\+\+ ' \
    | grep -oE '(sk-or-v1-[A-Za-z0-9]{16,}|sk-ant-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})' \
    | cut -c1-14 | sort -u)
  [ -n "$hits" ] && PROBLEMS+=("$top: staged diff adds what looks like an API token ($(printf '%s' "$hits" | tr '\n' ' ')…) — remove it, then rotate it")
done

[ "${#PROBLEMS[@]}" -gt 0 ] || exit 0
{
  echo "BLOCKED by scripts/commit-guard.sh:"
  for p in "${PROBLEMS[@]}"; do echo "  - $p"; done
  echo "Fix the index and re-run the commit. COMMIT_GUARD_MAX_MB=$MAX_MB overrides the size limit for one call."
} >&2
exit 2

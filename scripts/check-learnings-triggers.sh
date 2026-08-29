#!/usr/bin/env bash
# Lint every `triggers:`/`when-cwd:`/`when-model:` regex in knowledge/*.md frontmatter.
#
# The gate passes these regexes to `grep -E` verbatim against a match string of
# "<TOOL> <target>". Every check below encodes a failure mode that was measured
# in a real fire census: a regex that never matches anything (dead trigger), or
# one that matches almost everything (false-positive trigger).
#
#   usage: scripts/check-learnings-triggers.sh [--learnings-dir DIR]
#                                              [--settings FILE] [--notes]
#
# Exits nonzero if any trigger fails a check. `--notes` additionally lists the
# unanchored literal triggers, which are legal but worth reviewing.
set -u
export LC_ALL=C

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/learnings-match-string.sh
. "$HERE/lib/learnings-match-string.sh"

REPO_ROOT="$(cd "$HERE/.." && pwd)"
LEARN_DIR="$REPO_ROOT/knowledge"
SETTINGS="$REPO_ROOT/.claude/settings.json"
SHOW_NOTES=0

while [ $# -gt 0 ]; do
  case "$1" in
    --learnings-dir) LEARN_DIR="$2"; shift 2 ;;
    --settings) SETTINGS="$2"; shift 2 ;;
    --notes) SHOW_NOTES=1; shift ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 64 ;;
  esac
done

[ -d "$LEARN_DIR" ] || { echo "no such learnings dir: $LEARN_DIR" >&2; exit 64; }

PATS=$(mktemp)
trap 'rm -f "$PATS"' EXIT

ERRORS=0
report() { echo "$1"; ERRORS=$((ERRORS+1)); }

# ── check 1: the regex compiles under the grep the gate actually uses ───────
# A regex grep rejects is a dead trigger: the gate's `grep -qE` exits 2, which
# is falsy, so the learning silently stops gating anything.
for f in "$LEARN_DIR"/*.md; do
  [ -f "$f" ] || continue
  for key in triggers when-cwd when-model; do
    idx=0
    while IFS= read -r pat; do
      [ -z "$pat" ] && continue
      idx=$((idx+1))
      if ! printf '' | $GREP -qE -- "$pat" 2>/dev/null; then
        rc=$?
        if [ "$rc" -gt 1 ]; then
          report "$(basename "$f"): $key[$idx]: does not compile under $GREP -E"
          echo "    regex: $pat"
          continue
        fi
      fi
      printf '%s\t%s\t%s\t%s\n' "$(basename "$f")" "$key" "$idx" "$pat" >> "$PATS"
    done <<< "$(lms_extract_list "$f" "$key")"
  done
done

# ── check 5 input: which tool names can even reach the gate ────────────────
MATCHER=$(jq -r '.hooks.PreToolUse[]? | select(any(.hooks[]?.command // ""; test("learnings-gate\\.sh"))) | .matcher' \
            "$SETTINGS" 2>/dev/null | head -1)
[ -z "$MATCHER" ] && echo "WARN: no learnings-gate PreToolUse matcher in $SETTINGS; skipping reachability" >&2

PY_OUT=$(MATCHER="$MATCHER" python3 - "$PATS" <<'PY'
import os, re, sys

matcher = os.environ.get("MATCHER", "")
errors, notes = [], []

def split_top(pat):
    """Split on top-level `|` only, so grouped alternations stay together."""
    out, depth, cur, i = [], 0, "", 0
    while i < len(pat):
        c = pat[i]
        if c == "\\":
            cur += pat[i:i+2]; i += 2; continue
        if c == "[":
            j = pat.find("]", i+1)
            j = len(pat)-1 if j < 0 else j
            cur += pat[i:j+1]; i = j+1; continue
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
        elif c == "|" and depth == 0:
            out.append(cur); cur = ""; i += 1; continue
        cur += c; i += 1
    out.append(cur)
    return out

def anchored(pat):
    return "^" in pat or "[;&|]" in pat or "mcp__" in pat

def strip_optional_groups(pat):
    prev = None
    while prev != pat:
        prev = pat
        pat = re.sub(r"\([^()]*\)\?", "", pat)
    return pat

def expand(lit):
    """Enumerate a literal-with-flat-alternations, else return None."""
    if re.search(r"[.*+\[\]{}?]", lit.replace("\\.", "")):
        return None
    parts = [""]
    i = 0
    while i < len(lit):
        c = lit[i]
        if c == "(":
            j = lit.find(")", i)
            if j < 0:
                return None
            alts = lit[i+1:j].split("|")
            parts = [p + a for p in parts for a in alts]
            i = j + 1
        elif c in "|)":
            return None
        else:
            parts = [p + c for p in parts]
            i += 1
    return parts

def tool_prefix(pat):
    """The tool-name portion of a `^`-anchored trigger: up to the first
    unescaped space, or the whole pattern when it has none."""
    body = pat[1:]
    out, i = "", 0
    while i < len(body):
        if body[i] == "\\":
            out += body[i:i+2]; i += 2; continue
        if body[i] == " ":
            break
        out += body[i]; i += 1
    return out

# Intent of the bare-path heuristic: a trigger that is nothing but a
# filesystem path fires on read-only investigation (grep/cat/ls of the file)
# far more often than on the edit the learning is about. Anchor those to the
# write (`^(Edit|Write|MultiEdit) .*<path>`) instead. Distinctive uncommon
# literals — env var names, CamelCase symbols, CLI flags, API path fragments —
# are deliberately allowed: any occurrence of them is about the action.
EXT = re.compile(r"\\?\.[A-Za-z0-9]{1,6}(\$|/|$)")

def path_shaped(branch):
    if " " in branch:
        return False
    if "/" not in branch and not EXT.search(branch):
        return False
    if EXT.search(branch):
        return True
    return branch.rstrip("/").count("/") >= 2

for line in open(sys.argv[1]):
    fname, key, idx, pat = line.rstrip("\n").split("\t", 3)
    where = f"{fname}: {key}[{idx}]"

    # check 2: portability and escaping
    if "\\b" in pat:
        errors.append((where, pat, "uses `\\b`, which is not POSIX ERE; end the token with `( |$)`"))
    if "\\\\" in pat:
        errors.append((where, pat, "doubled backslash — triggers are not YAML-unescaped, so this matches a literal backslash and the trigger is dead"))
    for m in re.finditer(r"(?<!\\)\.", pat):
        nxt = pat[m.end():m.end()+1]
        prv = pat[max(0, m.start()-1):m.start()]
        if nxt in "*+?{":
            continue
        if re.match(r"[A-Za-z0-9_-]", nxt or "") and re.match(r"[A-Za-z0-9_-]", prv or ""):
            errors.append((where, pat, f"unescaped `.` inside a literal token (…{prv}.{nxt}…); write `\\.`"))
            break

    if key != "triggers":
        continue

    # check 3: an optional prefix group must not be the only anchor
    if "(" in pat and ")?" in pat and not anchored(strip_optional_groups(pat)):
        errors.append((where, pat, "optional `(...)?` prefix group: the regex collapses to its bare unanchored tail and matches everything the tail matches"))

    # check 6: the command anchor has to cover continuation lines. The gate
    # matches line by line, so `(^Bash |[;&|] )` cannot see an invocation that
    # starts on the second line of a multi-line command.
    if "(^Bash |[;&|] )" in pat:
        errors.append((where, pat, "command anchor misses invocations starting on a continuation line — write `(^Bash |^|[;&|] )`"))

    # check 4: bare path / bare substring
    for branch in split_top(pat):
        if anchored(branch):
            continue
        if path_shaped(branch):
            errors.append((where, pat, f"bare substring trigger: `{branch}` is a bare filesystem path — anchor it to the write, e.g. `^(Edit|Write|MultiEdit) .*{branch}`"))
            break
    else:
        if not anchored(pat):
            notes.append((where, pat))

    # check 5: a tool-name-anchored trigger must be able to reach the gate
    if pat.startswith("^") and matcher:
        prefix = tool_prefix(pat)
        cands = expand(prefix)
        if cands:
            unreachable = [c for c in cands if not re.search(matcher, c)]
            if unreachable:
                errors.append((where, pat, "tool name(s) never reach the gate — absent from the PreToolUse matcher: " + ", ".join(unreachable[:5])))

for where, pat, msg in errors:
    print(f"ERROR {where}: {msg}")
    print(f"    regex: {pat}")
print(f"__ERRORS__{len(errors)}")
if notes:
    print(f"__NOTES__{len(notes)}")
    for where, pat in notes:
        print(f"note  {where}: unanchored literal `{pat}` — fires wherever the text appears")
PY
)

if [ "$SHOW_NOTES" -eq 1 ]; then
  printf '%s\n' "$PY_OUT" | $GREP -v '^__' || true
else
  printf '%s\n' "$PY_OUT" | $GREP -v -e '^__' -e '^note  ' || true
fi
PY_ERRORS=$(printf '%s\n' "$PY_OUT" | $GREP -o '^__ERRORS__[0-9]*' | head -1 | tr -dc '0-9')
PY_NOTES=$(printf '%s\n' "$PY_OUT" | $GREP -o '^__NOTES__[0-9]*' | head -1 | tr -dc '0-9')
ERRORS=$((ERRORS + ${PY_ERRORS:-0}))

TOTAL=$(wc -l < "$PATS" | tr -d ' ')
echo ""
echo "checked $TOTAL trigger/when-cwd/when-model regexes in $(basename "$LEARN_DIR")/: $ERRORS error(s), ${PY_NOTES:-0} unanchored literal(s) (--notes to list)"
[ "$ERRORS" -eq 0 ]

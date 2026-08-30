#!/usr/bin/env bash
# Per-trigger lifecycle report over the learnings-gate fire log.
#
# One row per (learning, regex): how often it fired, how often that was a
# block, how many distinct sessions saw it, how often it re-blocked inside one
# session (a compaction artifact, not new signal), and a mechanical
# false-positive hint read off the logged match string.
#
#   usage: scripts/learnings-trigger-report.sh [--days N] [--all-tags] [--cwd-prefix DIR]
#
# Reads $LEARNINGS_FIRE_LOG (default $HOME/.claude/learnings-fires.tsv), whose
# columns are: epoch, session, decision, tool, learning, regex, cwd, match
# string, tag.
#
# The tag column holds space-separated tokens (`bulk`, `model=<m>`). Rows whose
# first token is `bulk` come from /improve-bulk sweep sub-sessions, which execute
# Bash under a replayed transcript rather than doing real work, so they are
# excluded unless --all-tags.
#
# The log is shared by every project on the machine, so rows are kept only when
# their cwd column starts with --cwd-prefix (default: this repo root).
#
# Reading the columns:
#   blocks    the only column that cost anyone anything
#   reblocks  extra blocks of the same learning inside one session
#   feedback  rows a human or agent marked as a bad fire
#   fp_hint   readonly     the blocked command only reads text
#             machine-path the write targets scratch or transcript space
#             prescribed   the blocked command is the one the learning teaches
#             mixed        more than one of the above across the group's blocks
set -u
export LC_ALL=C

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/.." && pwd)"
LOG="${LEARNINGS_FIRE_LOG:-$HOME/.claude/learnings-fires.tsv}"
DAYS=30
ALL_TAGS=0
CWD_PREFIX="$REPO_ROOT"

while [ $# -gt 0 ]; do
  case "$1" in
    --days) DAYS="$2"; shift 2 ;;
    --all-tags) ALL_TAGS=1; shift ;;
    --cwd-prefix) CWD_PREFIX="$2"; shift 2 ;;
    -h|--help) sed -n '2,29p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 64 ;;
  esac
done

[ -f "$LOG" ] || { echo "no fire log at $LOG (nothing has fired yet)"; exit 0; }

TAB=$(printf '\t')
NOW=$(date +%s)
CUTOFF=$((NOW - DAYS * 86400))

ROWS=$(mktemp)
trap 'rm -f "$ROWS"' EXIT

awk -F'\t' -v cutoff="$CUTOFF" -v alltags="$ALL_TAGS" -v root="$REPO_ROOT" -v cwdprefix="$CWD_PREFIX" '
function body(learning,   path, line, out) {
  if (learning in BODY) return BODY[learning]
  path = root "/" learning
  # rows written before the port name the dir learnings/; the files live in knowledge/
  if (system("test -f " path) != 0) { sub(/^learnings\//, "knowledge/", learning); path = root "/" learning }
  out = ""
  while ((getline line < path) > 0) out = out " " line
  close(path)
  BODY[learning] = out
  return out
}
function first_words(cmd, n,   i, parts, out) {
  split(cmd, parts, " ")
  out = ""
  for (i = 1; i <= n && i in parts; i++) out = (out == "" ? parts[i] : out " " parts[i])
  return out
}
function hint(tool, snip, learning,   cmd, w, lead) {
  lead = tool " "
  cmd = (index(snip, lead) == 1) ? substr(snip, length(lead) + 1) : snip
  if (tool == "Bash" || tool == "") {
    w = first_words(cmd, 1)
    if (w == "git") {
      if (index(RO_GIT, " " first_words(substr(cmd, 5), 1) " ")) return "readonly"
    } else if (index(RO, " " w " ")) return "readonly"
  }
  if (tool ~ /^(Edit|Write|MultiEdit|NotebookEdit)$/) {
    if (cmd ~ /(\/scratch\/|scratchpad|\.claude\/projects|^\/tmp\/|\/private\/tmp\/)/)
      return "machine-path"
  }
  w = first_words(cmd, 3)
  if (length(w) >= 8 && index(body(learning), w)) return "prescribed"
  return "-"
}
BEGIN {
  RO = " cat head tail less wc ls find file stat sort uniq cut tr column comm" \
       " diff grep rg egrep fgrep sed awk jq yq echo printf basename dirname" \
       " realpath type which xxd strings "
  RO_GIT = " log show diff status blame branch remote rev-parse ls-files describe "
}
NF < 8 { next }
$3 == "meta" { next }
{ tag = (NF >= 9 ? $9 : "-") }
!alltags && (tag == "bulk" || tag ~ /^bulk /) { next }
$1 + 0 < cutoff { next }
cwdprefix != "" && index($7, cwdprefix) != 1 { next }
{
  key = $5 "\t" $6
  keys[key] = 1
  fires[key]++
  seen[key SUBSEP $2] = 1
  if ($3 == "block") {
    blocks[key]++
    perses[key SUBSEP $2]++
    if ($1 + 0 > lastb[key]) lastb[key] = $1 + 0
    h = hint($4, $8, $5)
    if (h != "-") hints[key SUBSEP h] = 1
  } else if ($3 == "allowed") {
    allowed[key]++
  } else if ($3 == "feedback") {
    feedback[key]++
  }
}
END {
  for (k in keys) {
    ns = 0; rb = 0
    for (s in seen) { split(s, p, SUBSEP); if (p[1] == k) ns++ }
    for (s in perses) {
      split(s, p, SUBSEP)
      if (p[1] == k && perses[s] > 1) rb += perses[s] - 1
    }
    h = "-"
    for (x in hints) {
      split(x, p, SUBSEP)
      if (p[1] != k) continue
      h = (h == "-") ? p[2] : "mixed"
    }
    split(k, kp, "\t")
    printf "%s\t%d\t%d\t%d\t%d\t%d\t%d\t%s\t%d\t%s\n", \
      kp[1], blocks[k] + 0, fires[k] + 0, allowed[k] + 0, ns, rb, \
      feedback[k] + 0, h, lastb[k] + 0, kp[2]
  }
}
' "$LOG" > "$ROWS"

if [ ! -s "$ROWS" ]; then
  echo "no fires in the last $DAYS days in $LOG"
  exit 0
fi

epoch_to_date() {
  date -r "$1" +%F 2>/dev/null || date -d "@$1" +%F 2>/dev/null || echo "-"
}

{
  printf 'learning\tblocks\tfires\tallowed\tsessions\treblocks\tfeedback\tfp_hint\tlast_block\tregex\n'
  sort -t"$TAB" -k2,2nr -k3,3nr "$ROWS" \
    | while IFS="$TAB" read -r learning blocks fires allowed sessions reblocks fb hint lastb regex; do
        if [ "${lastb:-0}" -gt 0 ]; then lastb=$(epoch_to_date "$lastb"); else lastb="-"; fi
        printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
          "$learning" "$blocks" "$fires" "$allowed" "$sessions" "$reblocks" \
          "$fb" "$hint" "$lastb" "$regex"
      done
} | column -t -s"$TAB"

echo ""
echo "log: $LOG   window: last $DAYS days   cwd prefix: $CWD_PREFIX   bulk-tagged rows: $([ "$ALL_TAGS" -eq 1 ] && echo included || echo excluded)"

#!/usr/bin/env bash
# Replay every gated tool call in this project's Claude Code transcripts
# against a set of learnings triggers, and report what would fire.
#
# Answers "does this trigger change actually kill the false positives, and does
# it keep the true positives?" without waiting for the fires to happen again.
#
#   usage: scripts/replay-learnings-triggers.sh [mode] [options]
#
#   modes (exactly one)
#     --baseline              evaluate the working tree's knowledge/*.md
#     --candidate DIR         evaluate an alternate learnings dir
#     --trigger ERE           evaluate one regex, reported as `<cli>`
#
#   options
#     --project-dir DIR       transcript dir (default: this project's under
#                             $CLAUDE_CONFIG_DIR/projects, ~/.claude otherwise)
#     --days N                only calls from the last N days
#     --out-dir DIR           keep the intermediate artifacts here
#     --fields-from FILE      reuse a previous run's fields.tsv instead of
#                             re-extracting. Two runs compared row by row must
#                             share one extraction: transcripts grow while you
#                             work, so a fresh extraction renumbers the calls
#     --legacy                reproduce pre-Phase-2 match-string semantics:
#                             file writes match on the tool name alone, and the
#                             read-only-Bash and non-scratch write-path
#                             exemptions are off. Use with --candidate <old
#                             learnings> to reconstruct historical fires.
#     --settings FILE         settings.json holding the gate's PreToolUse
#                             matcher, which decides what counts as a gated tool
#     --show N                rows of per-fire detail to print (default 40)
#
# when-model is evaluated against `.message.model` on the transcript entry that
# carried the tool_use; `<synthetic>` counts as unknown. Entries with no model
# satisfy no when-model regex, matching the gate's fail-open behaviour.
#
# when-cwd is evaluated against the cwd recorded on the transcript entry that
# carried the tool_use, so scoping replays exactly. Calls whose entry has no
# cwd fall back to "-", which no when-cwd regex matches — those learnings are
# reported as not firing rather than as always firing.
set -u
export LC_ALL=C

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/learnings-match-string.sh
. "$HERE/lib/learnings-match-string.sh"
REPO_ROOT="$(cd "$HERE/.." && pwd)"

MODE=""
CAND_DIR=""
CLI_TRIGGER=""
PROJECT_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/$(printf %s "${CLAUDE_PROJECT_DIR:-$PWD}" | sed 's/[^a-zA-Z0-9]/-/g')"
DAYS=""
OUT_DIR=""
LEGACY=0
SETTINGS="$REPO_ROOT/.claude/settings.json"
SHOW=40
FIELDS_FROM=""

while [ $# -gt 0 ]; do
  case "$1" in
    --baseline) MODE=baseline; CAND_DIR="$REPO_ROOT/knowledge"; shift ;;
    --candidate) MODE=candidate; CAND_DIR="$2"; shift 2 ;;
    --trigger) MODE=trigger; CLI_TRIGGER="$2"; shift 2 ;;
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --days) DAYS="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --legacy) LEGACY=1; shift ;;
    --settings) SETTINGS="$2"; shift 2 ;;
    --show) SHOW="$2"; shift 2 ;;
    --fields-from) FIELDS_FROM="$2"; shift 2 ;;
    -h|--help) sed -n '2,40p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 64 ;;
  esac
done

[ -z "$MODE" ] && { echo "pick one of --baseline / --candidate DIR / --trigger ERE" >&2; exit 64; }
[ -d "$PROJECT_DIR" ] || { echo "no such project dir: $PROJECT_DIR" >&2; exit 64; }
[ "$MODE" = trigger ] || [ -d "$CAND_DIR" ] || { echo "no such knowledge dir: $CAND_DIR" >&2; exit 64; }

if [ -n "$OUT_DIR" ]; then
  mkdir -p "$OUT_DIR"
  WORK="$OUT_DIR"
else
  WORK=$(mktemp -d)
  trap 'rm -rf "$WORK"' EXIT
fi

MATCHER=$(jq -r '.hooks.PreToolUse[]? | select(any(.hooks[]?.command // ""; test("learnings-gate\\.sh"))) | .matcher' \
            "$SETTINGS" 2>/dev/null | head -1)
[ -z "$MATCHER" ] && MATCHER='Bash|Edit|Write|MultiEdit|NotebookEdit|mcp__'

# ── 1. extract gated tool calls ────────────────────────────────────────────
# \001/\002/\003 stand in for newline/tab/CR so each call is one row, and \037
# separates fields — tab is IFS whitespace, so `read` would collapse an empty
# field away. The bash loop restores the originals with parameter expansion,
# no fork per call.
if [ -n "$FIELDS_FROM" ]; then
  [ "$FIELDS_FROM" = "$WORK/fields.tsv" ] || cp "$FIELDS_FROM" "$WORK/fields.tsv"
else
MATCHER="$MATCHER" DAYS="$DAYS" python3 - "$PROJECT_DIR" > "$WORK/fields.tsv" <<'PYEXTRACT'
import glob, json, os, re, sys, time

proj = sys.argv[1]
matcher = re.compile(os.environ["MATCHER"])
days = os.environ.get("DAYS") or ""
cutoff = time.time() - float(days) * 86400 if days else None

def enc(s):
    if not isinstance(s, str):
        return ""
    return s.replace("\n", "\x01").replace("\t", "\x02").replace("\r", "\x03")

def ts_epoch(v):
    if not isinstance(v, str):
        return None
    try:
        return time.mktime(time.strptime(v[:19], "%Y-%m-%dT%H:%M:%S"))
    except Exception:
        return None

idx = 0
for path in sorted(glob.glob(os.path.join(proj, "*.jsonl"))):
    if cutoff and os.path.getmtime(path) < cutoff:
        continue
    base = os.path.basename(path)
    for line in open(path, errors="replace"):
        try:
            ev = json.loads(line)
        except Exception:
            continue
        msg = ev.get("message") or {}
        content = msg.get("content")
        if not isinstance(content, list):
            continue
        stamp = ev.get("timestamp") or ""
        if cutoff:
            e = ts_epoch(stamp)
            if e is not None and e < cutoff:
                continue
        cwd = ev.get("cwd") or "-"
        model = msg.get("model") or ""
        if model == "<synthetic>":
            model = ""
        for b in content:
            if not isinstance(b, dict) or b.get("type") != "tool_use":
                continue
            name = b.get("name") or ""
            if not matcher.search(name):
                continue
            inp = b.get("input")
            if not isinstance(inp, dict):
                inp = {}
            if name.startswith("mcp__"):
                prose = " ".join(
                    str(inp[k]) for k in ("body", "title", "description", "content")
                    if isinstance(inp.get(k), str) and inp.get(k)
                )
            elif name in ("Agent", "Task"):
                prose = str(inp.get("description") or "")
            else:
                prose = ""
            idx += 1
            print("\x1f".join([
                str(idx), base, name, enc(cwd), stamp,
                enc(inp.get("command", "")),
                enc(inp.get("file_path", "")),
                enc(inp.get("notebook_path", "")),
                enc(prose),
                enc(model),
                enc(str(inp.get("model") or "")),
                enc(str(inp.get("subagent_type") or "")),
            ]))
PYEXTRACT
fi

# ── 2. rebuild the match string through the shared lib ────────────────────
{
  while IFS=$'\037' read -r idx file tool cwd stamp cmd fp nb prose model agent_model agent_type; do
    [ -z "${idx:-}" ] && continue
    LMS_TOOL="$tool"
    LMS_CWD="${cwd//$'\001'/$'\n'}"
    LMS_IN_COMMAND="${cmd//$'\001'/$'\n'}"; LMS_IN_COMMAND="${LMS_IN_COMMAND//$'\002'/$'\t'}"
    LMS_IN_FILE_PATH="${fp//$'\001'/$'\n'}"
    LMS_IN_NOTEBOOK_PATH="${nb//$'\001'/$'\n'}"
    LMS_IN_BODY="${prose//$'\001'/$'\n'}"; LMS_IN_BODY="${LMS_IN_BODY//$'\002'/$'\t'}"
    LMS_IN_TITLE=""; LMS_IN_DESCRIPTION=""; LMS_IN_CONTENT=""
    LMS_IN_AGENT_MODEL="${agent_model:-}"; LMS_IN_AGENT_TYPE="${agent_type:-}"
    case "$tool" in
      Agent|Task) LMS_IN_DESCRIPTION="$LMS_IN_BODY"; LMS_IN_BODY="" ;;
    esac
    lms_build
    if [ "$LEGACY" -eq 1 ]; then
      # Pre-Phase-2: file writes were gated on the tool name alone, and the
      # only write-path exemption was scratch space.
      case "$tool" in
        Edit|Write|MultiEdit|NotebookEdit)
          LMS_CONTENT=""
          LMS_MATCH="$tool "
          LMS_EXEMPT=0; LMS_EXEMPT_WHY=""
          case "${fp:-}" in
            */scratch/*|scratch/*|*/scratchpad/*) LMS_EXEMPT=1; LMS_EXEMPT_WHY="write-path" ;;
          esac
          ;;
      esac
      [ "$LMS_EXEMPT_WHY" = "read-only" ] && { LMS_EXEMPT=0; LMS_EXEMPT_WHY=""; }
    fi
    m="${LMS_MATCH//$'\n'/$'\001'}"; m="${m//$'\t'/$'\002'}"
    c="${LMS_CWD} ${LMS_CONTENT}"; c="${c//$'\n'/$'\001'}"; c="${c//$'\t'/$'\002'}"
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$idx" "$file" "$tool" "$LMS_EXEMPT" "${LMS_EXEMPT_WHY:--}" "$m" "$c" "${model:-}"
  done < "$WORK/fields.tsv"
} > "$WORK/built.tsv"

# ── 3. the trigger set under test ──────────────────────────────────────────
: > "$WORK/patterns.tsv"
if [ "$MODE" = trigger ]; then
  printf '%s\t%s\t%s\n' '<cli>' 'triggers' "$CLI_TRIGGER" >> "$WORK/patterns.tsv"
else
  for f in "$CAND_DIR"/*.md; do
    [ -f "$f" ] || continue
    for key in triggers when-cwd when-model; do
      while IFS= read -r pat; do
        [ -z "$pat" ] && continue
        printf '%s\t%s\t%s\n' "$(basename "$f")" "$key" "$pat" >> "$WORK/patterns.tsv"
      done <<< "$(lms_extract_list "$f" "$key")"
    done
  done
fi

# ── 4. match, join, report ─────────────────────────────────────────────────
GREP="$GREP" SHOW="$SHOW" python3 - "$WORK" <<'PY'
import collections, os, subprocess, sys

work = sys.argv[1]
grep = os.environ.get("GREP", "/usr/bin/grep")
show = int(os.environ.get("SHOW", "40"))

calls = {}
order = []
for line in open(os.path.join(work, "built.tsv"), errors="replace"):
    p = line.rstrip("\n").split("\t")
    if len(p) < 7:
        continue
    idx, fname, tool, exempt, why, match, cwdmatch = p[:7]
    calls[idx] = dict(file=fname, tool=tool, exempt=exempt == "1", why=why,
                      match=match, cwdmatch=cwdmatch,
                      model=p[7] if len(p) > 7 else "")
    order.append(idx)

live = [i for i in order if not calls[i]["exempt"]]

def corpus(field, ids):
    """One physical line per line of the match string, mirroring the gate's
    `echo "$CMD" | grep -qE`, which matches line by line."""
    lines, owner = [], []
    for i in ids:
        for seg in calls[i][field].split("\x01"):
            lines.append(seg.replace("\x02", "\t"))
            owner.append(i)
    return lines, owner

for field, name in (("match", "match"), ("cwdmatch", "cwd"), ("model", "model")):
    lines, owner = corpus(field, live)
    with open(os.path.join(work, name + ".lines"), "w") as fh:
        fh.write("\n".join(lines) + ("\n" if lines else ""))
    with open(os.path.join(work, name + ".owner"), "w") as fh:
        fh.write("\n".join(owner) + ("\n" if owner else ""))

owners = {}
for name in ("match", "cwd", "model"):
    owners[name] = open(os.path.join(work, name + ".owner")).read().split("\n")

def hits(pat, name):
    flags = "-niE" if name == "model" else "-nE"
    r = subprocess.run([grep, flags, "--", pat, os.path.join(work, name + ".lines")],
                       capture_output=True, text=True)
    if r.returncode > 1:
        print(f"WARN regex rejected by grep: {pat}", file=sys.stderr)
        return set()
    out = set()
    for ln in r.stdout.splitlines():
        n = ln.split(":", 1)[0]
        try:
            out.add(owners[name][int(n) - 1])
        except (ValueError, IndexError):
            pass
    return out

trig = collections.defaultdict(list)
when = collections.defaultdict(list)
whenmodel = collections.defaultdict(list)
for line in open(os.path.join(work, "patterns.tsv"), errors="replace"):
    fname, key, pat = line.rstrip("\n").split("\t", 2)
    bucket = {"triggers": trig, "when-cwd": when, "when-model": whenmodel}.get(key)
    if bucket is not None:
        bucket[fname].append(pat)

per_trigger = collections.Counter()
per_learning = collections.Counter()
fires = collections.defaultdict(list)   # call idx -> [(learning, pat)]

for fname, pats in sorted(trig.items()):
    scope = None
    for key, corpus_name in (("when-cwd", "cwd"), ("when-model", "model")):
        pats_ = (when if key == "when-cwd" else whenmodel).get(fname)
        if not pats_:
            continue
        sub = set()
        for wp in pats_:
            sub |= hits(wp, corpus_name)
        scope = sub if scope is None else (scope & sub)
    for pat in pats:
        h = hits(pat, "match")
        if scope is not None:
            h &= scope
        per_trigger[(fname, pat)] = len(h)
        for i in h:
            if not any(l == fname for l, _ in fires[i]):
                per_learning[fname] += 1
                fires[i].append((fname, pat))

exempt_reasons = collections.Counter(calls[i]["why"] for i in order if calls[i]["exempt"])

print(f"calls extracted        {len(order)}")
print(f"exempt before matching {len(order) - len(live)}")
for why, n in exempt_reasons.most_common():
    print(f"    {why:<22} {n}")
print(f"evaluated              {len(live)}")
print(f"calls that fire        {len(fires)}")
print(f"fire rows (call x learning) {sum(len(v) for v in fires.values())}")
print("")
print("fires per learning")
for fname, n in per_learning.most_common():
    print(f"  {n:>6}  {fname}")
print("")
print("fires per trigger")
for (fname, pat), n in sorted(per_trigger.items(), key=lambda kv: -kv[1]):
    print(f"  {n:>6}  {fname}\t{pat}")

if show:
    print("")
    print("call\tsession_file\ttool\tlearnings\tregexes\tmatch")
    for i in order:
        if i not in fires:
            continue
        c = calls[i]
        ls = ",".join(l for l, _ in fires[i])
        ps = " | ".join(p for _, p in fires[i])
        m = c["match"].replace("\x01", " ").replace("\x02", " ")[:160]
        print(f"{i}\t{c['file']}\t{c['tool']}\t{ls}\t{ps}\t{m}")
        show -= 1
        if show <= 0:
            print("... (raise --show for more)")
            break
PY

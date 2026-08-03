#!/usr/bin/env python3
"""Analyze what fills the context window in a Claude Code session transcript.

Every content block in the user/assistant conversation thread is measured and
bucketed by source — tool results, tool-call inputs, assistant prose, channel
messages, system-reminders, user text — so you can see, for any time range,
which sources dominate context and spot malfunctioning / chatty ones that add a
lot of bloat (big or repetitive) for little value.

Usage:
  tools/analyze-tool-calls.py [SESSION.jsonl] [options]

  SESSION.jsonl   Transcript file. Default: newest in the lopecode project dir.
  --since ISO     Only blocks at/after this timestamp (e.g. 2026-05-30T17:00).
  --until ISO     Only blocks at/before this timestamp.
  --last DUR      Only the last DUR of the session (e.g. 30m, 2h, 90s).
  --top N         Rows in the table / bars (default 25).
  --tool NAME     Drill into one source: per-occurrence sizes + timestamps.
  --tools-only    Restrict to tool:* sources (the original tool-call view).

Token figures are estimates (chars / 4) tracking bytes injected into context —
"context impact", not billed tokens. Bookkeeping entries that never reach the
model (queue-operation, file-history-snapshot, ai-title, turn_duration, …) are
excluded; channel messages are counted where they actually land in the thread.
"""
import json, sys, re, glob, os, hashlib
from collections import defaultdict, Counter
from datetime import datetime, timedelta

PROJECT_DIR = os.path.expanduser(
    "~/.claude-personal/projects/-Users-tom-larkworthy-dev-lopecode-dev")

CHAN_RE = re.compile(r'<channel\s+source="[^"]*"\s+type="([^"]+)"'
                     r'(?:[^>]*\bname="([^"]+)")?', re.S)


def parse_ts(s):
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None
    except ValueError:
        return None


def parse_dur(s):
    m = re.fullmatch(r"(\d+)\s*([smhd])", s.strip())
    if not m:
        sys.exit(f"bad --last duration: {s!r} (use e.g. 30m, 2h, 90s)")
    return timedelta(seconds=int(m[1]) * {"s": 1, "m": 60, "h": 3600, "d": 86400}[m[2]])


def text_size(content):
    """Flatten a content payload to (chars, image_count)."""
    if content is None:
        return 0, 0
    if isinstance(content, str):
        return len(content), 0
    if isinstance(content, list):
        chars, imgs = 0, 0
        for b in content:
            if isinstance(b, dict):
                if b.get("type") == "text":
                    chars += len(b.get("text") or "")
                elif b.get("type") == "image":
                    imgs += 1
                else:
                    chars += len(json.dumps(b))
            else:
                chars += len(str(b))
        return chars, imgs
    return len(json.dumps(content)), 0


def classify_text(txt, role):
    """A free-text block → a source category (channel / reminder / prose)."""
    if "<channel source=" in txt:
        m = CHAN_RE.search(txt)
        if m:
            name = f":{m.group(2)}" if m.group(2) else ""
            return f"channel:{m.group(1)}{name}"
        return "channel:?"
    if "<system-reminder>" in txt:
        return "system_reminder"
    return "assistant_text" if role == "assistant" else "user_text"


def main():
    args = sys.argv[1:]
    opts, pos, flags = {"top": "25"}, [], set()
    i = 0
    while i < len(args):
        a = args[i]
        if a in ("--since", "--until", "--last", "--top", "--tool"):
            opts[a[2:]] = args[i + 1]; i += 2
        elif a == "--tools-only":
            flags.add("tools_only"); i += 1
        elif a in ("-h", "--help"):
            print(__doc__); return
        else:
            pos.append(a); i += 1

    path = pos[0] if pos else None
    if not path:
        files = sorted(glob.glob(os.path.join(PROJECT_DIR, "*.jsonl")),
                       key=os.path.getmtime, reverse=True)
        if not files:
            sys.exit("no transcript .jsonl found")
        path = files[0]
    if not os.path.exists(path):
        sys.exit(f"no such file: {path}")

    # pass 1: map tool_use id -> name (results reference it by id)
    use_name = {}
    for line in open(path):
        try:
            o = json.loads(line)
        except json.JSONDecodeError:
            continue
        m = o.get("message")
        if o.get("type") == "assistant" and isinstance(m, dict):
            for b in (m.get("content") or []):
                if isinstance(b, dict) and b.get("type") == "tool_use":
                    use_name[b.get("id")] = b.get("name", "?")

    # pass 2: classify every block in user/assistant entries
    # block -> (category, ts, chars, imgs)
    blocks = []
    for line in open(path):
        try:
            o = json.loads(line)
        except json.JSONDecodeError:
            continue
        t = o.get("type")
        if t not in ("user", "assistant"):
            continue
        ts = parse_ts(o.get("timestamp"))
        m = o.get("message")
        if not isinstance(m, dict):
            continue
        content = m.get("content")
        if isinstance(content, str):
            blocks.append((classify_text(content, t), ts, len(content), 0))
            continue
        for b in (content or []):
            if not isinstance(b, dict):
                continue
            bt = b.get("type")
            if bt == "tool_use":
                blocks.append((f"call:{b.get('name','?')}", ts,
                               len(json.dumps(b.get("input") or {})), 0))
            elif bt == "tool_result":
                chars, imgs = text_size(b.get("content"))
                blocks.append((f"tool:{use_name.get(b.get('tool_use_id'),'?')}",
                               ts, chars, imgs))
            elif bt == "text":
                blocks.append((classify_text(b.get("text") or "", t), ts,
                               len(b.get("text") or ""), 0))
            elif bt == "thinking":
                blocks.append(("assistant_thinking", ts,
                               len(b.get("thinking") or ""), 0))
            elif bt == "image":
                blocks.append(("image", ts, 0, 1))

    ts_all = [ts for _, ts, _, _ in blocks if ts]
    if not ts_all:
        sys.exit("no timestamped content found")
    tmin, tmax = min(ts_all), max(ts_all)
    since = parse_ts(opts.get("since"))
    until = parse_ts(opts.get("until"))
    if opts.get("last"):
        since = tmax - parse_dur(opts["last"])

    def keep(cat, ts):
        if ts is None:
            return False
        if since and ts < since:
            return False
        if until and ts > until:
            return False
        if "tools_only" in flags and not cat.startswith("tool:"):
            return False
        return True

    rows = defaultdict(lambda: {"n": 0, "chars": 0, "imgs": 0, "max": 0, "sizes": []})
    drill = []
    for cat, ts, chars, imgs in blocks:
        if not keep(cat, ts):
            continue
        r = rows[cat]
        r["n"] += 1; r["chars"] += chars; r["imgs"] += imgs
        r["max"] = max(r["max"], chars); r["sizes"].append(chars)
        if opts.get("tool") and cat == opts["tool"]:
            drill.append((ts, chars, imgs))
    if not rows:
        sys.exit("no content in the selected window")

    tok = lambda c: round(c / 4)
    total = sum(r["chars"] for r in rows.values())
    for r in rows.values():
        c = Counter(r["sizes"])
        dup = sum(sz * (k - 1) for sz, k in c.items() if sz > 0)
        r["dup"] = dup / r["chars"] * 100 if r["chars"] else 0

    w0, w1 = (since or tmin), (until or tmax)
    span_min = (w1 - w0).total_seconds() / 60
    multiday = w0.date() != w1.date() or tmin.date() != tmax.date()
    tf = "%Y-%m-%d %H:%M:%S" if multiday else "%H:%M:%S"
    sf = "%m-%d %H:%M" if multiday else "%H:%M"
    span = f"{span_min/60:.1f} h" if span_min >= 90 else f"{span_min:.0f} min"
    print(f"\nSession: {os.path.basename(path)}")
    print(f"Window:  {w0:{tf}} → {w1:{tf}}  ({span})")
    print(f"         full session {tmin:{sf}} – {tmax:{sf}}")
    print(f"Context: ~{tok(total):,} tokens across {sum(r['n'] for r in rows.values())} "
          f"blocks · {len(rows)} sources\n")

    order = sorted(rows.items(), key=lambda kv: kv[1]["chars"], reverse=True)
    N = int(opts["top"])

    # ---- visualization: horizontal bars of context share ----
    print("Context by source:")
    bw = 32
    top_share = order[0][1]["chars"] / total if total else 1
    for name, r in order[:N]:
        share = r["chars"] / total if total else 0
        bar = "█" * max(1, round(share / top_share * bw)) if r["chars"] else ""
        print(f"  {name[:34]:<34} {bar:<{bw}} {share*100:>4.0f}%  ~{tok(r['chars']):>7,} tok")

    # ---- detail table ----
    print(f"\n{'source':<34} {'n':>4} {'tot_tok':>9} {'avg':>7} {'max':>7} "
          f"{'%ctx':>5} {'dup%':>5} {'img':>4}")
    print("-" * 84)
    for name, r in order[:N]:
        avg = r["chars"] / r["n"]
        share = r["chars"] / total * 100 if total else 0
        flag = "  ⚠" if share >= 12 and (avg / 4 >= 1200 or r["dup"] >= 50) else ""
        print(f"{name[:34]:<34} {r['n']:>4} {tok(r['chars']):>9,} {tok(avg):>7,} "
              f"{tok(r['max']):>7,} {share:>4.0f}% {r['dup']:>4.0f}% {r['imgs']:>4}{flag}")

    # ---- headline + bloat ----
    top_n = max(rows.items(), key=lambda kv: kv[1]["n"])
    print(f"\nMost frequent: {top_n[0]} ({top_n[1]['n']}×)")
    print(f"Most context:  {order[0][0]} (~{tok(order[0][1]['chars']):,} tok, "
          f"{order[0][1]['chars']/total*100:.0f}%)")

    bloat = [(n, r) for n, r in order
             if r["chars"] / total >= 0.12
             and (r["chars"] / r["n"] / 4 >= 1200 or r["dup"] >= 50)]
    if bloat:
        print("\n⚠ Bloat (≥12% of context AND big or repetitive):")
        for n, r in bloat:
            why = []
            if r["chars"] / r["n"] / 4 >= 1200:
                why.append(f"avg ~{tok(r['chars']/r['n']):,} tok")
            if r["dup"] >= 50:
                why.append(f"{r['dup']:.0f}% duplicate")
            print(f"  • {n}: {tok(r['chars']):,} tok / {r['n']}×  ({', '.join(why)})")
    else:
        print("\nNo single source bloats context with oversized/repetitive payloads.")

    if drill:
        print(f"\nPer-occurrence for {opts['tool']}:")
        for ts, chars, imgs in sorted(drill):
            print(f"  {ts:%m-%d %H:%M:%S}  ~{tok(chars):>6,} tok"
                  + (f"  +{imgs} img" if imgs else ""))
    print()


if __name__ == "__main__":
    main()

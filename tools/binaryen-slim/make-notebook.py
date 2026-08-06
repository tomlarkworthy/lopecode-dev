#!/usr/bin/env python3
"""Assemble lopebooks/notebooks/assembly_script.html.

Base is the coded-landmark-tracking notebook (right core: save-in-place, lopepage-2,
annotate, claude-code-pairing, prerender on) with its own module and every one of its
attachments removed, then the assembly-script module and the slim toolchain added.
"""
import base64, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BASE = os.path.join(ROOT, "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html")
OUT  = os.path.join(ROOT, "lopebooks/notebooks/assembly_script.html")
MOD  = "@tomlarkworthy/assembly-script"
DIST = os.path.join(os.path.dirname(__file__), "dist")

# None = lift the bytes out of the base notebook rather than rebuild them
ATTACHMENTS = [
    ("binaryen-slim-131.js.gz",      os.path.join(DIST, "binaryen-slim-131.js.gz")),
    ("binaryen-slim-131.wasm.gz",    os.path.join(DIST, "binaryen-slim-131.wasm.gz")),
    ("asc-0.28.20.js.gz",            None),
    ("assemblyscript-0.28.20.js.gz", None),
    ("long-5.3.2.js.gz",             None),
]

s = open(BASE, encoding="utf8").read()
start_len = len(s)


def blocks(text):
    """(id, start, body_start, end) for every <script id="..."> block."""
    for m in re.finditer(r'<script\s[^>]*?id="([^"]+)"[^>]*?>', text):
        end = text.find("</script>", m.end())
        yield m.group(1), m.start(), m.end(), end + len("</script>")


def body_of(text, bs, end):
    return text[bs:end - len("</script>")]


def find_bootconf(text):
    """The real bootconf block — the exporter's own source also contains the string."""
    for sid, a, bs, end in blocks(text):
        if sid != "bootconf.json":
            continue
        try:
            return a, bs, end, json.loads(body_of(text, bs, end).strip())
        except Exception:
            continue
    return None


# ---- lift the compiler attachments we are keeping, before deleting anything ----
lifted = {}
for sid, a, bs, end in blocks(s):
    for name, path in ATTACHMENTS:
        if path is None and sid.endswith("/" + name):
            lifted[name] = base64.b64decode(body_of(s, bs, end).strip())
missing = [n for n, p in ATTACHMENTS if p is None and n not in lifted]
if missing:
    sys.exit("could not lift from the base notebook: %s" % missing)

# ---- drop the coded-landmark module and all of its attachments ----
drop = [(a, end) for sid, a, bs, end in blocks(s)
        if sid == "@tomlarkworthy/coded-landmark-tracking"
        or sid.startswith("@tomlarkworthy/coded-landmark-tracking/")]
for a, end in sorted(drop, reverse=True):
    s = s[:a] + s[end:]
print("dropped %d blocks, %.2fMB -> %.2fMB" % (len(drop), start_len / 1e6, len(s) / 1e6))

# ---- build the replacement blocks ----
parts = []
for name, path in ATTACHMENTS:
    data = open(path, "rb").read() if path else lifted[name]
    parts.append('<script id="%s/%s" \n  type="text/plain"\n  data-encoding="base64"\n'
                 '  data-mime="application/gzip"\n>%s</script>\n'
                 % (MOD, name, base64.b64encode(data).decode("ascii")))
    print("  attach %-30s %7.3fMB" % (name, len(data) / 1e6))

module_src = open(os.path.join(ROOT, "modules", MOD + ".js"), encoding="utf8").read()
if "</scr" + "ipt>" in module_src:
    sys.exit("module source contains a literal closing script tag")
parts.append('<script id="%s" \n  type="text/plain"\n  data-mime="application/javascript"\n>\n%s</script>\n'
             % (MOD, module_src))

# ---- splice the new blocks in just before bootconf ----
found = find_bootconf(s)
if not found:
    sys.exit("no parseable bootconf.json block in the base")
a, bs, end, conf = found
s = s[:a] + "".join(parts) + s[a:]

# ---- rewrite bootconf ----
found = find_bootconf(s)
a, bs, end, conf = found
conf["mains"] = ["@tomlarkworthy/save-in-place", "@tomlarkworthy/lopepage-2",
                 "@tomlarkworthy/annotate", MOD]
conf["hash"] = ("#view=R100(S60(%s),S20(@tomlarkworthy/annotate),"
                "S20(@tomlarkworthy/claude-code-pairing))" % MOD)
s = s[:bs] + "\n" + json.dumps(conf, indent=2) + "\n" + s[end - len("</script>"):]
print("bootconf mains:", conf["mains"])

# ---- title ----
s = re.sub(r"<title>[^<]*</title>", "<title>AssemblyScript Compiler</title>", s, count=1)

open(OUT, "w", encoding="utf8").write(s)
print("wrote %s  %.2fMB" % (os.path.relpath(OUT, ROOT), len(s) / 1e6))
print("next: bun tools/lope-sync.ts spec-sync --rebuild %s   (the pre-commit hook needs it)"
      % os.path.relpath(OUT, ROOT))

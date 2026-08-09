# Insert the section machinery and convert every numbered heading into its own
# sec() cell.
#
# The first attempt scanned for the literal "`);};" terminator and corrupted the
# one md cell whose prose contains an escaped backtick (the Arducam camera model
# in Next steps). This walks the template character by character, honouring
# backslash escapes and ${} interpolation, so a backtick inside the prose cannot
# be mistaken for the end of the cell.
import re, sys
P = "modules/@tomlarkworthy/coded-landmark-tracking.js"
src = open(P).read()
if "_sections = function" in src:
    sys.exit("machinery already present -- refusing to double-apply")

MAP = [
 ("_ns9hhpe", "scanner"), ("_oydmgri", "about"),
 ("_1h5er0z", "mark"), ("_js23sh", "multi"),
 ("_nb1x", "eval"), ("_vlfyqr", "labels"), ("_1ffq68r", "nearmiss"),
 ("_tkkz5a", "score"), ("_1xylr2t", "overlay"),
 ("_nb3x", "detect"), ("_7a2tij3", "pattern"), ("_nb4x", "scanline"),
 ("_4liiby", "combine"), ("_11vsmkp", "ortho"), ("_nb5x", "pose"),
 ("_1v692pi", "fast"), ("_wsmw0", "faster"), ("_whdwrzx", "relabel"),
 ("_nb2x", "tests"), ("_nb6x", "next"),
 ("_1k65scp", "lattice"), ("_h0321j", "constrains"),
]
BYPID = dict(MAP)

def scan_template(s, i):
    """i points just past the opening backtick. Return index OF the closing backtick."""
    depth = 0
    while i < len(s):
        c = s[i]
        if c == "\\":
            i += 2; continue
        if c == "$" and i + 1 < len(s) and s[i+1] == "{":
            depth += 1; i += 2; continue
        if c == "}" and depth:
            depth -= 1; i += 1; continue
        if c == "`" and depth == 0:
            return i
        i += 1
    raise SystemExit("unterminated template")

out = []
pos = 0
converted = []
pat = re.compile(r'const (_\w+) = function (\w+)\(md\) \{return \(md`', re.M)
for m in pat.finditer(src):
    pid = m.group(1)
    if pid not in BYPID:
        continue
    key = BYPID[pid]
    body_start = m.end()
    close = scan_template(src, body_start)
    tail = src[close:close+5]
    assert tail == "`);};", (pid, repr(tail))
    body = src[body_start:close]
    first_nl = body.find("\n")
    head = body if first_nl < 0 else body[:first_nl]
    assert head.lstrip().startswith("#"), (pid, head[:40])
    # lstrip only: a trailing backslash escapes the final newline (a markdown
    # hard break in the Next steps cell), and rstripping it would make that
    # backslash escape the closing backtick instead.
    rest = ("" if first_nl < 0 else body[first_nl+1:]).lstrip("\n")
    secvar = f"_sec_{key}"
    repl = f'const {secvar} = function _anonymous(sec) {{return (sec("{key}"));}};'
    if rest.strip():
        repl += f'\nconst {pid} = function {m.group(2)}(md) {{return (md`{rest}`);}};'
    out.append(src[pos:m.start()]); out.append(repl)
    pos = close + 5
    converted.append((secvar, key, pid, bool(rest.strip())))
out.append(src[pos:])
src = "".join(out)

machinery = open("scratch/rmbt/section-machinery.js").read()
anchor_decl = "const _ns9hhpe = function _anonymous(md)"
if anchor_decl in src:
    src = src.replace(anchor_decl, machinery + anchor_decl, 1)
else:   # _ns9hhpe became a sec cell with no body
    a = src.index("const _sec_scanner = function")
    src = src[:a] + machinery + src[a:]

for secvar, key, pid, had_body in converted:
    mm = re.search(r'^\s*\$def\("%s",' % re.escape(pid), src, re.M)
    if not mm: sys.exit("no $def for " + pid)
    src = src[:mm.start()] + f'\n  $def("{secvar}", null, ["sec"], {secvar});  ' + src[mm.start():]
    if not had_body:
        src = re.sub(r'\n\s*\$def\("%s",[^\n]*' % re.escape(pid), "", src, count=1)

anchor = '  $def("_ebocnh", "headline_md", ["md"], _ebocnh);  \n'
assert anchor in src
src = src.replace(anchor, anchor +
  '  $def("_sections", "sections", [], _sections);  \n'
  '  $def("_sectionIndex", "sectionIndex", ["sections"], _sectionIndex);  \n'
  '  $def("_sec", "sec", ["sectionIndex","htl"], _sec);  \n'
  '  $def("_ref", "ref", ["sectionIndex","htl"], _ref);  \n'
  '  $def("_toc", "toc", ["sectionIndex","htl"], _toc);  \n', 1)

open(P, "w").write(src)
print(f"converted {len(converted)} headings "
      f"({sum(1 for c in converted if not c[3])} in place, "
      f"{sum(1 for c in converted if c[3])} split from body prose)")

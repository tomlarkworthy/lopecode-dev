# Split each numbered heading out of its md cell into its own sec() cell.
#
# Heading-only cells become sec() cells in place, keeping their pid so the
# exporter and any saved layout keep addressing the same cell. Cells that carry
# a heading AND body prose are split in two: a new sec() cell, then the original
# cell with the heading line removed. That also fixes a house-style problem --
# those cells were doing two jobs.
import re, json
P = "modules/@tomlarkworthy/coded-landmark-tracking.js"
src = open(P).read()

# pid -> section key, in document order.
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
lines = src.split("\n")
out, new_defs, split_count, inplace_count = [], [], 0, 0
i = 0
while i < len(lines):
    ln = lines[i]
    m = re.match(r'^const (_\w+) = function (\w+)\(md\) \{return \(md`(.*)$', ln)
    key = None
    if m and any(m.group(1) == pid for pid, _ in MAP):
        pid = m.group(1)
        key = dict(MAP)[pid]
        # collect the whole template
        buf = [m.group(3)]; j = i
        while "`);};" not in buf[-1]:
            j += 1
            if j >= len(lines): raise SystemExit("unterminated md at line %d" % (i+1))
            buf.append(lines[j])
        body = "\n".join(buf)
        body = body[: body.rindex("`);};")]
        blines = body.split("\n")
        assert blines[0].lstrip().startswith("#"), (pid, blines[0])
        rest = "\n".join(blines[1:]).strip("\n")
        secvar = f"_sec_{key}"
        new_defs.append((secvar, key, pid, bool(rest.strip())))
        out.append(f'const {secvar} = function _anonymous(sec) {{return (sec("{key}"));}};')
        if rest.strip():
            out.append(f'const {pid} = function {m.group(2)}(md) {{return (md`{rest}`);}};')
            split_count += 1
        else:
            inplace_count += 1
        i = j + 1
        continue
    out.append(ln)
    i += 1

src = "\n".join(out)

# Register the new sec cells in define(), each immediately before the cell it
# used to be part of (or where that cell was, if it vanished).
for secvar, key, pid, had_body in new_defs:
    pat = re.compile(r'^(\s*)\$def\("%s",' % re.escape(pid), re.M)
    mm = pat.search(src)
    reg = f'  $def("{secvar}", null, ["sec"], {secvar});  \n'
    if mm:
        src = src[:mm.start()] + reg + src[mm.start():]
    else:
        raise SystemExit("no $def for " + pid)
    if not had_body:
        # original cell is gone; drop its registration
        src = re.sub(r'^\s*\$def\("%s",[^\n]*\n' % re.escape(pid), "", src, count=1, flags=re.M)

# Register the machinery itself, right after the headline cell registration.
anchor = '  $def("_ebocnh", "headline_md", ["md"], _ebocnh);  \n'
assert anchor in src, "headline registration not found"
src = src.replace(anchor, anchor +
  '  $def("_sections", "sections", [], _sections);  \n'
  '  $def("_sectionIndex", "sectionIndex", ["sections"], _sectionIndex);  \n'
  '  $def("_sec", "sec", ["sectionIndex","htl"], _sec);  \n'
  '  $def("_ref", "ref", ["sectionIndex","htl"], _ref);  \n'
  '  $def("_toc", "toc", ["sectionIndex","htl"], _toc);  \n', 1)

open(P, "w").write(src)
print(f"converted {len(new_defs)} headings: {inplace_count} in place, {split_count} split from body prose")

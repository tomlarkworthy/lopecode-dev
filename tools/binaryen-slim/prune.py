#!/usr/bin/env python3
"""Prune binaryen down to what AssemblyScript's asc can actually reach.

Stages are cumulative:
  1  drop pass registrations (and sources) for passes no in-tree code adds by name
  2  + drop the wasm2js/asm.js backend
  3  + drop the .wat text parser

The keep-list is derived, not hand-written: any pass name that appears in an
add("...") / addIfNoDWARFIssues("...") call anywhere in libbinaryen is kept, plus
the few asc requests directly (trap-mode-*) and the strip/print utilities.
"""
import re, os, sys, glob, json

SRC = sys.argv[1]
STAGE = int(sys.argv[2])

def read(p):  return open(os.path.join(SRC, p), errors="replace").read()
def write(p, s): open(os.path.join(SRC, p), "w").write(s)

# ---- derive keep / drop -----------------------------------------------------
passcpp = read("src/passes/pass.cpp")

def calls(text, fname):
    """yield (start, end, body) for each fname(...) call, paren-matched."""
    for m in re.finditer(r"\b%s\s*\(" % fname, text):
        i, depth = m.end(), 1
        while depth:
            if text[i] == "(": depth += 1
            elif text[i] == ")": depth -= 1
            i += 1
        while i < len(text) and text[i] in " ;\n": i += 1
        yield m.start(), i, text[m.end():i]

regs = []
for a, b, body in list(calls(passcpp, "registerPass")) + list(calls(passcpp, "registerTestPass")):
    n = re.search(r'"([^"]+)"', body); f = re.search(r"\b(create\w+)", body)
    if n and f: regs.append((n.group(1), f.group(1), a, b))

defining = {}
for f in glob.glob(os.path.join(SRC, "src/**/*.cpp"), recursive=True):
    if "/tools/" in f: continue
    for m in re.finditer(r"Pass\*\s+(create\w+)\s*\(", open(f, errors="replace").read()):
        defining.setdefault(m.group(1), os.path.relpath(f, SRC))

added = set()
for f in glob.glob(os.path.join(SRC, "src/**/*.cpp"), recursive=True) + \
         glob.glob(os.path.join(SRC, "src/**/*.h"), recursive=True):
    if "/tools/" in f: continue
    if STAGE >= 2 and os.path.relpath(f, SRC) in ("src/wasm2js.h",): continue  # its adds don't count
    added |= set(re.findall(r'\.?\badd(?:IfNoDWARFIssues)?\(\s*"([a-z][a-z0-9-]{2,40})"',
                            open(f, errors="replace").read()))

KEEP_ALWAYS = {"trap-mode-clamp", "trap-mode-js",           # asc --trapMode
               "print", "print-minified", "print-full",      # emitText / debugging
               "strip-debug", "strip-producers", "strip-target-features", "strip-dwarf"}
# AssemblyScript drives its own pipeline from JS (module.runPasses([...])), which no
# C++ scan can see. as_js_passes.json is every registered pass name appearing as a
# string literal in assemblyscript.js / asc.js. Omitting these is what made the first
# pruned build die with "Could not find pass: inlining".
if os.path.exists("as_js_passes.json"):
    KEEP_ALWAYS |= set(json.load(open("as_js_passes.json")))
keep_names = (added | KEEP_ALWAYS) & {n for n, _, _, _ in regs}
drop = [(n, fn, a, b) for n, fn, a, b in regs if n not in keep_names]

# a source file is droppable only if none of its passes are kept
keep_files = {defining.get(fn) for n, fn, _, _ in regs if n in keep_names}
drop_files = sorted({defining.get(fn) for n, fn, _, _ in drop if defining.get(fn)} - keep_files)

# ---- 1. strip registrations -------------------------------------------------
out, last = [], 0
for n, fn, a, b in sorted(drop, key=lambda r: r[2]):
    out.append(passcpp[last:a]); out.append("/* pruned: %s */\n  " % n); last = b
out.append(passcpp[last:])
write("src/passes/pass.cpp", "".join(out))

# ---- 2. strip sources from the build ---------------------------------------
cm = read("src/passes/CMakeLists.txt")
for f in drop_files:
    cm = re.sub(r"^\s*%s\s*$\n" % re.escape(os.path.basename(f)), "", cm, flags=re.M)
write("src/passes/CMakeLists.txt", cm)

removed = []
for f in drop_files:
    p = os.path.join(SRC, f)
    if os.path.exists(p): os.remove(p); removed.append(f)

# ---- stage 2: wasm2js ------------------------------------------------------
def drop_c_fn(text, sig):
    """delete a whole top-level C function definition starting at `sig`."""
    i = text.find(sig)
    if i < 0: return text, False
    j = text.index("{", i); depth = 0
    while True:
        if text[j] == "{": depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0: break
        j += 1
    return text[:i] + text[j+1:], True

notes = []
if STAGE >= 2:
    c = read("src/binaryen-c.cpp")
    for sig in ["void BinaryenModulePrintAsmjs(",
                "size_t BinaryenModuleWriteAsmjs(",
                "char* BinaryenModuleAllocateAndWriteAsmjs("]:
        c, ok = drop_c_fn(c, sig); notes.append("%s %s" % ("cut" if ok else "absent", sig))
    c = re.sub(r'^#include "wasm2js\.h"\n', "", c, flags=re.M)
    write("src/binaryen-c.cpp", c)
    js = read("src/js/binaryen.js-post.js")
    js = re.sub(r"^\s*(self|Module)\['emitAsmjs'\][\s\S]*?^\s*\};\n", "", js, flags=re.M)
    write("src/js/binaryen.js-post.js", js)

# ---- stage 3: text parser ---------------------------------------------------
if STAGE >= 3:
    c = read("src/binaryen-c.cpp")
    for sig in ["BinaryenModuleRef BinaryenModuleParse(",
                "BinaryenModuleRef BinaryenModuleParseWithFeatures("]:
        c, ok = drop_c_fn(c, sig); notes.append("%s %s" % ("cut" if ok else "absent", sig))
    write("src/binaryen-c.cpp", c)
    js = read("src/js/binaryen.js-post.js")
    js = re.sub(r"^\s*Module\['parseText'\][\s\S]*?^\s*\};\n", "", js, flags=re.M)
    write("src/js/binaryen.js-post.js", js)

print(json.dumps({
    "stage": STAGE,
    "registered": len(regs),
    "kept_names": len(keep_names),
    "dropped_names": len(drop),
    "removed_sources": len(removed),
    "removed_source_kb": round(sum(os.path.getsize(os.path.join(SRC, f)) for f in drop_files if False) / 1e3, 1),
    "notes": notes,
}, indent=1))

import io, sys, os
# df16 = df15 + attest/core. Run from tools/robocoop-5/eval/. Each anchor must occur EXACTLY once.
src = "robocoop-5-eval-bigcap-df15.html"
dst = "robocoop-5-eval-bigcap-df16.html"
here = os.path.dirname(os.path.abspath(__file__))
block = open(os.path.join(here, "df16-attest-block.js")).read().rstrip("\n")
s = open(src).read()

def sub(s, anchor, new):
    n = s.count(anchor)
    assert n == 1, "anchor occurs %d times: %r" % (n, anchor[:80])
    return s.replace(anchor, new)

# 1. attest / core_status / the __rc5Core* globals, inside the srctools `crossTools` cell (_crsschk)
A1 = "  return [cross_check];\n};"
s = sub(s, A1, block + "\n  return [\n    cross_check,\n    attest,\n    core_status\n  ];\n};")

# 2. the guard: after the cross-check rule, before the time floor
A2 = "if (xc) return xc; const floor = globalThis.__rc5MinTurnMs ?? 1200000;"
s = sub(s, A2, "if (xc) return xc; const cs = (() => { try { const f = globalThis.__rc5CoreGuard; return typeof f === 'function' ? f() : null; } catch (e) { return null; } })(); if (cs) return cs; const floor = globalThis.__rc5MinTurnMs ?? 1200000;")

# 3. the env note the agent reads (system prompt, CROSSING RULE paragraph)
A3 = "task_complete is refused until two such cross-checks pass."
s = sub(s, A3, "task_complete is refused until two such cross-checks pass.\n\nVERIFIED CORE: attest(module, cell, evidence) records that a cell is correct because an EVIDENCE cell \\u2014 one\nthat depends on it, plants an input whose answer is known and returns >= 3 rows each with a boolean pass, all\ntrue \\u2014 computed and passed; kind defaults to reference, and may be crossing (evidence is the name of a\npassing cross_check), metamorphic, library, or proof (the argument as free text, the weakest, counts as half).\ncore_status(module) reports which cells are GIVEN (they load the task data, or are zero-input constants),\nwhich are in the CORE (every upstream cell given or core, plus two fresh attestations from distinct evidence\ncells) and what each blocked cell still needs; task_complete is refused until every cell the deliverable\ndepends on is in the core, and editing a cell drops its attestations.")

open(dst, "w").write(s)
print("wrote", dst, len(s), "bytes;", len(s) - len(open(src).read()), "added")

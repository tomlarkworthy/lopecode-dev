# -*- coding: utf-8 -*-
# df34 = df33 + two fixes to the df33 evidence-provenance contract, found on walk ah turn 5
# (2026-09-24 04:51). Each is separately anchored below.
#
# (D1) destroy() permuted every column across records, which keeps each numeric column's MULTISET.
# An evidence that plants its own signal onto a real target's TIME STAMPS (walk ah's realAnchorRef)
# sees the same set of times on destroyed data, gets the same verdict, and was demoted `insensitive`.
# df34: numeric columns (record fields, columns of equal-length rows, numeric arrays, typed arrays, CSV
# columns that parse as numbers) are REDRAWN uniformly within their own [min, max] with the seeded RNG
# — integer columns stay integer, NaN/null/undefined keep their place, a constant column stays
# constant. Non-numeric columns are still permuted. Source: tbs/df34-destroy-block.js, which replaces
# the df33 block's text from `const isPlainObj` to the end of `const destroy`.
#
# (D2) A real-anchored nullcheck satisfied rule 3 on its own, so a cell entered the core on a
# synthetic reference plus a shuffled-real null (walk ah: `lombScargle: IN CORE (evidence:
# synthPeriodRef, realAnchorRef[demoted], realNullRef)`, `anchored: yes (by realNullRef)`). df34:
# rule 3 needs a real-anchored fresh attestation of a kind OTHER than the nullcheck; a null's
# anchoring is still computed, reported (`anchored: null only (<ev>)`) and counts toward the kind
# rule, but cannot complete a cell.
#
# Run from tools/robocoop-5/eval/. Each anchor must occur EXACTLY once.
import os

src = "robocoop-5-eval-bigcap-df33.html"
dst = "robocoop-5-eval-bigcap-df34.html"
here = os.path.dirname(os.path.abspath(__file__))
s0 = open(src, encoding="utf8").read()
s = s0


def sub(s, anchor, new):
    n = s.count(anchor)
    assert n == 1, "anchor occurs %d times: %r" % (n, anchor[:90])
    return s.replace(anchor, new)


# ============================================================ (D1) destroy() redraws numeric columns
old_block = open(os.path.join(here, "df33-anchor-block.js"), encoding="utf8").read()
i = old_block.index("  const isPlainObj = x =>")
j = old_block.index("  // A function-cell loader (load_target(i))")
old_destroy = old_block[i:j].rstrip("\n")
new_destroy = open(os.path.join(here, "df34-destroy-block.js"), encoding="utf8").read().rstrip("\n")
s = sub(s, old_destroy, new_destroy)

# ============================================================ (D2) a null alone cannot anchor a cell
# ---- D2a. coreOf: anchorBy excludes nullchecks; nullBy records a real-anchored null.
A = """      for (const [v, w] of info) {
        const e = (w.fresh || []).find(x => anchorStatusOf(x, rdCache) === 'real-anchored');
        anchorBy.set(v, e ? e.evidence : null);
      }"""
s = sub(s, A, """      for (const [v, w] of info) {
        const e = (w.fresh || []).find(x => x.kind !== 'null' && anchorStatusOf(x, rdCache) === 'real-anchored');
        anchorBy.set(v, e ? e.evidence : null);
        if (!e) {
          const nu = (w.fresh || []).find(x => x.kind === 'null' && anchorStatusOf(x, rdCache) === 'real-anchored');
          if (nu)
            nullBy.set(v, nu.evidence); // df34
        }
      }""")
A = "    const anchorBy = new Map(); // df33: v -> the evidence that anchors it, or null\n"
s = sub(s, A, A + "    const nullBy = new Map(); // df34: v -> a real-anchored nullcheck, when that is all it has\n")

# ---- D2b. the blocked sentence: the null-only form when a real null is all the cell has.
A = "        parts.unshift(anchorSentence(disp(v))); // df33"
s = sub(s, A, "        parts.unshift(nullBy.has(v) ? anchorNullSentence(disp(v)) : anchorSentence(disp(v))); // df33, df34")

# ---- D2c. the anchoring table: yes (by ev) / null only (ev) / NO.
A = "o[disp(v)] = e ? 'yes (by ' + e + ')' : 'NO';"
s = sub(s, A, "o[disp(v)] = e ? 'yes (by ' + e + ')' : nullBy.has(v) ? 'null only (' + nullBy.get(v) + ')' : 'NO';")

# ---- D2d. the attest line for a real-anchored nullcheck says it cannot complete the cell alone.
A = "(a.nullcheck ? '; a nullcheck is anchored without a sensitivity run' :"
s = sub(s, A, "(a.nullcheck ? '; a nullcheck is anchored without a sensitivity run \\u2014 anchored (null only): it cannot complete ' + cellName + ' alone, the core also needs one executed reference/metamorphic/crossing on the task\\'s data (df34)' :")

# ---- D2e. the sentence itself, next to df33's.
A = "  globalThis.__rc5AnchorDestroy = destroy;\n"
s = sub(s, A, """  const anchorNullSentence = n => 'no REAL-ANCHORED evidence beyond a null: a shuffled-real null shows ' + n + ' does not invent signals; the core also needs one executed reference/metamorphic/crossing whose inputs include the task\\'s data and whose verdict depends on it (df34)';
""" + A)

open(dst, "w", encoding="utf8").write(s)
print("wrote", dst, len(s), "bytes;", len(s) - len(s0), "added")

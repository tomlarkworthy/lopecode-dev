# -*- coding: utf-8 -*-
# df28 = df27 + a BOOT MEMO for slow data cells, keyed by the transitive definition hash.
#
# Measured 2026-09-07 14:25: every walk turn opens a fresh page and every evidence cell is a data
# cell, so all of them recompute at boot — 40 s at the start of walk u, ~170 s once a classifier had
# three synthetic evidence cells, ~250 s after a 25-target shuffle null and a sensitivity sweep were
# added (walk z), out of a 900 s turn. The data does not change within a walk and the cells are
# deterministic, so df28 caches the VALUE of any named non-function cell that took more than 5 s,
# under a key that is the hash of its own definition text plus the transitive hash of every named
# input in its module. The ledger the driver already carries between turns carries the memo too.
#
# Run from tools/robocoop-5/eval/. Each anchor must occur EXACTLY once.
import os

src = "robocoop-5-eval-bigcap-df27.html"
dst = "robocoop-5-eval-bigcap-df28.html"
here = os.path.dirname(os.path.abspath(__file__))
memo_block = open(os.path.join(here, "df28-memo-block.js")).read().rstrip("\n")
s0 = open(src).read()
s = s0


def sub(s, anchor, new):
    n = s.count(anchor)
    assert n == 1, "anchor occurs %d times: %r" % (n, anchor[:90])
    return s.replace(anchor, new)


# ------------------------------------------------- 1. hashText: the freshness hash, over plain text
# so the memo key can be built from the same primitive instead of a second copy of it.
A = """  const hashOf = v => {
    let t = '';
    try {
      t = String(v && v._definition);
    } catch (e) {
      t = '';
    }
    let h = 2166136261;
    for (let i = 0; i < t.length; i++)
      h = Math.imul(h ^ t.charCodeAt(i), 16777619);
    return (h >>> 0).toString(16) + '.' + t.length;
  };"""
s = sub(s, A, """  const hashText = t => {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++)
      h = Math.imul(h ^ t.charCodeAt(i), 16777619);
    return (h >>> 0).toString(16) + '.' + t.length;
  };
  const hashOf = v => {
    let t = '';
    try {
      t = String(v && v._definition);
    } catch (e) {
      t = '';
    }
    return hashText(t);
  };""")

# ------------------------------------------------------- 2. the memo block itself, after df20's
# mutationCheck (it uses scratchInputsOf, srcOf, deliverableCells, hashText).
A = """    return mutationCheckLive(cv, evMod, evName, name, inputs, isFn, mutantValue);
  };"""
s = sub(s, A, A + "\n" + memo_block)

# ------------------------------------------------- 3. the scratch clone builds from the REAL
# definition. A memo stub returns the cached rows whatever its inputs do, so a clone built from it
# would pass the mutant straight through and the mutation check would never notice — the one way the
# memo can silently break df20.
A = "        made.push(M.variable().define(SCRATCH_PREFIX + p.name, p.inputs, p.v._definition));"
s = sub(s, A, "        made.push(M.variable().define(SCRATCH_PREFIX + p.name, p.inputs, p.v._definition && p.v._definition.__rc5real || p.v._definition));")

# ---------------------------------------------------------- 4. where the memo is applied at boot:
# synchronously inside applyModuleSrc, the moment the module's variables exist and before the
# runtime has computed any of them. A hit means the cell never runs.
A = "            try { const cc = globalThis.__rc5ApplyCount = globalThis.__rc5ApplyCount || {}; cc[id] = (cc[id] || 0) + 1; } catch (e) {}"
s = sub(s, A, A + "\n            try { if (typeof globalThis.__rc5MemoApply === 'function') globalThis.__rc5MemoApply(id); } catch (e) {}")

# ---------------------------------------------------------------- 5. core_status: BOOT MEMO
A = """      return {
        title: 'core_status ' + module,
        output: lines.join('\\n')
      };"""
s = sub(s, A, """      try {
        const ms = typeof globalThis.__rc5MemoStats === 'function' ? globalThis.__rc5MemoStats() : null;
        if (ms)
          lines.push('BOOT MEMO: ' + ms.restored + ' cells restored, ' + ms.recomputed + ' recomputed (slow cells > ' + Math.round(ms.minMs / 1000) + ' s)');
      } catch (e) {
      }
""" + A)

open(dst, "w").write(s)
print("wrote", dst, len(s), "bytes;", len(s) - len(s0), "added")

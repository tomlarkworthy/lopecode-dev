# -*- coding: utf-8 -*-
# df20 = df19 + the attest mutation check run in SCRATCH CLONES instead of on the live cell.
#
# df17-df19 redefined the attested cell itself, which dirties every reachable downstream variable:
# the deliverable and the whole pipeline recompute under the mutant and again on the restore, and a
# garbage output file is written in between. df20 clones the cells between the attested cell and the
# evidence cell into `__rc5mut_*` scratch variables, evaluates the evidence clone, and deletes them;
# the live graph is never touched. Cross-module evidence keeps the old live path (mode 'live').
#
# Run from tools/robocoop-5/eval/. Each anchor must occur EXACTLY once.
import os

src = "robocoop-5-eval-bigcap-df19.html"
dst = "robocoop-5-eval-bigcap-df20.html"
here = os.path.dirname(os.path.abspath(__file__))
mut_block = open(os.path.join(here, "df20-mutation-block.js")).read().rstrip("\n")
s0 = open(src).read()
s = s0


def sub(s, anchor, new):
    n = s.count(anchor)
    assert n == 1, "anchor occurs %d times: %r" % (n, anchor[:90])
    return s.replace(anchor, new)


# ---------------------------------------------- the whole mutationCheck helper, comment included
A = r"""  // Redefine `cv` to a mutant, re-evaluate the evidence cell, restore. The mutant is a function
  // returning NaN when the cell yields a function (so every downstream comparison fails), and
  // `undefined` otherwise. Returns {noticed, timeout, restored, restoreWhy, isFn} — noticed:true
  // means the evidence FAILED under the mutant, which is what makes it evidence.
  const mutationCheck = async (cv, evMod, evName) => {
    const name = cv._name;
    const inputs = name ? inputNamesOf(cv) : null;
    if (!name || inputs == null)
      return { skip: !name ? 'the attested cell has no name' : 'the attested cell\'s inputs cannot be addressed by name' };
    const origDef = cv._definition;
    const isFn = typeof cv._value === 'function';
    const mutantValue = isFn ? MUTANT_FN : undefined;
    let r = { error: 'not run' }, restored = false, restoreWhy = '';
    try {
      cv.define(name, [], () => mutantValue);
      r = await raceValue(evMod, evName);
    } catch (e) {
      r = { error: 'could not install the mutant: ' + (e && e.message || String(e)) };
    } finally {
      try {
        cv.define(name, inputs, origDef);
      } catch (e) {
        restoreWhy = 're-defining the cell threw: ' + (e && e.message || String(e));
      }
      if (!restoreWhy) {
        const back = await raceValue(cv._module, name);
        if (cv._definition !== origDef)
          restoreWhy = 'the cell still carries the mutant definition';
        else if (back.error)
          restoreWhy = 're-reading the cell after the restore failed: ' + back.error;
        else if (isFn && back.value === mutantValue)
          restoreWhy = 'the cell still yields the mutant';
        else
          restored = true;
      }
    }
    return {
      isFn,
      noticed: !!r.error || !rowsAllPass(r.value),
      timeout: !!r.timeout,
      restored,
      restoreWhy
    };
  };
"""
s = sub(s, A, mut_block + "\n")

open(dst, "w").write(s)
print("wrote", dst, len(s), "bytes;", len(s) - len(s0), "added")

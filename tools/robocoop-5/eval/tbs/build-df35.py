# -*- coding: utf-8 -*-
# df35 = df34 + a row anchors a reference only if it depends on the cell AND on the data (walk ai
# turns 5-7, 2026-09-24; reproduction tbs/d3-probe.mjs). df34's sensitivity run compared the WHOLE
# evidence outcome on live vs destroyed data, so a row asserting target_1's first timestamp — which
# never calls lombScargle — flipped on destroyed data and real-anchored the reference.
#
# df35: both mutation checks return `mutPass` (per-row pass vector under the mutant; null when the
# mutant run errored or the value is not an array). attest threads it into anchorCheck and on into
# sensitivityRun as `keep`; outcomeOf(val, keep) compares only the rows the mutant BROKE
# (keep[i] === false). keep null = df34 behaviour. keep with no false entry, or selected rows that do
# not differ while the whole outcome does, is `demoted` with the df35 sentence.
#
# Run from tools/robocoop-5/eval/. Each anchor must occur EXACTLY once.
src = "robocoop-5-eval-bigcap-df34.html"
dst = "robocoop-5-eval-bigcap-df35.html"
s0 = open(src, encoding="utf8").read()
s = s0


def sub(s, anchor, new):
    n = s.count(anchor)
    assert n == 1, "anchor occurs %d times: %r" % (n, anchor[:90])
    return s.replace(anchor, new)


# ---- 1. mutPassOf next to rowsAllPass; both mutation checks return it.
A = "  const rowsAllPass = val => Array.isArray(val) && val.length >= 3 && val.every(r => r && typeof r === 'object' && !Array.isArray(r) && r.pass === true);\n"
s = sub(s, A, A + "  const mutPassOf = r => r.error || !Array.isArray(r.value) ? null : r.value.map(x => !!(x && x.pass === true)); // df35\n")
A = "      restoreWhy,\n      mode: 'live'"
s = sub(s, A, "      restoreWhy,\n      mutPass: mutPassOf(r),\n      mode: 'live'")
A = "      restoreWhy: '',\n      mode: 'scratch',"
s = sub(s, A, "      restoreWhy: '',\n      mutPass: mutPassOf(r),\n      mode: 'scratch',")

# ---- 2. attest -> anchorCheck -> sensitivityRun.
A = "anc = await anchorCheck(k, ev, re.mod, re.name, val); // df33"
s = sub(s, A, "anc = await anchorCheck(k, ev, re.mod, re.name, val, mut.mutPass || null); // df33, df35")
A = "const anchorCheck = async (k, ev, evMod, evName, liveVal) => {"
s = sub(s, A, "const anchorCheck = async (k, ev, evMod, evName, liveVal, keep) => {")
A = "const s = await sensitivityRun(ev, ev._module, String(evName), liveVal, readers);"
s = sub(s, A, "const s = await sensitivityRun(ev, ev._module, String(evName), liveVal, readers, keep || null);")

# ---- 3. sensitivityRun: nothing the mutant broke -> demoted; compare only the broken rows.
A = "  const sensitivityRun = async (ev, M, evName, liveVal, readers) => {\n    const t0 = Date.now();\n"
s = sub(s, A, """  const sensitivityRun = async (ev, M, evName, liveVal, readers, keep) => {
    if (keep && !keep.some(x => x === false))
      return {
        status: 'demoted',
        df35: true
      };
    const t0 = Date.now();
""")
A = """    const changed = outcomeDiffers(outcomeOf(liveVal), outcomeOf(r.value));
    return {
      status: changed ? 'real-anchored' : 'demoted',"""
s = sub(s, A, """    const changed = outcomeDiffers(outcomeOf(liveVal, keep), outcomeOf(r.value, keep));
    const df35 = !changed && !!keep && outcomeDiffers(outcomeOf(liveVal), outcomeOf(r.value));
    return {
      status: changed ? 'real-anchored' : 'demoted',
      df35: df35 || undefined,""")

# ---- 4. outcomeOf(val, keep).
A = """  const outcomeOf = val => {
    const passes = [], nums = [];
    if (Array.isArray(val))
      for (const r of val) {
        passes.push"""
s = sub(s, A, """  const outcomeOf = (val, keep) => {
    const passes = [], nums = [];
    if (Array.isArray(val))
      for (let i = 0; i < val.length; i++) {
        if (keep && keep[i] !== false)
          continue; // df35: only rows the mutant broke
        const r = val[i];
        passes.push""")

# ---- 5. the df35 sentence.
A = "    if (a.status === 'demoted')\n      return '\\nanchoring: demoted: insensitive — ' + evName + ' anchored but INSENSITIVE: the verdict did not change"
s = sub(s, A, "    if (a.status === 'demoted' && a.df35)\n      return '\\nanchoring: demoted: insensitive — ' + evName + ' anchored but INSENSITIVE: no row that tests ' + cellName + ' depends on the task\\'s data — the rows that flip on destroyed data do not exercise ' + cellName + ' (df35)';\n" + A)

open(dst, "w", encoding="utf8").write(s)
print("wrote", dst, len(s), "bytes;", len(s) - len(s0), "added")

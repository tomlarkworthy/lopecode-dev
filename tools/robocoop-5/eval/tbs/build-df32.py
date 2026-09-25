# -*- coding: utf-8 -*-
# df32 = df31 + an edit to a CORE cell is refused unless the turn's note re-opened it.
#
# Walk ae (2026-09-23, from scratch, df31): the core rule was satisfied five times and the agent
# edited a CORE cell past it four times in the same or the next turn; 8 of 20 turns went to
# re-attesting cells it had just un-verified. The note said "frozen: may not edit" every turn and
# nothing in the bundle refused the write.
#
# df32: the driver names the re-opened cells pre-boot in globalThis.__rc5MayEdit. write_file and
# edit_file on a module path (/src or /notebook, both through applyModuleSrc) compute, before
# applying, which live cells the write would redefine or delete (by the attestation hash); any that
# is in CORE and not re-opened refuses the whole write. core_status prints a `frozen:` line. With
# no global set, df31 behaviour.
#
# Run from tools/robocoop-5/eval/. Each anchor must occur EXACTLY once.
import os

src = "robocoop-5-eval-bigcap-df31.html"
dst = "robocoop-5-eval-bigcap-df32.html"
here = os.path.dirname(os.path.abspath(__file__))
block = open(os.path.join(here, "df32-freeze-block.js"), encoding="utf8").read().rstrip("\n")
s0 = open(src, encoding="utf8").read()
s = s0


def sub(s, anchor, new):
    n = s.count(anchor)
    assert n == 1, "anchor occurs %d times: %r" % (n, anchor[:90])
    return s.replace(anchor, new)


# ------------------------------------- 1. the freeze block, in crossTools after coreOf is exported.
A = "  globalThis.__rc5CoreGuard = coreGuard;\n"
s = sub(s, A, A + block + "\n")

# ----------------- 2. applyModuleSrc takes opts; {guard:true} consults the freeze check before apply.
A = "    const applyModuleSrc = async (id, src) => {"
s = sub(s, A, "    const applyModuleSrc = async (id, src, opts) => {")
A = """            const r = apply(id, mod.default);
            if (!r.applied) {"""
s = sub(s, A, """            if (opts && opts.guard && typeof globalThis.__rc5FreezeCheck === 'function') {
                const refusal = globalThis.__rc5FreezeCheck(id, probeDefine(mod.default)); // df32
                if (refusal)
                    return {
                        ok: false,
                        refused: true,
                        msg: refusal
                    };
            }
            const r = apply(id, mod.default);
            if (!r.applied) {""")

# -------------------------------------------- 3. the two agent write tools pass the guard flag, and
# a refusal is the whole tool result.
A = """      const applied = await applyModuleSrc(m[1], String(content ?? ''));
      return { output: 'Wrote ' + file_path + ' \\u2014 ' + applied.msg };"""
s = sub(s, A, """      const applied = await applyModuleSrc(m[1], String(content ?? ''), { guard: true });
      if (applied.refused)
        return { output: applied.msg };
      return { output: 'Wrote ' + file_path + ' \\u2014 ' + applied.msg };""")
A = """      const applied = await applyModuleSrc(m[1], updated);
      return { output: 'Edited ' + file_path"""
s = sub(s, A, """      const applied = await applyModuleSrc(m[1], updated, { guard: true });
      if (applied.refused)
        return { output: applied.msg };
      return { output: 'Edited ' + file_path""")

# ---------------------------------------------- 4. core_status: the frozen line after the CORE line.
A = """      if (st.knowledge && st.knowledge.length)
        lines.splice(2, 0, 'GIVEN FROM LITERATURE ("""
s = sub(s, A, """      try {
        const fl = frozenLine(st); // df32
        if (fl)
          lines.splice(3, 0, fl);
      } catch (e) {
      }
      if (st.knowledge && st.knowledge.length)
        lines.splice(2, 0, 'GIVEN FROM LITERATURE (""")

open(dst, "w", encoding="utf8").write(s)
print("wrote", dst, len(s), "bytes;", len(s) - len(s0), "added")

# -*- coding: utf-8 -*-
# df33 = df32 + two separate changes, each separately anchored below.
#
# (A) Evidence provenance. Walks ae and ag (2026-09-23) built a verified core and got ~0 real periods
# within 2 %: the most-verified cell (the period finder) was attested by references that plant signals
# on SYNTHETIC sampling while the real data is two-band, 950 points over 2740 d. A 5/5 reference on
# invented data says nothing about the real data. df33: an attestation is `real-anchored` when some cell
# upstream of its evidence cell reads the task's data (df29's localPathsIn against
# globalThis.__rc5SeedRoots, df31's hole-prefix rule) AND, unless it is a nullcheck, the evidence's
# outcome changes when that data is destroyed in a scratch clone (df20 machinery). A cell enters the
# CORE only with at least one real-anchored fresh attestation. With no __rc5SeedRoots global, df32.
#
# (B) Tool-result cap (separate change). Walks ae/ag lost turns to value dumps that would not fit:
# inspect_value rendered through summarizeJS with max_size 4000, eval_js with 6000 (a string result
# is cut at the same number), and the agent session truncates every tool result to 8000 chars
# (createAgentSession toolOutputLimit). An ~8 kB text or a 20x8 numeric table could not arrive intact.
# Raised: inspect_value 4000 -> 12000, eval_js 6000 -> 12000, toolOutputLimit 8000 -> 14000 (the
# session cap must exceed the tool's own cap plus its framing, or the tool's cap is moot).
#
# Run from tools/robocoop-5/eval/. Each anchor must occur EXACTLY once.
import os

src = "robocoop-5-eval-bigcap-df32.html"
dst = "robocoop-5-eval-bigcap-df33.html"
here = os.path.dirname(os.path.abspath(__file__))
block = open(os.path.join(here, "df33-anchor-block.js"), encoding="utf8").read().rstrip("\n")
s0 = open(src, encoding="utf8").read()
s = s0


def sub(s, anchor, new):
    n = s.count(anchor)
    assert n == 1, "anchor occurs %d times: %r" % (n, anchor[:90])
    return s.replace(anchor, new)


# ============================================================ (A) evidence provenance
# ---------------------------------- A1. the anchor block, in crossTools after the df32 freeze block.
A = "  globalThis.__rc5FreezeCheck = freezeCheck;\n"
s = sub(s, A, A + block + "\n")

# ---------------------------- A2. coreOf: which cells carry a real-anchored fresh attestation.
A = """    for (const v of all)
      if (!given.has(v))
        info.set(v, weigh(keyOf(v)));"""
s = sub(s, A, A + """
    const anchorBy = new Map(); // df33: v -> the evidence that anchors it, or null
    if (anchorOn()) {
      const rdCache = new Map();
      for (const [v, w] of info) {
        const e = (w.fresh || []).find(x => anchorStatusOf(x, rdCache) === 'real-anchored');
        anchorBy.set(v, e ? e.evidence : null);
      }
    }""")

# ---------------------------------------------- A3. the core rule: no anchor, no core.
A = """        if ((info.get(v) || { score: 0 }).score < CORE_SCORE)
          continue;
        let ok = true;"""
s = sub(s, A, """        if ((info.get(v) || { score: 0 }).score < CORE_SCORE)
          continue;
        if (anchorBy.has(v) && !anchorBy.get(v))
          continue; // df33
        let ok = true;""")

# ------------------------------------ A4. the blocked sentence, LEADING the cell's blocked reason.
A = """      if (w.score < CORE_SCORE) {
        const n = Math.ceil(CORE_SCORE - w.score);
        parts.push(n + ' more evidence cell' + (n === 1 ? '' : 's'));
      }
      const reason = parts.join('; ');"""
s = sub(s, A, """      if (w.score < CORE_SCORE) {
        const n = Math.ceil(CORE_SCORE - w.score);
        parts.push(n + ' more evidence cell' + (n === 1 ? '' : 's'));
      }
      if (anchorBy.has(v) && !anchorBy.get(v) && w.fresh && w.fresh.length)
        parts.unshift(anchorSentence(disp(v))); // df33
      const reason = parts.join('; ');""")

# ----------------------------------------------------- A5. coreOf returns the anchoring table.
A = """      blocking,
      pathKinds
    };
  };
  // Modules worth scanning"""
s = sub(s, A, """      blocking,
      pathKinds,
      anchoring: anchorBy.size ? (() => {
        const o = {};
        for (const [v, e] of anchorBy)
          if (((info.get(v) || {}).fresh || []).length)
            o[disp(v)] = e ? 'yes (by ' + e + ')' : 'NO';
        return o;
      })() : null
    };
  };
  // Modules worth scanning""")

# --------------- A5b. coreAll (what the driver collects per turn) carries the anchoring table too.
A = """        blocking: st.blocking,
        pathKinds: st.pathKinds
      };"""
s = sub(s, A, """        blocking: st.blocking,
        pathKinds: st.pathKinds,
        ...(st.anchoring ? { anchoring: st.anchoring } : {})
      };""")

# ------------------------- A6. attest: the anchor check after the mutation check, on evidence cells.
A = """        rows = val.length;
        evidenceHash = hashOf(ev);"""
s = sub(s, A, """        try {
          anc = await anchorCheck(k, ev, re.mod, re.name, val); // df33
        } catch (e) {
          anc = anchorOn() ? {
            status: 'unmeasured',
            why: 'the sensitivity run threw: ' + (e && e.message || String(e))
          } : null;
        }
        rows = val.length;
        evidenceHash = hashOf(ev);""")
A = "      let rows = 0, evidenceHash = null, what = '', mutLine = '';"
s = sub(s, A, A + "\n      let anc = null; // df33")
A = """        evidenceHash,
        rows,
        at: Date.now()
      });
      attestMap().set(key, list);"""
s = sub(s, A, """        evidenceHash,
        rows,
        at: Date.now(),
        ...(anc ? { anchor: anc } : {})
      });
      attestMap().set(key, list);""")
# crossing / proof / literature under the rules: synthetic, said so.
A = """      const key = keyOf(cv);
      const prev = attestMap().get(key) || [];"""
s = sub(s, A, """      if (!anc && anchorOn() && EXEC_EVIDENCE.indexOf(k) < 0)
        anc = await anchorCheck(k, null, null, evText, null); // df33
      const key = keyOf(cv);
      const prev = attestMap().get(key) || [];""")
A = "statusLine + (w.stale.length ? '\\nstale: ' + w.stale.join('; ') : '') + mutLine"
s = sub(s, A, "statusLine + (w.stale.length ? '\\nstale: ' + w.stale.join('; ') : '') + mutLine + anchorLine(anc, evText, disp)")

# ----------------------------- A7. core_status: `anchored:` per attested cell, after its line.
A = """      for (const n of names.slice(0, 40))
        lines.push('  ' + n + ' → ' + st.blocked[n]);"""
s = sub(s, A, """      const anc = st.anchoring || null; // df33
      if (anc) {
        const ci = lines.findIndex(l => l.indexOf('CORE (') === 0);
        const add = st.core.filter(n => anc[n]).map(n => '  ' + n + ' \\u2014 anchored: ' + anc[n]);
        if (ci >= 0 && add.length)
          lines.splice(ci + 1, 0, ...add);
      }
      for (const n of names.slice(0, 40)) {
        lines.push('  ' + n + ' → ' + st.blocked[n]);
        if (anc && anc[n])
          lines.push('    anchored: ' + anc[n]);
      }""")

# ============================================================ (B) tool-result cap
A = "output: summary(r.value, 4000)"      # inspect_value
s = sub(s, A, "output: summary(r.value, 12000)")
A = "output: summary(r.value, 6000)"      # eval_js
s = sub(s, A, "output: summary(r.value, 12000)")
A = "    toolOutputLimit = 8000,"          # createAgentSession's per-tool-result truncate()
s = sub(s, A, "    toolOutputLimit = 14000,")

open(dst, "w", encoding="utf8").write(s)
print("wrote", dst, len(s), "bytes;", len(s) - len(s0), "added")

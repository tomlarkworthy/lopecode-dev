# -*- coding: utf-8 -*-
# df17 = df16 + the attest mutation check + fetch_text + literature attestations.
# Run from tools/robocoop-5/eval/. Each anchor must occur EXACTLY once.
import os

src = "robocoop-5-eval-bigcap-df16.html"
dst = "robocoop-5-eval-bigcap-df17.html"
here = os.path.dirname(os.path.abspath(__file__))
mut_block = open(os.path.join(here, "df17-attest-block.js")).read().rstrip("\n")
fetch_block = open(os.path.join(here, "df17-fetch-tool.js")).read().rstrip("\n")
s0 = open(src).read()
s = s0


def sub(s, anchor, new):
    n = s.count(anchor)
    assert n == 1, "anchor occurs %d times: %r" % (n, anchor[:90])
    return s.replace(anchor, new)


# ---------------------------------------------------------------- 1. fetch_text (valueTools cell)
A = """  return [
    inspect_value,
    list_values,
    eval_js,
    watch_variable,
    unwatch_variable
  ];"""
s = sub(s, A, fetch_block + """
  return [
    inspect_value,
    list_values,
    eval_js,
    fetch_text,
    watch_variable,
    unwatch_variable
  ];""")

# ------------------------------------------- 2. the mutation-check + knowledge-cell helpers (crossTools)
s = sub(s, "  const attest = defineTool({", mut_block + "\n  const attest = defineTool({")

# ---------------------------------------------------------------- 3. `literature` is a kind
A = """  const KINDS = [
    'reference',
    'crossing',
    'metamorphic',
    'library',
    'proof'
  ];"""
s = sub(s, A, """  const KINDS = [
    'reference',
    'crossing',
    'metamorphic',
    'library',
    'literature',
    'proof'
  ];""")

# a literature attestation is knowledge taken on trust, like a proof: half the weight of a computation
s = sub(s, "      score += e.kind === 'proof' ? 0.5 : 1;",
        "      score += e.kind === 'proof' || e.kind === 'literature' ? 0.5 : 1;")

# A knowledge cell reads `md`, and coreOf's `own` set never applied `skip` — so every module using a
# builtin listed `builtin:md → 2 more evidence cells` under BLOCKED (harmless for the guard, which
# reads up(), but noise the reviewer has to ignore). Observed in the first df17 --literature run.
s = sub(s, "    const own = varsOf(mod).filter(v => v && v._name && !isStructural(v)).map(deref);",
        "    const own = varsOf(mod).filter(v => v && v._name && !isStructural(v)).map(deref).filter(v => !skip(v));")

# ------------------------------------------------- 4. knowledge cells are given, listed separately
A = """    return {
      module: moduleId,
      given: [...given].map(disp).sort(),"""
s = sub(s, A, """    const know = new Set([...given].filter(isKnowledgeCell));
    return {
      module: moduleId,
      knowledge: [...know].map(disp).sort(),
      given: [...given].filter(v => !know.has(v)).map(disp).sort(),""")

A = """      out[id] = {
        given: st.given,"""
s = sub(s, A, """      out[id] = {
        knowledge: st.knowledge,
        given: st.given,""")

A = """        'BLOCKED (' + names.length + '):'
      ];"""
s = sub(s, A, """        'BLOCKED (' + names.length + '):'
      ];
      if (st.knowledge && st.knowledge.length)
        lines.splice(2, 0, 'GIVEN FROM LITERATURE (' + st.knowledge.length + ' \\u2014 knowledge cells citing a URL or a DOI, assumed correct): ' + st.knowledge.join(', '));""")

# ---------------------------------------------------------------- 5. the tool's parameters and doc
A = """        kind: {
          type: 'string',
          enum: [
            'reference',
            'crossing',
            'metamorphic',
            'library',
            'proof'
          ],
          description: 'Kind of evidence (default "reference").'
        }
      },"""
s = sub(s, A, """        kind: {
          type: 'string',
          enum: [
            'reference',
            'crossing',
            'metamorphic',
            'library',
            'literature',
            'proof'
          ],
          description: 'Kind of evidence (default "reference").'
        },
        claim: {
          type: 'string',
          description: 'Kind "literature" only: the sentence you are relying on, quoted VERBATIM from the knowledge cell (with its citation in that cell).'
        }
      },""")

# both of these land INSIDE one string literal of the tool description, so the insert carries no quotes
A = "host evaluates that cell and refuses the attestation if any row fails. "
s = sub(s, A, "host evaluates that cell and refuses the attestation if any row fails, then MUTATES `cell` (a cell "
        "yielding a function is replaced by one returning NaN, anything else by undefined), re-runs the evidence and "
        "refuses it if it STILL passes \\u2014 evidence that cannot tell a broken `cell` from a working one does not "
        "exercise it. ")

A = "with an imported implementation), "
s = sub(s, A, A + "`literature` (`evidence` is a KNOWLEDGE cell \\u2014 an md cell citing a URL or a DOI \\u2014 and "
        "`claim` is the sentence from it you rely on, quoted verbatim; the claim is GIVEN, not measured, so it counts "
        "as half), ")

# ---------------------------------------------------------------- 6. execute: claim, mutLine
s = sub(s, "    execute: async ({module, cell, evidence, kind}) => {",
        "    execute: async ({module, cell, evidence, kind, claim}) => {")
s = sub(s, "      let rows = 0, evidenceHash = null, what = '';",
        "      let rows = 0, evidenceHash = null, what = '', mutLine = '';")

# ---------------------------------------------------------------- 7. the literature branch
A = """        what = 'crossing "' + evText + '" (' + e.a + ' vs ' + e.b + ', ' + rows + ' items, fraction ' + e.fraction + ')';
      } else {"""
s = sub(s, A, """        what = 'crossing "' + evText + '" (' + e.a + ' vs ' + e.b + ', ' + rows + ' items, fraction ' + e.fraction + ')';
      } else if (k === 'literature') {
        const re = resolveRef(module, evText);
        if (re.error)
          return fail('evidence: ' + re.error);
        const ev = deref(re.v);
        if (ev === cv)
          return fail('the evidence cell and the attested cell are the SAME cell (' + rc.name + ') \\u2014 a cell cannot be its own evidence.');
        const esrc = srcOf(ev);
        if (!esrc)
          return fail('cannot read the source of ' + evText + ' \\u2014 a literature attestation needs a cell whose SOURCE carries the citation.');
        if (!CITE_RE.test(esrc))
          return fail('evidence cell ' + evText + ' is not a KNOWLEDGE cell: its source carries no http URL and no DOI. Write an md cell holding the claims you rely on, each with the URL or DOI you read it from (fetch_text reads them), then attest to that cell.');
        const claimText = String(claim == null ? '' : claim).trim();
        if (claimText.length < 20)
          return fail('kind "literature" needs `claim`: the sentence from ' + evText + ' you are relying on, quoted verbatim (at least 20 characters).');
        if (esrc.indexOf(claimText) < 0)
          return fail('the claim is NOT in ' + evText + ' verbatim: "' + summ(claimText, 120) + '". Quote the sentence exactly as it stands in the knowledge cell \\u2014 the cell is the record, the claim is the part of it this cell relies on.');
        if (!isKnowledgeCell(ev))
          return fail('evidence cell ' + evText + ' cites the literature but COMPUTES: it depends on ' + ([...up(ev)].map(v => nameOf(v, module)).sort().slice(0, 8).join(', ') || 'nothing') + '. A knowledge cell states what the literature says and depends on nothing.');
        evidenceHash = hashOf(ev);
        what = 'literature cell ' + evText + ' (claim: "' + summ(claimText, 100) + '")';
      } else {""")

# ---------------------------------------------------------------- 8. the mutation check itself
A = """        rows = val.length;
        evidenceHash = hashOf(ev);
        what = k + ' cell ' + evText + ' (' + rows + ' rows, all pass)';"""
s = sub(s, A, """        const mut = await mutationCheck(cv, re.mod, re.name);
        const mutWord = mut.isFn ? 'returns NaN' : 'is undefined';
        if (mut.timeout)
          return fail('mutation check timed out \\u2014 make the evidence cell cheaper. To record the attestation the host breaks ' + cell + ' and re-runs ' + evText + ', which must finish within 60 s; plant a smaller input, or move the expensive work into a cell of its own.');
        if (mut.skip)
          mutLine = '\\nmutation check SKIPPED (' + mut.skip + ').';
        else if (!mut.noticed)
          return fail('REFUSED: evidence still passes when ' + cell + ' ' + mutWord + '; it does not exercise ' + cell + '. ' + evText + ' must CALL ' + cell + ' on the planted input and compare what it returns \\u2014 rows that are hardcoded, or computed without ' + cell + ', pass whatever ' + cell + ' does.' + (mut.restored ? '' : ' \\u26A0 AND ' + cell + ' could NOT be restored (' + mut.restoreWhy + ') \\u2014 re-apply the module before trusting any value.'));
        else
          mutLine = '\\nmutation check: evidence fails when ' + cell + ' ' + mutWord + ' \\u2014 recorded.';
        if (!mut.skip && !mut.restored)
          mutLine += '\\n\\u26A0 WARNING: ' + cell + ' could NOT be restored after the mutation check (' + mut.restoreWhy + ') \\u2014 the MUTANT may still be live. Re-apply the module (write_file/edit_file) before trusting any value.';
        rows = val.length;
        evidenceHash = hashOf(ev);
        what = k + ' cell ' + evText + ' (' + rows + ' rows, all pass)';""")

A = ("        output: 'attest \"' + disp + '\" ← ' + what + ': RECORDED (' + w.fresh.length + ' fresh attestation' + "
     "(w.fresh.length === 1 ? '' : 's') + ', weight ' + w.score + ' of ' + CORE_SCORE + ' needed).\\n' + statusLine + "
     "(w.stale.length ? '\\nstale: ' + w.stale.join('; ') : '')")
s = sub(s, A, A + " + mutLine")

# ---------------------------------------------------------------- 9. the env note the agent reads
A = "depends on is in the core, and editing a cell drops its attestations."
s = sub(s, A, A + """

READ THE DOMAIN FIRST: before building an algorithm, read the domain: fetch_text the relevant
Wikipedia/Semantic Scholar pages, and write a knowledge cell (md) with the claims you will rely on, each with
its citation; attest a rule to that cell with kind 'literature' and the claim. The claim must appear in that
cell VERBATIM, the cell must carry a URL or a DOI, and it counts as half (it is knowledge taken on trust, not
a measurement), so a rule read out of the literature still needs one computed evidence cell beside it.""")

open(dst, "w").write(s)
print("wrote", dst, len(s), "bytes;", len(s) - len(s0), "added")

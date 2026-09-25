  // ------------------------------------------------------------- df16: attest and the verified core
  // An attestation says: cell C is believed correct because an EVIDENCE cell E, which depends on C,
  // computed a table of rows that all pass. Freshness is a hash of the cell's own DEFINITION text,
  // never the module apply count: a re-apply, a page reboot or a materialised cache must not launder
  // an edit, and must not invalidate a cell that did not change (walk c turn 9).
  const KINDS = [
    'reference',
    'crossing',
    'metamorphic',
    'library',
    'proof'
  ];
  const CORE_SCORE = 1.5;
  const hashOf = v => {
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
  };
  const attestMap = () => (globalThis.__rc5Attest = globalThis.__rc5Attest || new Map());
  const keyOf = v => (moduleIdOf(v._module) || '?') + ':' + (v._name || v.pid || '(anonymous)');
  const splitKey = k => {
    const s = String(k);
    const i = s.indexOf(':');
    return i < 0 ? {
      module: null,
      cell: s
    } : {
      module: s.slice(0, i),
      cell: s.slice(i + 1)
    };
  };
  const freshCross = nm => {
    const e = ledger().get(String(nm));
    return e && e.independent && e.agree && !isStale(e) ? e : null;
  };
  const freshness = e => {
    const rc = resolveRef(e.module, e.cell);
    if (rc.error)
      return {
        fresh: false,
        why: 'attestation by ' + e.evidence + ' is stale: cell ' + e.cell + ' is gone'
      };
    if (hashOf(deref(rc.v)) !== e.cellHash)
      return {
        fresh: false,
        why: 'attestation by ' + e.evidence + ' is stale: cell edited'
      };
    if (e.kind === 'proof')
      return { fresh: true };
    if (e.kind === 'crossing')
      return freshCross(e.evidence) ? { fresh: true } : {
        fresh: false,
        why: 'attestation by cross_check "' + e.evidence + '" is stale: that crossing no longer passes'
      };
    const re = resolveRef(e.module, e.evidence);
    if (re.error)
      return {
        fresh: false,
        why: 'attestation by ' + e.evidence + ' is stale: the evidence cell is gone'
      };
    if (hashOf(deref(re.v)) !== e.evidenceHash)
      return {
        fresh: false,
        why: 'attestation by ' + e.evidence + ' is stale: evidence cell edited'
      };
    return { fresh: true };
  };
  // Two evidence cells make a core cell. A proof is a sentence, not a computation: it weighs half,
  // so proof + one evidence cell is enough and a proof alone never is.
  const weigh = key => {
    const rows = attestMap().get(key) || [];
    let score = 0;
    const seen = new Set(), fresh = [], stale = [];
    for (const e of rows) {
      const f = freshness(e);
      if (!f.fresh) {
        if (f.why && stale.indexOf(f.why) < 0)
          stale.push(f.why);
        continue;
      }
      if (seen.has(e.evidence))
        continue;
      seen.add(e.evidence);
      fresh.push(e);
      score += e.kind === 'proof' ? 0.5 : 1;
    }
    return {
      score,
      fresh,
      stale
    };
  };
  const coreOf = moduleId => {
    const mod = resolveModule(moduleId);
    if (!mod)
      return { error: 'Module not found: ' + moduleId + ' (try glob /src/**/*.js).' };
    const upCache = new Map();
    const upOf = v => {
      let s = upCache.get(v);
      if (!s) {
        s = up(v);
        upCache.set(v, s);
      }
      return s;
    };
    const own = varsOf(mod).filter(v => v && v._name && !isStructural(v)).map(deref);
    const all = new Set(own);
    for (const v of own)
      for (const u of upOf(v))
        all.add(u);
    // A cell that WRITES the output names /local-disk in its source, so the data regex calls it a
    // data cell; the deliverable is the thing being judged and is never given.
    const dels = deliverableCells(mod);
    const delSet = new Set(dels);
    const given = new Set(), core = new Set(), info = new Map();
    for (const v of all)
      if (isDataCell(v) && !delSet.has(v))
        given.add(v);
    for (const v of all)
      if (!given.has(v))
        info.set(v, weigh(keyOf(v)));
    for (let pass = 0; pass <= all.size; pass++) {
      let changed = false;
      for (const v of all) {
        if (given.has(v) || core.has(v))
          continue;
        if ((info.get(v) || { score: 0 }).score < CORE_SCORE)
          continue;
        let ok = true;
        for (const u of upOf(v))
          if (!given.has(u) && !core.has(u)) {
            ok = false;
            break;
          }
        if (!ok)
          continue;
        core.add(v);
        changed = true;
      }
      if (!changed)
        break;
    }
    const disp = v => nameOf(v, moduleId);
    const blocked = {}, blockedKeys = {};
    for (const v of all) {
      if (given.has(v) || core.has(v))
        continue;
      const w = info.get(v) || {
        score: 0,
        stale: []
      };
      const missing = [...upOf(v)].filter(u => !given.has(u) && !core.has(u)).map(disp).sort();
      const parts = [];
      if (missing.length)
        parts.push('upstream ' + missing.slice(0, 3).join(', ') + ' not in core');
      for (const s of w.stale.slice(0, 2))
        parts.push(s);
      if (w.score < CORE_SCORE) {
        const n = Math.ceil(CORE_SCORE - w.score);
        parts.push(n + ' more evidence cell' + (n === 1 ? '' : 's'));
      }
      const reason = parts.join('; ');
      blocked[disp(v)] = reason;
      blockedKeys[keyOf(v)] = reason;
    }
    const need = new Set();
    for (const d of dels)
      for (const u of upOf(d))
        need.add(u);
    const blocking = [...need].filter(v => Object.prototype.hasOwnProperty.call(blockedKeys, keyOf(v))).map(v => disp(v) + ' → ' + blockedKeys[keyOf(v)]).sort();
    return {
      module: moduleId,
      given: [...given].map(disp).sort(),
      core: [...core].map(disp).sort(),
      blocked,
      blockedKeys,
      deliverables: dels.map(disp),
      blocking
    };
  };
  // Modules worth scanning: everything the agent applied (__rc5ApplyCount is bumped on every
  // successful applyModuleSrc), plus anything already named in either ledger.
  const scanModuleIds = () => {
    const ids = new Set();
    try {
      for (const k of Object.keys(globalThis.__rc5ApplyCount || {}))
        ids.add(k);
    } catch (e) {
    }
    try {
      for (const k of attestMap().keys()) {
        const s = splitKey(k);
        if (s.module)
          ids.add(s.module);
      }
    } catch (e) {
    }
    try {
      for (const [, e] of ledger())
        if (e && e.module)
          ids.add(e.module);
    } catch (e) {
    }
    return [...ids];
  };
  const coreAll = () => {
    const out = {};
    for (const id of scanModuleIds()) {
      let st = null;
      try {
        st = coreOf(id);
      } catch (e) {
        continue;
      }
      if (!st || st.error)
        continue;
      if (!st.deliverables.length && !st.core.length && !Object.keys(st.blocked).length)
        continue;
      out[id] = {
        given: st.given,
        core: st.core,
        blocked: st.blocked,
        deliverables: st.deliverables,
        blocking: st.blocking
      };
    }
    return out;
  };
  // The guard's rule: every cell the deliverable depends on is given or core. Read off a global so
  // completeGuard (which is extracted and called on its own) stays a one-line call.
  const coreGuard = () => {
    if (globalThis.__rc5CoreRule === false)
      return null;
    const lines = [];
    let sawDeliverable = false;
    for (const id of scanModuleIds()) {
      const mod = resolveModule(id);
      if (!mod)
        continue;
      if (!deliverableCells(mod).length)
        continue;
      sawDeliverable = true;
      let st = null;
      try {
        st = coreOf(id);
      } catch (e) {
        continue;
      }
      if (!st || st.error)
        continue;
      for (const l of st.blocking)
        lines.push(l);
    }
    if (!sawDeliverable || !lines.length)
      return null;
    const shown = lines.slice(0, 8);
    return 'REJECTED: the deliverable is not in the VERIFIED CORE. Every cell the output depends on must be GIVEN ' + '(it loads the task data, or is a zero-input constant) or CORE (all of ITS upstream cells given or core, and two ' + 'fresh attestations from distinct evidence cells). Still blocked (' + lines.length + '):\n' + shown.join('\n') + (lines.length > shown.length ? '\n…and ' + (lines.length - shown.length) + ' more' : '') + '\nattest each blocked cell with a reference cell that plants a known answer and reports pass per row, or a passing cross_check. ' + 'core_status lists the whole core.';
  };
  globalThis.__rc5Core = coreOf;
  globalThis.__rc5CoreAll = coreAll;
  globalThis.__rc5CoreGuard = coreGuard;
  const attest = defineTool({
    id: 'attest',
    description: 'Record EVIDENCE that a cell is correct, and put it in the VERIFIED CORE once two independent pieces of ' + 'evidence stand. `evidence` is normally the name of another cell in the same module that DEPENDS on `cell`, ' + 'plants an input whose answer is known (a synthetic signal, a worked example from the task text, a limiting ' + 'case), runs `cell` on it and returns an ARRAY of at least 3 row objects each carrying a boolean `pass` — the ' + 'host evaluates that cell and refuses the attestation if any row fails. Kinds: `reference` (default), ' + '`metamorphic` (a relation the answer must obey: scaling, permutation, a held-out half), `library` (agreement ' + 'with an imported implementation), `crossing` (`evidence` is the NAME of a cross_check entry that is ' + 'independent, agreeing and fresh, and `cell` must be on one of its two sides), `proof` (`evidence` is the ' + 'argument as free text — the WEAKEST, counts as half, at most one per cell). An evidence cell may not be the ' + 'deliverable or downstream of it: reading the written output back is not evidence. Editing either cell makes ' + 'the attestation STALE (the host hashes the cell definitions), so re-attest after an edit. task_complete is ' + 'refused until every cell the deliverable depends on is given or in the core — core_status shows what is left.',
    parameters: {
      type: 'object',
      properties: {
        module: {
          type: 'string',
          description: 'Module id the cells live in, e.g. "@user/analysis".'
        },
        cell: {
          type: 'string',
          description: 'Cell being attested — the one whose correctness the evidence supports.'
        },
        evidence: {
          type: 'string',
          description: 'Name of the evidence cell (for kind reference/metamorphic/library), the name of a cross_check ledger entry (kind crossing), or the argument as free text (kind proof).'
        },
        kind: {
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
      },
      required: [
        'module',
        'cell',
        'evidence'
      ],
      additionalProperties: false
    },
    execute: async ({module, cell, evidence, kind}) => {
      const k = String(kind || 'reference');
      const fail = msg => ({
        title: 'attest',
        output: msg,
        metadata: { error: true }
      });
      if (KINDS.indexOf(k) < 0)
        return fail('unknown kind "' + k + '" — use one of: ' + KINDS.join(', ') + '.');
      const rc = resolveRef(module, cell);
      if (rc.error)
        return fail('cell: ' + rc.error);
      const cv = deref(rc.v);
      const home = resolveModule(module) || rc.mod;
      const dels = deliverableCells(home);
      const evText = String(evidence == null ? '' : evidence);
      let rows = 0, evidenceHash = null, what = '';
      if (k === 'proof') {
        if (evText.trim().length < 20)
          return fail('a `proof` attestation carries the ARGUMENT itself as free text (at least 20 characters). It is the weakest evidence: it counts as half, at most one per cell, and never makes a cell core on its own.');
        what = 'proof: "' + summ(evText.trim(), 120) + '"';
      } else if (k === 'crossing') {
        const e = ledger().get(evText);
        if (!e) {
          const names = [...ledger().keys()];
          return fail('no cross_check named "' + evText + '". Registered checks: ' + (names.join(', ') || '(none)') + '. Run cross_check first, then attest with kind "crossing".');
        }
        if (!e.independent)
          return fail('cross_check "' + evText + '" is NOT INDEPENDENT (' + (e.offending || []).join(', ') + ') — it is not evidence.');
        if (!e.agree)
          return fail('cross_check "' + evText + '" does not agree: ' + String(e.detail || '').slice(0, 200) + ' — resolve the disagreement, it is the finding.');
        if (isStale(e))
          return fail('cross_check "' + evText + '" is STALE (the module was edited since it ran) — re-run cross_check, then attest.');
        const nm = nameOf(cv, module);
        const onIt = e.a === cell || e.b === cell || (e.upA || []).indexOf(nm) >= 0 || (e.upB || []).indexOf(nm) >= 0;
        if (!onIt)
          return fail('cross_check "' + evText + '" crosses ' + e.a + ' with ' + e.b + ', and ' + nm + ' is in neither side\'s upstream — a crossing is evidence only for the cells it actually runs through.');
        rows = typeof e.items === 'number' ? e.items : 0;
        what = 'crossing "' + evText + '" (' + e.a + ' vs ' + e.b + ', ' + rows + ' items, fraction ' + e.fraction + ')';
      } else {
        const re = resolveRef(module, evText);
        if (re.error)
          return fail('evidence: ' + re.error);
        const ev = deref(re.v);
        if (ev === cv)
          return fail('the evidence cell and the attested cell are the SAME cell (' + rc.name + ') — a cell cannot be its own evidence.');
        const upEv = up(ev);
        if (!upEv.has(cv))
          return fail('evidence cell ' + evText + ' does not depend on ' + cell + ' (its upstream is: ' + ([...upEv].map(v => nameOf(v, module)).sort().slice(0, 20).join(', ') || 'nothing') + '). An evidence cell must CALL the cell it attests: plant an input whose answer you know, run ' + cell + ' on it, and return one row per case with a boolean `pass`.');
        if (dels.indexOf(ev) >= 0)
          return fail('evidence cell ' + evText + ' IS the deliverable (it writes the output) — the thing being shipped cannot be its own evidence.');
        if (dels.some(d => upEv.has(d)))
          return fail('evidence cell ' + evText + ' is DOWNSTREAM of the deliverable (' + dels.map(d => nameOf(d, module)).join(', ') + ') — reading the written output back is not evidence. Build the evidence cell from ' + cell + ' directly.');
        const rv = await valueOf(re.mod, re.name);
        if (rv.error)
          return fail('evidence cell ' + evText + ' did not evaluate: ' + rv.error);
        const val = rv.value;
        if (!Array.isArray(val))
          return fail('evidence cell ' + evText + ' must return an ARRAY of rows (got ' + (val === null ? 'null' : typeof val) + ': ' + summ(val, 120) + '). One row per case, each an object with a boolean `pass` and enough fields to read the failure.');
        if (val.length < 3)
          return fail('evidence cell ' + evText + ' returned ' + val.length + ' row' + (val.length === 1 ? '' : 's') + '; an evidence cell needs at least 3 cases — one passing case is a coincidence.');
        const bad = [];
        for (let i = 0; i < val.length; i++) {
          const r = val[i];
          if (!r || typeof r !== 'object' || Array.isArray(r) || typeof r.pass !== 'boolean')
            bad.push(i + ': no boolean `pass` field (' + summ(r, 60) + ')');
          else if (r.pass !== true)
            bad.push(i + ': pass=false (' + summ(r, 80) + ')');
          if (bad.length >= 5)
            break;
        }
        if (bad.length)
          return fail('evidence cell ' + evText + ' does not pass — ' + bad.length + (bad.length >= 5 ? '+' : '') + ' of ' + val.length + ' rows: ' + bad.join('; ') + '. A failing row is the finding: ' + cell + ' is wrong on that case, or the reference is. Fix it, then attest.');
        rows = val.length;
        evidenceHash = hashOf(ev);
        what = k + ' cell ' + evText + ' (' + rows + ' rows, all pass)';
      }
      const key = keyOf(cv);
      const prev = attestMap().get(key) || [];
      const list = prev.filter(e => !(e.kind === k && e.evidence === evText) && !(k === 'proof' && e.kind === 'proof'));
      list.push({
        kind: k,
        module,
        cell,
        evidence: evText,
        cellHash: hashOf(cv),
        evidenceHash,
        rows,
        at: Date.now()
      });
      attestMap().set(key, list);
      const disp = nameOf(cv, module);
      let statusLine = '';
      try {
        const st = coreOf(module);
        if (st && !st.error)
          statusLine = st.core.indexOf(disp) >= 0 ? disp + ': IN CORE (evidence: ' + weigh(key).fresh.map(e => e.kind === 'proof' ? 'proof' : e.evidence).join(', ') + ').' : disp + ': NOT IN THE CORE YET — ' + (st.blocked[disp] || 'unknown') + '.';
      } catch (e) {
      }
      const w = weigh(key);
      return {
        title: 'attest ' + disp,
        output: 'attest "' + disp + '" ← ' + what + ': RECORDED (' + w.fresh.length + ' fresh attestation' + (w.fresh.length === 1 ? '' : 's') + ', weight ' + w.score + ' of ' + CORE_SCORE + ' needed).\n' + statusLine + (w.stale.length ? '\nstale: ' + w.stale.join('; ') : '')
      };
    }
  });
  const core_status = defineTool({
    id: 'core_status',
    description: 'Report the VERIFIED CORE of a module: which cells are GIVEN (they load the task data, or are ' + 'zero-input constants — assumed correct, never inferred), which are in the CORE (every one of their upstream ' + 'cells is given or core, and they carry two fresh attestations from distinct evidence cells), and for every ' + 'other cell what it still needs. task_complete is refused until every cell the deliverable depends on is given ' + 'or core.',
    parameters: {
      type: 'object',
      properties: {
        module: {
          type: 'string',
          description: 'Module id, e.g. "@user/analysis".'
        }
      },
      required: ['module'],
      additionalProperties: false
    },
    execute: async ({module}) => {
      let st;
      try {
        st = coreOf(module);
      } catch (e) {
        return {
          title: 'core_status',
          output: 'core_status failed: ' + (e && e.message || String(e)),
          metadata: { error: true }
        };
      }
      if (st.error)
        return {
          title: 'core_status',
          output: st.error,
          metadata: { error: true }
        };
      const names = Object.keys(st.blocked).sort();
      const lines = [
        'core_status ' + module,
        'GIVEN (' + st.given.length + ' — data cells and zero-input constants, assumed correct): ' + (st.given.join(', ') || '(none)'),
        'CORE (' + st.core.length + ' — upstream all given/core, two fresh attestations from distinct evidence cells): ' + (st.core.join(', ') || '(none)'),
        'BLOCKED (' + names.length + '):'
      ];
      for (const n of names.slice(0, 40))
        lines.push('  ' + n + ' → ' + st.blocked[n]);
      if (names.length > 40)
        lines.push('  …and ' + (names.length - 40) + ' more');
      lines.push('DELIVERABLE(S): ' + (st.deliverables.join(', ') || '(none found — no cell writes to /local-disk)'));
      if (st.deliverables.length)
        lines.push(st.blocking.length ? 'task_complete still blocked on: ' + st.blocking.join('; ') : 'every cell upstream of the deliverable is given or core — the core rule is satisfied.');
      return {
        title: 'core_status ' + module,
        output: lines.join('\n')
      };
    }
  });

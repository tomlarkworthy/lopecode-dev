  // Redefine `cv` to a mutant, re-evaluate the evidence cell, restore. The mutant is a function
  // returning NaN when the cell yields a function (so every downstream comparison fails), and
  // `undefined` otherwise. Returns {noticed, timeout, restored, restoreWhy, isFn} — noticed:true
  // means the evidence FAILED under the mutant, which is what makes it evidence.
  // df20: this LIVE path is kept only for evidence in ANOTHER module. Redefining the live cell
  // dirties every reachable downstream variable, so the deliverable and the whole pipeline recompute
  // under the mutant and again on the restore — two full re-runs per attestation, with a garbage
  // output file written in between. Walk f turn 12 (2026-09-06): two attestations hit the 60 s cap
  // on the re-scan alone. Same-module evidence goes through mutationCheckScratch instead.
  const mutationCheckLive = async (cv, evMod, evName, name, inputs, isFn, mutantValue) => {
    const origDef = cv._definition;
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
      restoreWhy,
      mode: 'live'
    };
  };
  const SCRATCH_MUTANT = '__rc5mutant';
  const SCRATCH_PREFIX = '__rc5mut_';
  // A scratch clone resolves its inputs by NAME through the module scope, so every input must be
  // addressable THERE: a name that resolves to a different variable (an import alias's remote
  // source) would silently rewire the clone, so refuse to build one.
  const scratchInputsOf = (v, M) => {
    const out = [];
    for (const i of v._inputs || []) {
      const n = i && i._name;
      if (!n)
        return null;
      const s = String(n);
      const ok = M._scope.get(s) === i || (M._builtins && M._builtins.has(s)) || i._module === runtime._builtin;
      if (!ok)
        return null;
      out.push(s);
    }
    return out;
  };
  // `viewof x` / `mutable x` / `initial x` are never the attested cell, and cloning the pair that
  // backs them would fork a live control; the clone reads them as they stand.
  const PASSTHROUGH_INPUT = /^(viewof|mutable|initial)\s/;
  // Everything reachable from `root` by following `key` (_inputs upward, _outputs downward),
  // stopping at the module boundary: a variable in another module is somebody else's graph.
  const localWalk = (root, key, M) => {
    const out = new Set();
    const stack = [...root[key] || []];
    while (stack.length) {
      const v = stack.pop();
      if (!v || v._module !== M || out.has(v))
        continue;
      out.add(v);
      for (const n of v[key] || [])
        stack.push(n);
    }
    return out;
  };
  // Evaluate the evidence under the mutant in SCRATCH CLONES of the cells BETWEEN the attested cell
  // and the evidence cell, leaving the live graph alone. Nothing live is redefined, so nothing
  // downstream is dirtied: no deliverable is rewritten, no pipeline cell recomputes, and there is
  // nothing to restore.
  const mutationCheckScratch = async (cv, M, N, evName, evVar, isFn, mutantValue) => {
    const down = localWalk(cv, '_outputs', M);
    const upv = localWalk(evVar, '_inputs', M);
    const S = new Set([...down].filter(v => upv.has(v)));
    S.add(evVar);
    S.delete(cv);
    const sNames = new Set();
    for (const v of S) {
      if (!v._name)
        return { skip: 'a cell between ' + N + ' and ' + evName + ' has no name' };
      sNames.add(String(v._name));
    }
    const plan = [];
    for (const v of S) {
      const ins = scratchInputsOf(v, M);
      if (ins == null)
        return { skip: 'the inputs of ' + v._name + ' cannot be addressed by name' };
      plan.push({
        v,
        name: String(v._name),
        inputs: ins.map(i => i === N ? SCRATCH_MUTANT : sNames.has(i) && !PASSTHROUGH_INPUT.test(i) ? SCRATCH_PREFIX + i : i)
      });
    }
    const made = [];
    let r = { error: 'not run' }, built = false;
    try {
      made.push(M.variable().define(SCRATCH_MUTANT, [], () => mutantValue));
      for (const p of plan)
        made.push(M.variable().define(SCRATCH_PREFIX + p.name, p.inputs, p.v._definition));
      built = true;
      r = await raceValue(M, SCRATCH_PREFIX + evName);
    } catch (e) {
      r = { error: 'could not build the scratch clone: ' + (e && e.message || String(e)) };
    } finally {
      // Delete consumers before producers: deleting a variable that still has outputs leaves an
      // IMPLICIT variable of the same name behind in the module scope, which would then show up as
      // a cell in core_status and list_values.
      const drop = made.slice();
      for (let pass = 0; pass <= made.length && drop.length; pass++)
        for (let i = drop.length - 1; i >= 0; i--) {
          if (drop[i]._outputs && drop[i]._outputs.size)
            continue;
          try {
            drop[i].delete();
          } catch (e) {
          }
          drop.splice(i, 1);
        }
      for (const v of drop)
        try {
          v.delete();
        } catch (e) {
        }
      try {
        for (const k of [...M._scope.keys()]) {
          if (k !== SCRATCH_MUTANT && k.indexOf(SCRATCH_PREFIX) !== 0)
            continue;
          const v = M._scope.get(k);
          M._scope.delete(k);
          runtime._variables.delete(v);
          for (const i of v._inputs || [])
            if (i && i._outputs)
              i._outputs.delete(v);
          v._inputs = [];
        }
      } catch (e) {
      }
    }
    if (!built)
      return { skip: r.error };
    return {
      isFn,
      noticed: !!r.error || !rowsAllPass(r.value),
      timeout: !!r.timeout,
      restored: true,
      restoreWhy: '',
      mode: 'scratch',
      cloned: S.size
    };
  };
  const mutationCheck = async (cv, evMod, evName) => {
    const name = cv._name;
    const inputs = name ? inputNamesOf(cv) : null;
    if (!name || inputs == null)
      return { skip: !name ? 'the attested cell has no name' : 'the attested cell\'s inputs cannot be addressed by name' };
    const isFn = typeof cv._value === 'function';
    const mutantValue = isFn ? MUTANT_FN : undefined;
    const M = cv._module;
    const evVar = evMod === M && M._scope ? M._scope.get(String(evName)) : null;
    if (evVar && evVar !== cv && evVar._module === M)
      return mutationCheckScratch(cv, M, String(name), String(evName), evVar, isFn, mutantValue);
    return mutationCheckLive(cv, evMod, evName, name, inputs, isFn, mutantValue);
  };

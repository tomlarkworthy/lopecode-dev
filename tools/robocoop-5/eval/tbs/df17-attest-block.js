  // ------------------------------------------------------- df17: the mutation check and literature
  // df16 accepted an evidence cell that merely NAMED the attested cell: three hardcoded `pass: true`
  // rows depend on nothing and pass whatever the cell does. So after the rows pass, BREAK the
  // attested cell and re-run the evidence — evidence that cannot tell the difference is not evidence.
  const MUTANT_FN = function mutant() {
    return NaN;
  };
  const MUT_TIMEOUT_MS = 60000;
  const raceValue = (mod, nm) => new Promise(resolve => {
    let done = false;
    const finish = r => {
      if (!done) {
        done = true;
        resolve(r);
      }
    };
    Promise.resolve().then(() => mod.value(nm)).then(value => finish({ value }), error => finish({ error: error && error.message || String(error) }));
    setTimeout(() => finish({
      error: 'timed out after 60s',
      timeout: true
    }), MUT_TIMEOUT_MS);
  });
  // Restoring a variable means re-defining it with its ORIGINAL inputs, and define() resolves inputs
  // by NAME through the module scope — a cell whose inputs cannot be named is one we must not touch.
  const inputNamesOf = v => {
    const out = [];
    for (const i of v._inputs || []) {
      const n = i && i._name;
      if (!n)
        return null;
      out.push(String(n));
    }
    return out;
  };
  const rowsAllPass = val => Array.isArray(val) && val.length >= 3 && val.every(r => r && typeof r === 'object' && !Array.isArray(r) && r.pass === true);
  // Redefine `cv` to a mutant, re-evaluate the evidence cell, restore. The mutant is a function
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
  // A KNOWLEDGE cell: a cell that computes nothing of its own (no inputs but the builtins) and cites
  // the literature — an http URL or a DOI in its source. It is GIVEN like a data cell, but given from
  // the literature rather than from the task's data, and core_status lists the two separately.
  const CITE_RE = /https?:\/\/\S{4,}|\b10\.\d{4,9}\/\S{3,}/;
  const isKnowledgeCell = v => {
    const src = srcOf(v);
    if (!src || !CITE_RE.test(src))
      return false;
    return (v._inputs || []).map(deref).filter(x => !skip(x)).length === 0;
  };

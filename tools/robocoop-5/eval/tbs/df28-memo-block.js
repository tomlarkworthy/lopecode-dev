  // ------------------------------------------------------------------ df28: the boot memo
  // Every walk turn opens a fresh page and every evidence cell is a DATA cell, so all of them
  // recompute at boot: 40 s at the start of walk u, ~250 s by walk z, out of a 900 s turn. The data
  // (/local-disk light curves) does not change within a walk and the cells are deterministic, so the
  // same transitive source gives the same value. df28 caches a slow cell's VALUE in the ledger the
  // driver already carries from turn to turn, keyed by the TRANSITIVE definition hash: the cell's own
  // definition text plus the transitive hash of every named input in the same module (a builtin or a
  // cross-module import hashes by NAME). An edit to the cell, or to anything it depends on in its
  // module, changes the key, so the memo misses and the cell recomputes — the same invalidation rule
  // df16 uses for attestation freshness, extended up the graph.
  const MEMO_MIN_MS = 5000;
  const MEMO_MAX_BYTES = 2000000;
  const MEMO_TOTAL_BYTES = 8000000;
  // A cell that WRITES is never memoised: serving the deliverable from cache would leave the output
  // file unwritten on the next boot, silently.
  const MEMO_WRITE_RE = /localDisk\.write\(|\.writeText\(|\.writeBytes\(|writeFile\(/;
  const MEMO_STRUCT_NAME = /^(viewof|mutable|initial|module)\s/;
  const memoState = () => (globalThis.__rc5Memo = globalThis.__rc5Memo || {
    store: {},
    hits: 0,
    slow: 0,
    stubbed: {},
    loaded: 0
  });
  // The ledger hands the memo over as PLAIN DATA on globalThis.__rc5MemoIn, so the same restore
  // source works whether the driver evaluates it before the page boots (addInitScript, where none of
  // this exists yet) or after it (setup.init).
  const memoLoad = st => {
    const incoming = globalThis.__rc5MemoIn;
    if (!Array.isArray(incoming) || globalThis.__rc5MemoIn === st._in)
      return st;
    st._in = incoming;
    for (const e of incoming) {
      if (!e || typeof e.key !== 'string' || typeof e.json !== 'string')
        continue;
      if (!Object.prototype.hasOwnProperty.call(st.store, e.key)) {
        st.store[e.key] = e;
        st.loaded++;
      }
    }
    return st;
  };
  const realDefOf = v => v && v._definition && v._definition.__rc5real || v && v._definition;
  // The transitive definition hash. Cached per apply; a cycle (only reachable through a runtime the
  // graph would already refuse) degrades to the input's name.
  const memoKeyOf = (v, M, cache, stack) => {
    if (!v)
      return '@?';
    if (v._module !== M)
      return '@' + (v._name || 'anon');
    if (cache.has(v))
      return cache.get(v);
    if (stack.has(v))
      return '@cycle:' + (v._name || 'anon');
    stack.add(v);
    let t = '';
    try {
      t = String(realDefOf(v));
    } catch (e) {
      t = '';
    }
    const ins = (v._inputs || []).map(i => (i && i._name ? String(i._name) : '?') + '=' + memoKeyOf(i, M, cache, stack)).join(',');
    stack.delete(v);
    const h = hashText(String(v._name || v.pid || '') + '|' + t + '|' + ins);
    cache.set(v, h);
    return h;
  };
  const memoEligible = (v, M, dels) => {
    if (!v || !v._name || v._module !== M || !v.pid)
      return false;
    if (MEMO_STRUCT_NAME.test(String(v._name)) || isStructural(v))
      return false;
    if (dels.indexOf(v) >= 0)
      return false;
    const src = srcOf(v);
    if (src && MEMO_WRITE_RE.test(src))
      return false;
    return true;
  };
  // Only what survives JSON: a Date, a Map, a typed array or a DOM node round-trips to something
  // else, so it is skipped silently rather than restored wrong.
  const memoStorable = val => {
    if (val === null || typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean')
      return true;
    if (Array.isArray(val))
      return true;
    return !!val && typeof val === 'object' && (val.constructor === Object || val.constructor === undefined);
  };
  const memoRecord = (st, it, val, elapsed, fin) => {
    fin.set(it.v, elapsed);
    // Every timer starts at the apply hook, so a cell's elapsed carries its inputs' time with it:
    // charge it only what it added over the slowest input it waited for.
    let base = 0;
    for (const i of it.v._inputs || []) {
      const e = fin.get(i);
      if (typeof e === 'number' && e > base)
        base = e;
    }
    const self = elapsed - base;
    if (self < MEMO_MIN_MS)
      return;
    st.slow++;
    if (!memoStorable(val))
      return;
    let json;
    try {
      json = JSON.stringify(val);
    } catch (e) {
      return;
    }
    if (typeof json !== 'string' || json.length > MEMO_MAX_BYTES)
      return;
    st.store[it.key] = {
      key: it.key,
      module: it.module,
      name: it.name,
      ms: self,
      bytes: json.length,
      at: Date.now(),
      json
    };
  };
  const memoTime = (M, list, st) => {
    const fin = new Map();
    for (const it of list) {
      const t0 = Date.now();
      let p;
      try {
        p = M.value(it.name);
      } catch (e) {
        continue;
      }
      Promise.resolve(p).then(val => {
        try {
          memoRecord(st, it, val, Date.now() - t0, fin);
        } catch (e) {
        }
      }, () => {
      });
    }
  };
  // Called SYNCHRONOUSLY from applyModuleSrc the moment the module's variables are defined and before
  // the runtime has computed any of them, so a hit means the cell never runs. The stub keeps the
  // cell's ORIGINAL inputs (the dependency graph, and therefore core_status, is unchanged) and
  // carries the real definition on __rc5real — the df20 scratch clone builds from THAT, so a mutation
  // check on a memoised cell still recomputes it and still notices the mutant. toString() also
  // returns the real source, so jbApply's definition comparison, hashOf's freshness, cellSource and
  // code-metrics all keep reading the cell the agent wrote.
  const memoApply = (id, opts) => {
    const st = memoLoad(memoState());
    const M = resolveModule(id);
    if (!M)
      return null;
    const stubsOnly = !!(opts && opts.stubsOnly);
    let dels = [];
    try {
      dels = deliverableCells(M);
    } catch (e) {
      dels = [];
    }
    const cache = new Map(), stack = new Set(), timed = [];
    for (const v of varsOf(M)) {
      if (!memoEligible(v, M, dels))
        continue;
      const ins = scratchInputsOf(v, M);
      if (ins == null)
        continue;
      const key = id + '#' + memoKeyOf(v, M, cache, stack);
      const ent = st.store[key];
      if (!ent) {
        if (!stubsOnly)
          timed.push({
            v,
            key,
            name: String(v._name),
            module: id
          });
        continue;
      }
      if (v._definition && v._definition.__rc5key === key)
        continue;
      // Retro-application (the ledger arrived at setup.init, after the seed): a cell that already
      // produced a value on this page has nothing left to save, and redefining it would only dirty
      // everything downstream of it.
      if (stubsOnly && v._value !== undefined)
        continue;
      let val;
      try {
        val = JSON.parse(ent.json);
      } catch (e) {
        continue;
      }
      const real = realDefOf(v);
      const stub = function () {
        return val;
      };
      stub.__rc5real = real;
      stub.__rc5key = key;
      stub.toString = () => String(real);
      try {
        v.define(String(v._name), ins, stub);
      } catch (e) {
        continue;
      }
      if (!st.stubbed[key]) {
        st.stubbed[key] = true;
        st.hits++;
      }
    }
    if (timed.length)
      memoTime(M, timed, st);
    return {
      restored: st.hits,
      recomputed: st.slow
    };
  };
  // The ledger restore calls this after the page has already been seeded: stubs only, for the cells
  // whose recompute is still in flight (in a walk the /local-disk mount lands after the seed and
  // dirties every data cell).
  const memoRestore = () => {
    const out = [];
    try {
      for (const id of Object.keys(globalThis.__rc5ApplyCount || {}))
        out.push(memoApply(id, { stubsOnly: true }));
    } catch (e) {
    }
    return out;
  };
  const memoCollect = () => {
    const st = memoLoad(memoState());
    const rows = Object.keys(st.store).map(k => st.store[k]).filter(e => e && typeof e.json === 'string');
    rows.sort((a, b) => (b.ms || 0) - (a.ms || 0));
    const out = [];
    let total = 0;
    for (const e of rows) {
      const n = e.json.length;
      if (total + n > MEMO_TOTAL_BYTES)
        continue;
      total += n;
      out.push(e);
    }
    return out;
  };
  const memoStats = () => {
    const st = memoState();
    return {
      restored: st.hits,
      recomputed: st.slow,
      available: Object.keys(st.store).length,
      minMs: MEMO_MIN_MS
    };
  };
  globalThis.__rc5MemoApply = memoApply;
  globalThis.__rc5MemoRestore = memoRestore;
  globalThis.__rc5MemoCollect = memoCollect;
  globalThis.__rc5MemoStats = memoStats;

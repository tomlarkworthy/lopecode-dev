  // ------------------------------------------ df33: evidence provenance (real-anchored attestations)
  // Walks ae and ag (2026-09-23) built a verified core and got ~0 real periods within 2 %: the most
  // verified cell was attested by references planted on SYNTHETIC sampling (uniform grids, 500 random
  // points) while the real data is two-band, 950 points over 2740 d. A cell now enters the core only
  // with at least one attestation whose evidence (1) has a cell upstream that reads the task's data —
  // df29's source analysis against globalThis.__rc5SeedRoots — and (2) unless it is a nullcheck,
  // changes its outcome when that data is destroyed (a scratch clone, the df20 machinery). With no
  // __rc5SeedRoots global every rule here is off and the page is df32.
  const ANC_PREFIX = '__rc5anc_';
  const ANC_BUDGET_MS = 60000;
  const anchorOn = () => !!seedRoots();
  // A cell reads the task's data when its source names a /local-disk path under a seed root; a
  // template path counts when its static prefix (up to the first ${) is under a root (df31's rule).
  const readsTaskData = v => {
    const roots = seedRoots();
    if (!roots || !v)
      return false;
    let paths = [];
    try {
      paths = localPathsIn(srcOf(v));
    } catch (e) {
      return false;
    }
    return paths.some(p => {
      if (!p.unknown)
        return underRoot(p.path, roots);
      const i = p.path.indexOf('${');
      const pre = i < 0 ? p.path : p.path.slice(0, i);
      return roots.some(r => pre.indexOf(r + '/') === 0);
    });
  };
  // Readers strictly UPSTREAM of the evidence cell (up() follows imports through deref).
  const readersOf = ev => [...up(ev)].filter(readsTaskData);
  // ---- destroy(): keep the shape, break the relationships. Deterministic (fixed seed).
  const ANC_SEED = 0xdf33;
  const ancRng = seed => {
    let a = seed | 0;
    return () => {
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  const ancPerm = (n, seed) => {
    const r = ancRng(seed);
    const p = [];
    for (let i = 0; i < n; i++)
      p.push(i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    if (n > 1 && p.every((x, i) => x === i))
      p.push(p.shift());
    return p;
  };
  // Field j of every record is taken from record first[(i + j*step) % n]: no two fields of an output
  // record come from the same input record (when n >= the field count).
  const ancColPerms = (n, w, seed) => {
    const first = ancPerm(n, seed);
    const step = Math.max(1, Math.floor(n / Math.max(1, w)));
    const out = [];
    for (let j = 0; j < w; j++)
      out.push(first.map((_, i) => first[(i + j * step) % n]));
    return out;
  };
  const isPlainObj = x => x !== null && typeof x === 'object' && !Array.isArray(x) && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
  const CSV_DELIMS = [
    ',',
    '\t',
    ';'
  ];
  const destroyCsv = (s, seed) => {
    const nl = s.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
    const lines = s.split(/\r?\n/);
    let end = lines.length;
    while (end > 0 && lines[end - 1] === '')
      end--;
    const body = lines.slice(0, end);
    if (body.length < 3)
      return null;
    const header = body[0];
    const d = CSV_DELIMS.find(c => header.indexOf(c) >= 0);
    if (!d)
      return null;
    const w = header.split(d).length;
    const rows = body.slice(1).map(l => l.split(d));
    if (rows.some(r => r.length !== w))
      return null;
    const perms = ancColPerms(rows.length, w, seed);
    for (let j = 0; j < w; j++) {
      const p = perms[j];
      const col = rows.map(r => r[j]);
      for (let i = 0; i < rows.length; i++)
        rows[i][j] = col[p[i]];
    }
    return [header].concat(rows.map(r => r.join(d))).join(nl) + lines.slice(end).map(() => nl).join('');
  };
  const destroy = (x, seed, depth) => {
    seed = seed == null ? ANC_SEED : seed;
    depth = depth || 0;
    if (depth > 8 || x == null)
      return x;
    if (typeof x === 'string') {
      const c = destroyCsv(x, seed);
      return c == null ? x : c;
    }
    if (typeof x !== 'object')
      return x;
    if (ArrayBuffer.isView(x) && !(x instanceof DataView)) {
      const p = ancPerm(x.length, seed);
      const out = new x.constructor(x.length);
      for (let i = 0; i < x.length; i++)
        out[i] = x[p[i]];
      return out;
    }
    if (Array.isArray(x)) {
      const n = x.length;
      if (n === 0)
        return [];
      if (n === 1)
        return [destroy(x[0], seed + 1, depth + 1)];
      if (x.every(isPlainObj)) {
        const keys = [];
        for (const r of x)
          for (const k of Object.keys(r))
            if (keys.indexOf(k) < 0)
              keys.push(k);
        const out = x.map(r => Object.assign({}, r));
        const perms = ancColPerms(n, keys.length, seed);
        keys.forEach((k, j) => {
          const p = perms[j];
          for (let i = 0; i < n; i++) {
            const src = x[p[i]];
            if (Object.prototype.hasOwnProperty.call(src, k))
              out[i][k] = src[k];
            else
              delete out[i][k];
          }
        });
        return out;
      }
      if (x.every(Array.isArray) && x.every(r => r.length === x[0].length) && x[0].length > 1) {
        const w = x[0].length;
        const out = x.map(r => r.slice());
        const perms = ancColPerms(n, w, seed);
        for (let j = 0; j < w; j++) {
          const p = perms[j];
          for (let i = 0; i < n; i++)
            out[i][j] = x[p[i]][j];
        }
        return out;
      }
      const p = ancPerm(n, seed);
      return p.map(i => x[i]);
    }
    if (isPlainObj(x)) {
      const out = {};
      Object.keys(x).forEach((k, j) => {
        out[k] = destroy(x[k], seed + 7919 * (j + 1), depth + 1);
      });
      return out;
    }
    return x;
  };
  // A function-cell loader (load_target(i)) is replaced by a wrapper that destroys what it returns.
  const destroyValue = x => {
    if (typeof x !== 'function')
      return destroy(x);
    const f = x;
    return function (...a) {
      const r = f.apply(this, a);
      return r && typeof r.then === 'function' ? r.then(v => destroy(v)) : destroy(r);
    };
  };
  // ---- outcome = pass vector + every numeric field; "different" = a pass flips or a number moves
  // by more than 1e-9 relative.
  const ancNums = (x, out, d) => {
    if (out.length > 20000)
      return;
    if (typeof x === 'number') {
      out.push(x);
      return;
    }
    if (x == null || typeof x !== 'object' || d > 5)
      return;
    if (ArrayBuffer.isView(x) && !(x instanceof DataView)) {
      for (let i = 0; i < x.length && out.length <= 20000; i++)
        out.push(Number(x[i]));
      return;
    }
    if (Array.isArray(x)) {
      for (const y of x)
        ancNums(y, out, d + 1);
      return;
    }
    if (isPlainObj(x))
      for (const k of Object.keys(x))
        ancNums(x[k], out, d + 1);
  };
  const outcomeOf = val => {
    const passes = [], nums = [];
    if (Array.isArray(val))
      for (const r of val) {
        passes.push(r && typeof r === 'object' ? r.pass : undefined);
        ancNums(r, nums, 0);
      }
    else
      ancNums(val, nums, 0);
    return {
      len: Array.isArray(val) ? val.length : -1,
      passes,
      nums
    };
  };
  const numDiffers = (a, b) => {
    if (a === b)
      return false;
    if (Number.isNaN(a) || Number.isNaN(b))
      return !(Number.isNaN(a) && Number.isNaN(b));
    if (!Number.isFinite(a) || !Number.isFinite(b))
      return a !== b;
    return Math.abs(a - b) > 1e-9 * Math.max(Math.abs(a), Math.abs(b));
  };
  const outcomeDiffers = (A, B) => {
    if (A.len !== B.len || A.passes.length !== B.passes.length || A.nums.length !== B.nums.length)
      return true;
    for (let i = 0; i < A.passes.length; i++)
      if (A.passes[i] !== B.passes[i])
        return true;
    for (let i = 0; i < A.nums.length; i++)
      if (numDiffers(A.nums[i], B.nums[i]))
        return true;
    return false;
  };
  const ancRace = (p, ms) => new Promise(resolve => {
    let done = false;
    const fin = r => {
      if (!done) {
        done = true;
        resolve(r);
      }
    };
    Promise.resolve().then(() => p()).then(value => fin({ value }), error => fin({ error: error && error.message || String(error) }));
    setTimeout(() => fin({
      error: 'timed out',
      timeout: true
    }), Math.max(1, ms));
  });
  // Re-run the evidence in a scratch clone where every local cell that brings the task's data in is
  // replaced by a CONSTANT holding its destroyed value (a function loader: a destroying wrapper). The
  // clone covers the cells between those replacement points and the evidence; nothing live is
  // redefined. A replacement point is a local reader, or a local import alias whose remote side is a
  // reader or sits downstream of one.
  const sensitivityRun = async (ev, M, evName, liveVal, readers) => {
    const t0 = Date.now();
    const rset = new Set(readers);
    const upv = localWalk(ev, '_inputs', M);
    const pts = [];
    for (const v of upv) {
      if (rset.has(v)) {
        pts.push(v);
        continue;
      }
      const d = deref(v);
      if (d !== v && (rset.has(d) || [...up(d)].some(u => rset.has(u))))
        pts.push(v);
    }
    if (!pts.length)
      return {
        status: 'unmeasured',
        why: 'the cells reading the task\'s data are not in ' + evName + '\'s module, and no import of them could be replaced'
      };
    const ptSet = new Set(pts);
    const down = new Set();
    for (const p of pts)
      for (const v of localWalk(p, '_outputs', M))
        down.add(v);
    const S = new Set([...down].filter(v => upv.has(v) && !ptSet.has(v)));
    S.add(ev);
    const names = new Set();
    for (const v of [...S, ...pts]) {
      if (!v._name)
        return {
          status: 'unmeasured',
          why: 'a cell between the task\'s data and ' + evName + ' has no name'
        };
      names.add(String(v._name));
    }
    const plan = [];
    for (const v of S) {
      const ins = scratchInputsOf(v, M);
      if (ins == null)
        return {
          status: 'unmeasured',
          why: 'the inputs of ' + v._name + ' cannot be addressed by name'
        };
      plan.push({
        v,
        name: String(v._name),
        inputs: ins.map(i => names.has(i) && !PASSTHROUGH_INPUT.test(i) ? ANC_PREFIX + i : i)
      });
    }
    const made = [];
    let r = { error: 'not run' }, built = false;
    try {
      for (const p of pts) {
        const nm = String(p._name);
        const left = ANC_BUDGET_MS - (Date.now() - t0);
        const lv = await ancRace(() => M.value(nm), left);
        if (lv.timeout)
          return { status: 'unmeasured', timeout: true };
        if (lv.error)
          return {
            status: 'unmeasured',
            why: 'reading ' + nm + ' failed: ' + lv.error
          };
        let dv;
        try {
          dv = destroyValue(lv.value);
        } catch (e) {
          return {
            status: 'unmeasured',
            why: 'destroying ' + nm + ' failed: ' + (e && e.message || String(e))
          };
        }
        made.push(M.variable().define(ANC_PREFIX + nm, [], () => dv));
      }
      for (const p of plan)
        made.push(M.variable().define(ANC_PREFIX + p.name, p.inputs, p.v._definition && p.v._definition.__rc5real || p.v._definition));
      built = true;
      r = await ancRace(() => M.value(ANC_PREFIX + evName), ANC_BUDGET_MS - (Date.now() - t0));
    } catch (e) {
      r = { error: 'could not build the scratch clone: ' + (e && e.message || String(e)) };
    } finally {
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
          if (k.indexOf(ANC_PREFIX) !== 0)
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
    if (r.timeout)
      return {
        status: 'unmeasured',
        timeout: true
      };
    if (!built)
      return {
        status: 'unmeasured',
        why: r.error
      };
    if (r.error)
      return {
        status: 'real-anchored',
        errored: true,
        replaced: pts.map(v => String(v._name))
      };
    const changed = outcomeDiffers(outcomeOf(liveVal), outcomeOf(r.value));
    return {
      status: changed ? 'real-anchored' : 'demoted',
      replaced: pts.map(v => String(v._name))
    };
  };
  const EXEC_EVIDENCE = [
    'reference',
    'null',
    'metamorphic',
    'library'
  ];
  // Called by attest after the mutation check, for an evidence-cell attestation. null = rules off.
  const anchorCheck = async (k, ev, evMod, evName, liveVal) => {
    if (!anchorOn())
      return null;
    if (EXEC_EVIDENCE.indexOf(k) < 0)
      return {
        status: 'synthetic',
        why: 'a ' + k + ' attestation has no evidence cell to read the task\'s data'
      };
    const readers = readersOf(ev);
    const via = readers.map(v => nameOf(v, moduleIdOf(ev._module))).sort().slice(0, 4);
    if (!readers.length)
      return {
        status: 'synthetic',
        why: 'nothing upstream of ' + evName + ' reads the task\'s data (seed roots: ' + seedRoots().join(', ') + ')'
      };
    if (k === 'null')
      return {
        status: 'real-anchored',
        via,
        nullcheck: true
      };
    const s = await sensitivityRun(ev, ev._module, String(evName), liveVal, readers);
    return Object.assign({ via }, s);
  };
  // The attest tool's one-line report on the attestation it just recorded.
  const anchorLine = (a, evName, cellName) => {
    if (!a)
      return '';
    const via = a.via && a.via.length ? ' (reads it via ' + a.via.join(', ') + ')' : '';
    if (a.status === 'real-anchored')
      return '\nanchoring: real-anchored — ' + evName + ' depends on the task\'s data' + via + (a.nullcheck ? '; a nullcheck is anchored without a sensitivity run' : a.errored ? '; it errored on destroyed data (errored on destroyed data), so its verdict depends on the data' : '; its outcome changed when that data was destroyed') + ' (df33)';
    if (a.status === 'demoted')
      return '\nanchoring: demoted: insensitive — ' + evName + ' anchored but INSENSITIVE: the verdict did not change when the task\'s data was destroyed — this evidence does not depend on the data (df33)';
    if (a.status === 'unmeasured')
      return '\nanchoring: unmeasured — ' + evName + (a.timeout ? ' anchoring UNMEASURED: the sensitivity run exceeded 60 s — use a lighter evidence (3 targets, not 100)' : ' anchoring UNMEASURED: ' + (a.why || 'the sensitivity run could not be built')) + '; treated as synthetic (df33)';
    return '\nanchoring: synthetic — ' + (a.why || evName + ' reads only invented data') + '; it weighs, but cannot complete ' + cellName + ' (df33)';
  };
  // coreOf's reading of one fresh attestation: rule 1 recomputed now (like staleness), rule 2 as
  // recorded at attest time.
  const anchorStatusOf = (e, cache) => {
    if (EXEC_EVIDENCE.indexOf(e.kind) < 0)
      return 'synthetic';
    const re = resolveRef(e.module, e.evidence);
    if (re.error)
      return 'synthetic';
    const ev = deref(re.v);
    let rd = cache && cache.get(ev);
    if (!rd) {
      rd = readersOf(ev);
      if (cache)
        cache.set(ev, rd);
    }
    if (!rd.length)
      return 'synthetic';
    if (e.kind === 'null')
      return 'real-anchored';
    const a = e.anchor;
    if (a && (a.status === 'real-anchored' || a.status === 'demoted'))
      return a.status;
    return 'unmeasured';
  };
  const anchorSentence = n => 'no REAL-ANCHORED evidence: every attestation of ' + n + ' reads only invented data — attest ' + n + ' with an evidence cell whose inputs include the task\'s data (a reference planted into a real target\'s own sampling, a check that two channels/halves of a real target agree, a null on shuffled real items) (df33)';
  globalThis.__rc5AnchorDestroy = destroy;

  const isPlainObj = x => x !== null && typeof x === 'object' && !Array.isArray(x) && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
  // df34: a numeric column is REDRAWN uniformly within its own [min, max] (integers stay integers),
  // not permuted. Walk ah turn 5 (2026-09-24): a permutation keeps each column's multiset, so an
  // evidence that plants its own signal on a real target's time stamps saw the same set of times and
  // was demoted `insensitive`. Non-finite entries (NaN, null, undefined) keep their place; a constant
  // column stays constant; non-numeric columns are still permuted.
  const ancIsNumCol = vals => {
    let n = 0;
    for (const v of vals) {
      if (v == null || typeof v === 'number' && Number.isNaN(v))
        continue;
      if (typeof v !== 'number')
        return false;
      if (Number.isFinite(v))
        n++;
    }
    return n > 0;
  };
  const ancRedraw = (vals, seed) => {
    let lo = Infinity, hi = -Infinity, ints = true;
    for (const v of vals)
      if (typeof v === 'number' && Number.isFinite(v)) {
        if (v < lo)
          lo = v;
        if (v > hi)
          hi = v;
        if (!Number.isInteger(v))
          ints = false;
      }
    if (!(lo < hi))
      return vals.slice();
    const r = ancRng(seed);
    return vals.map(v => {
      if (typeof v !== 'number' || !Number.isFinite(v))
        return v;
      const u = r();
      return ints ? Math.min(hi, lo + Math.floor(u * (hi - lo + 1))) : lo + u * (hi - lo);
    });
  };
  const CSV_DELIMS = [
    ',',
    '\t',
    ';'
  ];
  const CSV_NUM = /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/;
  const CSV_HOLE = /^\s*(|nan|NaN|NA|null)\s*$/;
  // A CSV column is numeric when every cell parses as a number or is a hole (empty/NaN/NA); redrawn
  // values are printed with the column's widest decimal count (exponent notation: String(v)).
  const destroyCsvCol = (col, seed) => {
    let n = 0, dec = 0, expo = false;
    for (const c of col) {
      if (CSV_HOLE.test(c))
        continue;
      if (!CSV_NUM.test(c))
        return null;
      n++;
      const t = c.trim();
      if (/[eE]/.test(t))
        expo = true;
      const i = t.indexOf('.');
      if (i >= 0)
        dec = Math.max(dec, t.replace(/[eE].*$/, '').length - i - 1);
    }
    if (!n)
      return null;
    const vals = col.map(c => CSV_HOLE.test(c) ? null : Number(c));
    const ints = !expo && dec === 0;
    const red = ancRedraw(vals, seed);
    return col.map((c, i) => red[i] == null ? c : expo ? String(red[i]) : ints ? String(red[i]) : red[i].toFixed(dec));
  };
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
      const col = rows.map(r => r[j]);
      const red = destroyCsvCol(col, seed + 104729 * (j + 1));
      const p = perms[j];
      for (let i = 0; i < rows.length; i++)
        rows[i][j] = red ? red[i] : col[p[i]];
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
      if (typeof x[0] === 'bigint') {
        const p = ancPerm(x.length, seed);
        const out = new x.constructor(x.length);
        for (let i = 0; i < x.length; i++)
          out[i] = x[p[i]];
        return out;
      }
      const red = ancRedraw(Array.from(x), seed);
      const out = new x.constructor(x.length);
      for (let i = 0; i < x.length; i++)
        out[i] = red[i];
      return out;
    }
    if (Array.isArray(x)) {
      const n = x.length;
      if (n === 0)
        return [];
      if (ancIsNumCol(x))
        return ancRedraw(x, seed);
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
          const col = x.map(r => r[k]);
          if (ancIsNumCol(col)) {
            const red = ancRedraw(col, seed + 104729 * (j + 1));
            for (let i = 0; i < n; i++)
              if (Object.prototype.hasOwnProperty.call(x[i], k))
                out[i][k] = red[i];
            return;
          }
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
          const col = x.map(r => r[j]);
          if (ancIsNumCol(col)) {
            const red = ancRedraw(col, seed + 104729 * (j + 1));
            for (let i = 0; i < n; i++)
              out[i][j] = red[i];
            continue;
          }
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
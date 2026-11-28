// incr2: the per-cell memo of a check. A cell's key is its text and what its check reads of the module when it starts:
// for each name it holds, the interface of the cell of that name as the tables hold it then, the texts of the type
// declarations it reaches, how other cells take it, and the settings. A cell whose key equals its entry's is not
// checked again: its record and its writes to the tables come back from the entry.

// a text's digest: two sums modulo primes below 2^31, and the length
export const mdHash = () => (s: string): string => {
  let a = 7, b = 11;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = (a * 131 + c) % 2147483647;
    b = (b * 137 + c) % 2147483629;
  }
  return `${a.toString(36)}.${b.toString(36)}.${s.length.toString(36)}`;
};
// the names of the named types in t
export const mdTyNames = () => (t: Ty | null | undefined): Set<string> => {
  const out: Mut<Set<string>> = new Set();
  const todo: Mut<[Ty, number][]> = t === null || t === undefined ? [] : [[t, 0]];
  for (let top = todo.pop(); top !== undefined; top = todo.pop()) {
    const [x, depth] = top;
    if (depth > 60) continue;
    const kids: Ty[] = x.k === "named" ? x.args : x.k === "arr" ? [x.el] : x.k === "tup" ? x.els : x.k === "union" ? x.ts
      : x.k === "fn" ? [...x.ps.map((p) => p.t), x.ret, ...(x.rest === undefined ? [] : [x.rest])]
      : x.k === "rec" ? [...[...x.props.values()].map((p) => p.t), ...(x.index === undefined ? [] : [x.index]), ...(x.calls ?? []), ...(x.ctors ?? [])] : [];
    if (x.k === "named") out.add(x.n);
    for (const y of kids) todo.push([y, depth + 1]);
  }
  return out;
};
// the digest of the texts of the type declarations n reaches by name, null when n is no type declaration; each text
// is hashed once and each digest made once per check (cache: "t:" and "g:" entries)
export const mdDigest = (mdHash) => (D: Map<string, MdDecl>, cache: Mut<Map<string, string>>, n: string): string | null => {
  if (!D.has(n)) return null;
  const hit = cache.get(`g:${n}`);
  if (hit !== undefined) return hit;
  const seen: Mut<Set<string>> = new Set();
  const todo = [n];
  while (todo.length) {
    const x = todo.pop() ?? "";
    if (seen.has(x) || !D.has(x)) continue;
    seen.add(x);
    for (const r of D.get(x)?.refs ?? []) todo.push(r);
  }
  const hashes: Mut<string[]> = [];
  for (const x of [...seen].toSorted()) {
    const h = cache.get(`t:${x}`) ?? mdHash(D.get(x)?.text ?? "");
    cache.set(`t:${x}`, h);
    hashes.push(`${x}:${h}`);
  }
  const g = mdHash(hashes.join(","));
  cache.set(`g:${n}`, g);
  return g;
};
// what the tables hold for the cell n as a check starts: its status, its value and inner types (each with the digests
// of the declarations they name), whether it is a listener, why it is stateful or fed a function; "unchecked" before
// its own check
export const mdIface = (typeKey, mdTyNames, mdDigest) => (X: MdCtx, M: MdMod, n: string, cache: Mut<Map<string, string>>): string => {
  if (!M.value.has(n)) return "unchecked";
  const hit = cache.get(`i:${n}`);
  if (hit !== undefined) return hit;
  const v = M.value.get(n) ?? null, ref = M.refInner.get(n) ?? null, ev = M.eventsInner.get(n) ?? null;
  const tk = (t: Ty | null): string => (t === null ? "-" : typeKey(t));
  const named = [...new Set([...mdTyNames(v), ...mdTyNames(ref), ...mdTyNames(ev)])].toSorted().flatMap((t) => {
    const g = mdDigest(X.decls, cache, t);
    return g === null ? [] : [`${t}=${g}`];
  });
  const r = M.out.get(n), fn = X.byName.get(n)?.fn;
  const s = `${r?.status ?? "-"}|${r?.errors.length ?? 0}|${r?.blockedBy.length ?? 0}|${r?.promises ?? "-"}|${v === null ? "null" : tk(v)}|${tk(ref)}|${tk(ev)}|${M.listeners.has(n)}`
    + `|${M.stateful.get(n) ?? "-"}|${M.fnFed.get(n) ?? "-"}|${fn?.async ?? "-"}|${fn?.generator ?? "-"}|${named.join(",")}`;
  cache.set(`i:${n}`, s);
  return s;
};
// the cells a compile(...) call in d may run: the cell names its strings hold, and the cells those take, again and
// again; none when d calls no compile
export const mdIslandOf = (childrenOf) => (X: MdCtx, d: MdDef): string[] => {
  const strs: Mut<string[]> = [];
  let calls = false;
  const walk = (x: AstNode): void => {
    if (x.type === "CallExpression" && x.callee.type === "Identifier" && x.callee.name === "compile") calls = true;
    if (x.type === "Literal" && typeof x.value === "string" && X.cellNames.has(x.value)) strs.push(x.value);
    for (const k of childrenOf(x)) walk(k.node);
  };
  walk(d.stmt);
  if (!calls) return [];
  const seen: Mut<Set<string>> = new Set();
  while (strs.length) {
    const n = strs.pop() ?? "";
    if (seen.has(n)) continue;
    seen.add(n);
    for (const p of X.byName.get(n)?.fn.params ?? []) if (p.type === "Identifier" && X.cellNames.has(p.name)) strs.push(p.name);
  }
  return [...seen].toSorted();
};
// the key of d as its check starts: the settings, its text and the errors its fresh record holds (lines from its own),
// then for each name it holds what that name is to the module, and the cells its compile calls may run
export const mdKeyOf = (mdHash, mdIface, mdIslandOf, typeKey, mdDigest) => (X: MdCtx, M: MdMod, d: MdDef, names: Set<string>, K: MdKeyCtx, cache: Mut<Map<string, string>>): string => {
  const line = X.line(d.stmt.start);
  const fresh = (M.out.get(d.name)?.errors ?? []).map((e) => `${e.rule}@${e.line - line}:${e.msg}`);
  const parts: Mut<string[]> = [K.settings, X.src.slice(d.stmt.start, d.stmt.end), ...fresh];
  for (const n of [...names].toSorted()) {
    const p: Mut<string[]> = [];
    if (X.cellNames.has(n)) p.push(`pre:${mdIface(X, M, n, cache)}`);
    const vt = M.viewTypes.get(n);
    if (vt !== undefined) p.push(`view:${typeKey(vt.ty)}@${vt.cell}`);
    if (X.takenAsEvents.has(n)) p.push("events");
    if (K.dups.has(n)) p.push("dup");
    const g = mdDigest(X.decls, cache, n);
    if (g !== null) p.push(`type:${g}`);
    const o = X.outside.get(n);
    if (o !== undefined) p.push(`outside:${o.view}`);
    parts.push(`${n}=${p.length ? p.join(";") : "absent"}`);
  }
  for (const n of mdIslandOf(X, d)) {
    const c = X.byName.get(n);
    parts.push(`island:${n}:${c === undefined ? "-" : mdHash(X.src.slice(c.stmt.start, c.stmt.end))}:${mdIface(X, M, n, cache)}`);
  }
  return mdHash(parts.join("\u0001"));
};
// r with every position moved by dp and every line by dl (an entry keeps them relative to the cell's statement)
export const mdShift = () => (r: MdCellRec, dp: number, dl: number): MdCellRec => {
  if (dp === 0 && dl === 0) return r;
  const e = (x: MdErr): MdErr => ({ ...x, line: x.line + dl });
  const p = (x: IxDiag): IxDiag => ({ ...x, start: x.start + dp, end: x.end + dp });
  return { ...r, line: r.line + dl, errors: r.errors.map(e), unsupported: r.unsupported.map(e), ch: r.ch.map(p), chUnsup: r.chUnsup.map(p), at: r.at + dp };
};
// what d's check wrote to the tables; views0: the views that had a State type before it
export const mdWritesOf = () => (M: MdMod, d: MdDef, views0: Set<string>): MdWrites => ({
  value: M.value.get(d.name) ?? null, refInner: M.refInner.get(d.name) ?? null, eventsInner: M.eventsInner.get(d.name) ?? null,
  stateful: M.stateful.get(d.name) ?? null, fnFed: M.fnFed.get(d.name) ?? null, listener: M.listeners.has(d.name),
  boundaries: M.boundaries.get(d.name) ?? null,
  views: [...M.viewTypes].filter(([n]) => !views0.has(n)),
});
// the writes of an entry put back
export const mdRestore = () => (M: MdMod, d: MdDef, w: MdWrites): void => {
  M.value = new Map([...M.value, [d.name, w.value]]);
  if (w.refInner !== null) M.refInner = new Map([...M.refInner, [d.name, w.refInner]]);
  if (w.eventsInner !== null) M.eventsInner = new Map([...M.eventsInner, [d.name, w.eventsInner]]);
  if (w.stateful !== null) M.stateful = new Map([...M.stateful, [d.name, w.stateful]]);
  if (w.fnFed !== null) M.fnFed = new Map([...M.fnFed, [d.name, w.fnFed]]);
  if (w.listener) M.listeners = new Set([...M.listeners, d.name]);
  if (w.boundaries !== null) M.boundaries = new Map([...M.boundaries, [d.name, w.boundaries]]);
  if (w.views.length) M.viewTypes = new Map([...M.viewTypes, ...w.views]);
};
// one step of the cell loop: d from its entry when the key is the entry's, else checked; its record goes in M.out with
// the declarations' problems of this check added; its entry goes in entries (none when a memo is not given)
export const mdStep = (mdCell, mdDeclDiagsOf, mdNamesIn, mdDeclAdd, mdKeyOf, mdShift, mdWritesOf, mdRestore) => (X: MdCtx, M: MdMod, d: MdDef, K: MdKeyCtx | null, cache: Mut<Map<string, string>>, entries: Mut<Map<string, MdEntry>>): string | null => {
  if (M.value.has(d.name) || !M.out.has(d.name)) return null;
  const names = mdNamesIn(d.stmt), ds = mdDeclDiagsOf(X.decls, names);
  const prior = X.prior, pos = d.stmt.start, line = X.line(pos);
  const key = K === null || prior === null || K.dups.has(d.name) ? null : mdKeyOf(X, M, d, names, K, cache);
  const e = key === null || prior === null ? null : prior(d.name);
  if (e !== null && e.key === key) {
    mdRestore(M, d, e.w);
    M.out = new Map([...M.out, [d.name, mdDeclAdd(X, mdShift(e.own, pos, line), ds)]]);
    entries.set(d.name, e);
    return null;
  }
  const views0 = new Set(M.viewTypes.keys());
  const run = mdCell(X, M, d, ds);
  if (run === null) return null;
  M.out = new Map([...M.out, [d.name, mdDeclAdd(X, run.own, ds)]]);
  if (key !== null) entries.set(d.name, { key, own: mdShift(run.own, -pos, -line), w: mdWritesOf(M, d, views0) });
  return run.gap;
};
// the cell loop: each cell of order in turn; the first gap met, and the entries (an empty map when no memo is given)
export const mdLoop = (mdStep, mdHash) => (X: MdCtx, M: MdMod, order: MdDef[], S: MdSources, dups: MdDup[]): { gap: string | null; entries: Map<string, MdEntry> } => {
  const settings = mdHash([S.tsx, S.foreign ?? "-", S.shell ?? "-", S.bound.join(",")].join("\u0001"));
  const K: MdKeyCtx | null = X.prior === null ? null : { settings, dups: new Set(dups.flatMap((x) => [x.name, x.ph])) };
  const cache: Mut<Map<string, string>> = new Map();
  const entries: Mut<Map<string, MdEntry>> = new Map();
  let gap: string | null = null;
  for (const d of order) {
    const g = mdStep(X, M, d, K, cache, entries);
    if (gap === null) gap = g;
  }
  return { gap, entries };
};
// incr2 (D3): the module's parse: from its cells' texts parsed one by one, each parse kept by its text (parseParts),
// when the parts are given and join to the text; else, or when that parse fails, as mdDistinct parses the whole text
export const mdParseOf = (mdDistinct, parseParts) => (S: MdSources): { parse: Parse; text: string; dups: MdDup[] } => {
  const p = S.parts === null || S.parts.join("\n\n") !== S.cells ? null : parseParts(S.parts, S.tsx);
  return p !== null && p.ok ? { parse: p, text: S.cells, dups: [] } : mdDistinct(S.cells, S.tsx);
};

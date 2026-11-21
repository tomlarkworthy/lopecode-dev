// A check of several modules: the modules in the order of their imports, each checked with the exports of the
// modules it imports from. An import edge inside a cycle of modules stays a cell in another language (section 11).

// a module's `import type` statements and the names of its own types; none when the text does not parse
export const tiModuleHead = (parseTree, declOf) => (m: TiModule): TiHead => {
  const p = parseTree(m.cells, true);
  if (!p.ok || p.ast.program.type !== "Program") return { typeImports: [], ownTypes: new Set() };
  const typeImports: Mut<TiTypeImport[]> = mut([]);
  const ownTypes: Mut<Set<string>> = mut(new Set());
  for (const st of p.ast.program.body) {
    const d = declOf(st);
    if ((d.type === "TSTypeAliasDeclaration" || d.type === "TSInterfaceDeclaration") && d.id.type === "Identifier") ownTypes.add(d.id.name);
    if (st.type !== "ImportDeclaration" || st.importKind !== "type" || st.source.type !== "Literal" || typeof st.source.value !== "string") continue;
    for (const sp of st.specifiers) {
      if (sp.type === "ImportSpecifier" && sp.imported.type === "Identifier" && sp.local.type === "Identifier") typeImports.push({ local: sp.local.name, imported: sp.imported.name, from: st.source.value, at: sp });
    }
  }
  return { typeImports: freeze(typeImports), ownTypes: freeze(ownTypes) };
};
// the modules of the program a module imports from, values and types
export const tiEdges = () => (m: TiModule, typeImports: TiTypeImport[], names: Set<string>): string[] =>
  [...new Set([...m.imports.map((i) => i.from), ...typeImports.map((t) => t.from)])].filter((n) => names.has(n) && n !== m.name);
// whether to is reached from from over the edges
export const tiReaches = () => (edges: Map<string, string[]>, from: string, to: string): boolean => {
  const seen: Mut<Set<string>> = mut(new Set());
  const todo: Mut<string[]> = mut([from]);
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (n === to) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    for (const k of edges.get(n) ?? []) todo.push(k);
  }
  return false;
};
// the order of checking: each module after the modules it imports from; an edge inside a cycle is not followed
export const tiModuleOrder = (tiReaches) => (names: string[], edges: Map<string, string[]>): { order: string[]; cyclic: Set<string> } => {
  const cyclic = new Set(names.flatMap((a) => (edges.get(a) ?? []).filter((b) => tiReaches(edges, b, a)).map((b) => `${a} -> ${b}`)));
  const done: Mut<Set<string>> = mut(new Set());
  const order: Mut<string[]> = mut([]);
  function visit(n: string): void {
    if (done.has(n)) return;
    done.add(n);
    for (const b of edges.get(n) ?? []) if (!cyclic.has(`${n} -> ${b}`)) visit(b);
    order.push(n);
  }
  for (const n of names) visit(n);
  return { order: freeze(order), cyclic };
};
// an import by name: the export of the module it names, or what that module imports under the name (a re-export)
export const tiResolve = () => {
  function resolve(P: Map<string, TiModResult>, mods: Map<string, TiModule>, from: string, name: string, depth: number): { home: string; e: TiExport } | null {
    const r = P.get(from), m = mods.get(from);
    if (r === undefined || m === undefined || depth > mods.size) return null;
    const e = r.ss ? r.exports.find((x) => x.name === name) : undefined;
    if (e !== undefined) return { home: from, e };
    const via = m.imports.find((i) => i.local === name);
    return via === undefined ? null : resolve(P, mods, via.from, via.imported, depth + 1);
  }
  return resolve;
};
// the imports a module's check takes by reference: a value export of a SoundScript module, not on a cycle and
// not named like a capability. Every other import stays a cell in another language, as it is today.
export const tiSeeds = (tiResolve) => (P: Map<string, TiModResult>, mods: Map<string, TiModule>, m: TiModule, cyclic: Set<string>, caps: Set<string>): { seeds: TiSeed[]; errs: MdErr[] } => {
  const seeds: Mut<TiSeed[]> = mut([]);
  const errs: Mut<MdErr[]> = mut([]);
  for (const i of m.imports) {
    if (cyclic.has(`${m.name} -> ${i.from}`) || caps.has(i.local)) continue;
    const hit = tiResolve(P, mods, i.from, i.imported, 0);
    const js = mods.get(i.from)?.outside.some((o) => o.name === i.imported) === true;
    if (hit === null && !js && P.get(i.from)?.ss === true) errs.push({ rule: "import-unknown", line: 0, msg: `${i.from} has no cell ${i.imported}` });
    if (hit === null) continue;
    if (hit.e.kind !== "value") continue;
    seeds.push({ local: i.local, from: i.from, imported: i.imported, home: hit.home, t: hit.e.t, stateful: hit.e.stateful, fnFed: hit.e.fnFed });
  }
  return { seeds: freeze(seeds), errs: freeze(errs) };
};
// the named types a type mentions
export const tiTyNames = () => {
  function names(t: Ty, out: Mut<Set<string>>, depth: number): void {
    if (depth > 64) return;
    const all = (xs: Ty[]): void => { for (const x of xs) names(x, out, depth + 1); };
    if (t.k === "named") { out.add(t.n); all(t.args); }
    else if (t.k === "arr") names(t.el, out, depth + 1);
    else if (t.k === "tup") all(t.els);
    else if (t.k === "union") all(t.ts);
    else if (t.k === "fn") { all(t.ps.map((p) => p.t)); names(t.ret, out, depth + 1); if (t.rest !== undefined) names(t.rest, out, depth + 1); }
    else if (t.k === "rec") {
      all([...t.props.values()].map((p) => p.t));
      if (t.index !== undefined) names(t.index, out, depth + 1);
      for (const f of [...(t.calls ?? []), ...(t.ctors ?? [])]) names(f, out, depth + 1);
    }
  }
  return names;
};
// from names in the namespace of home, every declaration they reach, each in the namespace of the module that declares it
export const tiClosure = () => (vis: Map<string, Map<string, TiTypeDecl>>, starts: { home: string; name: string }[]): TiTypeDecl[] => {
  const out: Mut<Map<string, TiTypeDecl>> = mut(new Map());
  const todo: Mut<{ home: string; name: string }[]> = mut([...starts]);
  for (let s = todo.pop(); s !== undefined; s = todo.pop()) {
    const d = vis.get(s.home)?.get(s.name);
    if (d === undefined || out.has(`${d.origin} ${d.name}`)) continue;
    out.set(`${d.origin} ${d.name}`, d);
    for (const r of d.refs) todo.push({ home: d.origin, name: r });
  }
  return [...out.values()];
};
// the type names of a list of declarations that clash: declared by two modules, or by an imported module and this one
export const tiClashNames = () => (decls: TiTypeDecl[], ownTypes: Set<string>): Map<string, string> => {
  const origins: Mut<Map<string, string[]>> = mut(new Map());
  for (const d of decls) { const o = origins.get(d.name) ?? []; if (!o.includes(d.origin)) origins.set(d.name, [...o, d.origin]); }
  const out: Mut<Map<string, string>> = mut(new Map());
  for (const [name, os] of origins) {
    if (ownTypes.has(name)) out.set(name, `type ${name} of ${os.join(" and ")} has the name of a type of this module`);
    else if (os.length > 1) out.set(name, `type ${name} is declared by ${os.join(" and ")}`);
  }
  return freeze(out);
};
// an `import type` the module may use: of a type that a SoundScript module of the program makes visible, unrenamed
export const tiTypeImportErr = () => (vis: Map<string, Map<string, TiTypeDecl>>, P: Map<string, TiModResult>, ti: TiTypeImport): MdErr | null => {
  if (P.get(ti.from)?.ss !== true) return null;
  if (ti.local !== ti.imported) return { rule: "unsupported", line: ti.at.line, msg: `import type { ${ti.imported} as ${ti.local} }: a renamed type import` };
  return vis.get(ti.from)?.has(ti.imported) === true ? null : { rule: "import-unknown", line: ti.at.line, msg: `${ti.from} has no type ${ti.imported}` };
};
// the declarations a module is given: what its seeds' types and its type imports reach. A clashing name is not
// given; a seed whose types reach one stays a cell in another language (an importer that declares its own type of
// that name, as it must today, keeps today's boundary), and a type import of one is an error.
export const tiTypeUses = (tiTyNames, tiClosure, tiClashNames, tiTypeImportErr) => (vis: Map<string, Map<string, TiTypeDecl>>, P: Map<string, TiModResult>, seeds: TiSeed[], tis: TiTypeImport[], ownTypes: Set<string>): { uses: TiTypeDecl[]; seeds: TiSeed[]; errs: MdErr[] } => {
  const reach = seeds.map((s) => {
    const n: Mut<Set<string>> = mut(new Set());
    if (s.t !== null) tiTyNames(s.t, n, 0);
    return tiClosure(vis, [...n].map((name) => ({ home: s.home, name })));
  });
  const tiErrs = tis.map((ti) => ({ ti, e: tiTypeImportErr(vis, P, ti) }));
  const typed = tiClosure(vis, tiErrs.filter((x) => x.e === null && P.get(x.ti.from)?.ss === true).map((x) => ({ home: x.ti.from, name: x.ti.imported })));
  const pairs = seeds.map((s, i) => ({ s, r: reach[i] ?? [] }));
  const clash = tiClashNames([...pairs.flatMap((x) => x.r), ...typed], ownTypes), typedClash = tiClashNames(typed, ownTypes);
  const kept = pairs.filter((x) => !x.r.some((d) => clash.has(d.name)));
  const errs = [...tiErrs.flatMap((x) => (x.e === null ? [] : [x.e])), ...[...typedClash.values()].map((msg) => ({ rule: "import-clash", line: 0, msg }))];
  const uses = [...new Map([...kept.flatMap((x) => x.r), ...typed].filter((d) => !typedClash.has(d.name)).map((d): [string, TiTypeDecl] => [`${d.origin} ${d.name}`, d])).values()];
  return { uses, seeds: kept.map((x) => x.s), errs };
};
// one module's check, given what is known of the modules before it; what is known after it
export const tiStep = (tiSeeds, tiTypeUses) => (G: TiGlue, K: TiKnown, m: TiModule, h: TiHead, cyclic: Set<string>, caps: Set<string>): TiKnown => {
  const mods = new Map([...K.mods, [m.name, m]]);
  const s = tiSeeds(K.P, mods, m, cyclic, caps);
  const u = tiTypeUses(K.vis, K.P, s.seeds, h.typeImports.filter((t) => !cyclic.has(`${m.name} -> ${t.from}`)), h.ownTypes);
  const seeded = new Set(u.seeds.map((x) => x.local));
  const outside = [...m.outside, ...m.imports.filter((i) => !seeded.has(i.local)).map((i) => ({ name: i.local, view: i.view }))];
  const r0 = G.checkOne({ cells: m.cells, tsx: true, foreign: null, shell: null, name: m.name, outside, probe: null, seeds: u.seeds, types: u.uses, extra: [...s.errs, ...u.errs] });
  // a module with no SoundScript cell and no type is another language
  const r: TiModResult = r0.result.cells.length + r0.types.length === 0 ? { ...r0, ss: false, why: "the module has no SoundScript cell" } : r0;
  const vis = new Map([...u.uses, ...r.types].map((d): [string, TiTypeDecl] => [d.name, d]));
  return { P: new Map([...K.P, [m.name, r]]), vis: new Map([...K.vis, [m.name, vis]]), mods };
};
// what several checks know, together
export const tiMerge = () => (ks: TiKnown[]): TiKnown => ({
  P: new Map(ks.flatMap((k) => [...k.P])), vis: new Map(ks.flatMap((k) => [...k.vis])), mods: new Map(ks.flatMap((k) => [...k.mods])),
});
// the import graph of the program: each module's edges, and the edges inside a cycle
export const tiGraph = (tiModuleHead, tiEdges, tiModuleOrder) => (mods: TiModule[]): { heads: Map<string, TiHead>; order: string[]; cyclic: Set<string> } => {
  const heads = new Map(mods.map((m: TiModule): [string, TiHead] => [m.name, tiModuleHead(m)]));
  const names = new Set(mods.map((m) => m.name));
  const edges = new Map(mods.map((m: TiModule): [string, string[]] => [m.name, tiEdges(m, heads.get(m.name)?.typeImports ?? [], names)]));
  const { order, cyclic } = tiModuleOrder([...names], edges);
  return { heads, order, cyclic };
};
// the program: every module in import order, each given what the checks before it found
export const tiCheckProgram = (tiGraph, tiStep) => (G: TiGlue, mods: TiModule[], caps: Set<string>): TiProgram => {
  const g = tiGraph(mods);
  const byName = new Map(mods.map((m: TiModule): [string, TiModule] => [m.name, m]));
  let K: TiKnown = { P: new Map(), vis: new Map(), mods: new Map() };
  for (const n of g.order) {
    const m = byName.get(n), h = g.heads.get(n);
    if (m !== undefined && h !== undefined) K = tiStep(G, K, m, h, g.cyclic, caps);
  }
  return { order: g.order, modules: K.P, cyclic: [...g.cyclic] };
};

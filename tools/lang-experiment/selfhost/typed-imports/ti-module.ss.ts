// One module's check with its imports by reference (md-entry.ss.ts mdCheckSources, copied): each import of a
// checked export is seeded in the tables as a cell checked before the module's own, so the md rules (injection,
// taint, the fed rule) read it as they read a cell of the module. What the module exports comes back with it.

// the type names that a module must not let an importer read: a handle, an action, a listener, a Mut
export const TI_HANDLES = () => ["State", "StateCell", "Events", "Listener", "Action", "Mut", "Borrowed"];
// the module's context: mdContext's, with the imported names among the cells' names
export const tiContext = (mdContext) => (R: MdReg, src: string, count: number, line: (pos: number) => number, defs: MdDef[], shellNames: Set<string>, F: MdForeign | null, outside: MdOutside[], probe: IxProbeAsk | null, seeds: TiSeed[]): MdCtx => {
  const X = mdContext(R, src, count, line, defs, shellNames, F, outside, probe);
  return { ...X, cellNames: new Set([...X.cellNames, ...seeds.map((s) => s.local)]) };
};
// the tables, each import already in them: its type, why it depends on state, how it is fed a function
export const tiTables = () => (fresh: [string, MdCellRec][], seeds: TiSeed[]): MdTables => {
  const via = (s: TiSeed, why: string): string => `is imported from ${s.from}, where ${s.imported} ${why}`;
  const stateful = seeds.flatMap((s): [string, string][] => (s.stateful === null ? [] : [[s.local, via(s, s.stateful)]]));
  const fnFed = seeds.flatMap((s): [string, string][] => (s.fnFed === null ? [] : [[s.local, via(s, s.fnFed)]]));
  return {
    value: new Map(seeds.map((s): [string, Ty | null] => [s.local, s.t])), refInner: new Map(), eventsInner: new Map(), listeners: new Set(),
    stateful: new Map(stateful), fnFed: new Map(fnFed), boundaries: new Map(), viewTypes: new Map(), out: new Map(fresh), probe: null,
  };
};
// an import named like a cell of the module: the cell keeps the name, and the import is an error of the module
export const tiOwnClash = () => (defs: MdDef[], seeds: TiSeed[], lines: Map<string, number>): { seeds: TiSeed[]; errs: MdErr[] } => {
  const own = new Set(defs.map((d) => d.name));
  const errs = seeds.filter((s) => own.has(s.local)).map((s) => ({ rule: "import-clash", line: lines.get(s.local) ?? 0, msg: `${s.local} is imported from ${s.from} and is also a cell of this module` }));
  return { seeds: seeds.filter((s) => !own.has(s.local)), errs };
};
// the cells that can run (ss-toolchain.ts cellStates "ok"): accepted, and every cell of the module they take too
export const tiAccepted = () => (order: MdDef[], out: Map<string, MdCellRec>): Set<string> => {
  const ok: Mut<Set<string>> = mut(new Set());
  for (const d of order) {
    const r = out.get(d.name);
    let all = r !== undefined && r.status === "ok" && r.errors.length === 0;
    for (const p of d.fn.params) if (p.type === "Identifier" && out.has(p.name) && !ok.has(p.name)) all = false;
    if (all) ok.add(d.name);
  }
  return freeze(ok);
};
// what a cell exports: its value type when it can run, and how an importer may take it
export const tiExportOf = (holdsWith, TI_HANDLES) => (R: MdReg, M: MdMod, d: MdDef, rec: MdCellRec | undefined, runs: boolean): TiExport => {
  const ok = rec !== undefined && runs;
  const v = M.value.get(d.name);
  const t = ok && v !== undefined ? v : null;
  const state = M.refInner.has(d.name) ? "StateCell" : M.eventsInner.has(d.name) ? "Events" : null;
  const held = state ?? (t === null ? null : holdsWith(R.ops)(t, TI_HANDLES));
  const kind: TiExportKind = M.listeners.has(d.name) ? "listener" : held !== null ? "handle" : "value";
  const why = kind === "listener" ? "is a listener" : held !== null ? `is or holds ${held}` : ok ? "" : `is ${rec?.status ?? "missing"} in its module`;
  return { name: d.name, t, kind, why, stateful: M.stateful.get(d.name) ?? null, fnFed: M.fnFed.get(d.name) ?? null };
};
// the type names a type declaration mentions (over-approximate: a type parameter's name counts too)
export const tiTypeRefs = (childrenOf) => (d: AstNode): string[] => {
  const out: Mut<Set<string>> = mut(new Set());
  const todo: Mut<AstNode[]> = mut([d]);
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (n.type === "TSTypeReference" && n.typeName.type === "Identifier") out.add(n.typeName.name);
    if (n.type === "TSExpressionWithTypeArguments" && n.expression.type === "Identifier") out.add(n.expression.name);
    for (const k of childrenOf(n)) todo.push(k.node);
  }
  return [...out];
};
// the module's own type declarations
export const tiTypeDecls = (declOf, tiTypeRefs) => (ast: Ast, origin: string, builtin: Set<string>): TiTypeDecl[] => {
  const prog = ast.program;
  if (prog.type !== "Program") return [];
  return prog.body.flatMap((st) => {
    const d = declOf(st);
    if ((d.type !== "TSTypeAliasDeclaration" && d.type !== "TSInterfaceDeclaration") || d.id.type !== "Identifier" || builtin.has(d.id.name)) return [];
    return [{ name: d.id.name, origin, refs: tiTypeRefs(d) }];
  });
};
// checkSources with the seeds: the module level, the order, every cell, the renaming, the facts and the exports
export const tiCheckSources = (mdDistinct, mdShellNames, lineAt, mdModuleLevel, tiContext, mdFreshRec, mdOrder, mdCell, mdRenamed, mdFactsOf, tiTables, tiOwnClash, tiAccepted, tiExportOf, tiTypeDecls) => (R: MdReg, S: TiSources): { result: MdResult; exports: TiExport[]; types: TiTypeDecl[] } => {
  const dist = mdDistinct(S.cells, S.tsx);
  const p = dist.parse;
  if (!p.ok) throw new Error(p.message);
  const F = S.foreign !== null && S.foreign !== "" ? R.loadForeign(S.foreign) : null, line = lineAt(dist.text);
  const shellNames = S.shell !== null && S.shell !== "" ? mdShellNames(S.shell) : new Set<string>();
  const ml = mdModuleLevel(R, p.ast, dist.text, S.tsx, F, shellNames, line);
  const lines = new Map(ml.defs.map((d): [string, number] => [d.name, line(d.stmt.start)]));
  const own = tiOwnClash(ml.defs, S.seeds, lines);
  const X = tiContext(R, dist.text, p.ast.count, line, ml.defs, shellNames, F, S.outside, S.probe, own.seeds);
  const { order, cycles } = mdOrder(ml.defs, X.byName, X.cellNames, lines);
  const fresh = ml.defs.map((d): [string, MdCellRec] => [d.name, mdFreshRec(d, lines.get(d.name) ?? 0, [...(ml.ignores.get(d.name) ?? []), ...(cycles.get(d.name) ?? [])])]);
  const M: MdMod = mut({ ...tiTables(fresh, own.seeds) });
  let gap: string | null = null;
  for (const d of order) { const g = mdCell(X, M, d); if (gap === null) gap = g; }
  const rn = mdRenamed(X, dist.dups, M.out);
  const cells = ml.defs.flatMap((d) => { const c = rn.out.get(d.name); return c === undefined ? [] : [c]; });
  const module = [...S.extra, ...own.errs, ...ml.module, ...rn.module];
  const bounds = M.boundaries;
  const facts = ml.defs.map((d) => mdFactsOf(rn.shown.get(d.name) ?? d.name, d, bounds.get(d.name) ?? null));
  const result = { port: S.name ?? "cells", file: S.tsx ? "cells.tsx" : "cells.ts", ok: module.length === 0 && cells.every((c) => c.status === "ok"), module, cells, facts, gap, probe: M.probe };
  const exports: Mut<TiExport[]> = mut([]), runs = tiAccepted(order, M.out);
  for (const d of ml.defs) if (!rn.shown.has(d.name)) exports.push(tiExportOf(R, M, d, rn.out.get(d.name), runs.has(d.name)));
  return { result, exports: freeze(exports), types: tiTypeDecls(p.ast, S.name ?? "", R.builtin) };
};

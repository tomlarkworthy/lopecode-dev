// The entry: core.ts checkSources over a module's sources, with the registry handed in (lines 61-398), and the names
// declared again given back as "<name> (2)", ... (lines 368-387).

// each stand-in a cell holds: the name it shows, "<name> (k)" with the first k no cell and no earlier stand-in has
export const mdShownNames = () => (dups: MdDup[], out: Map<string, MdCellRec>, cellNames: Set<string>): Map<string, string> => {
  const shown: Mut<Map<string, string>> = new Map();
  for (const d of dups) {
    if (!out.has(d.ph)) continue;
    let k = 2;
    while (cellNames.has(`${d.name} (${k})`) || [...shown.values()].includes(`${d.name} (${k})`)) k++;
    shown.set(d.ph, `${d.name} (${k})`);
  }
  return shown;
};
// the text with each stand-in replaced: by the name its cell shows, then by the name it stands for
export const mdUnPh = () => (shown: Map<string, string>, dups: MdDup[], x0: string): string => {
  let x = x0;
  for (const [ph, n] of shown) x = x.split(ph).join(n);
  for (const d of dups) x = x.split(d.ph).join(d.name);
  return x;
};
// duplicate-cell for every name declared again: first in that cell's errors, or of the module when it is no cell
export const mdDupErrs = () => (dups: MdDup[], defs: MdDef[], out: Map<string, MdCellRec>, line: (pos: number) => number): { module: MdErr[]; cell: Map<string, MdErr> } => {
  const module: Mut<MdErr[]> = [];
  const cell: Mut<Map<string, MdErr>> = new Map();
  for (const d of dups) {
    const first = defs.find((c) => c.name === d.name);
    const at = first === undefined ? null : out.get(first.name)?.line ?? null;
    const msg = `${d.name} is already defined${at ? ` at line ${at}` : ""}`;
    const mine = out.get(d.ph);
    if (mine === undefined) module.push({ rule: "duplicate-cell", line: line(d.pos), msg });
    else cell.set(d.ph, { rule: "duplicate-cell", line: mine.line, msg });
  }
  return { module: module, cell: cell };
};
// the records with the names declared again given back
export const mdRenamed = (mdShownNames, mdUnPh, mdDupErrs) => (X: MdCtx, dups: MdDup[], out: Map<string, MdCellRec>): { module: MdErr[]; out: Map<string, MdCellRec>; shown: Map<string, string> } => {
  const errs = mdDupErrs(dups, X.defs, out, X.line);
  const shown = mdShownNames(dups, out, X.cellNames);
  const un = (x: string): string => mdUnPh(shown, dups, x);
  const fix = (e: MdErr): MdErr => (dups.length ? { ...e, msg: un(e.msg) } : e);
  const renamed = new Map([...out].map(([k, c]): [string, MdCellRec] => {
    const dup = errs.cell.get(k);
    const errors = dup === undefined ? c.errors : [dup, ...c.errors];
    return [k, {
      ...c, name: shown.get(c.name) ?? c.name, status: dup === undefined ? c.status : "rejected", errors: errors.map(fix), unsupported: c.unsupported.map(fix),
      blockedBy: dups.length ? c.blockedBy.map(un) : c.blockedBy, value: dups.length && c.value ? un(c.value) : c.value,
    }];
  }));
  return { module: errs.module, out: renamed, shown };
};
// the module's context for its cells' checks
export const mdContext = (mdAnn, mdRefName) => (R: MdReg, src: string, count: number, line: (pos: number) => number, defs: MdDef[], shellNames: Set<string>, F: MdForeign | null, outside: MdOutside[], probe: IxProbeAsk | null, bound: string[]): MdCtx => ({
  R, src, count, line, defs, shellNames, probe, bound,
  byName: new Map(defs.map((d): [string, MdDef] => [d.name, d])), cellNames: new Set(defs.map((d) => d.name)),
  foreign: new Map((F?.values ?? []).map((v): [string, MdForeignValue] => [v.name, v])),
  outside: new Map(outside.map((o): [string, MdOutside] => [o.name, o])),
  takenAsEvents: new Set(defs.flatMap((d) => d.fn.params.flatMap((p) => (p.type === "Identifier" && mdRefName(mdAnn(p)) === "Events" ? [p.name] : [])))),
});
// checkSources: the module level, the order, every cell in it, the renaming and the facts
export const mdCheckSources = (mdDistinct, mdShellNames, lineAt, mdModuleLevel, mdContext, mdFreshRec, mdOrder, mdCell, mdRenamed, mdFactsOf) => (R: MdReg, S: MdSources): MdResult => {
  const dist = mdDistinct(S.cells, S.tsx);
  const p = dist.parse;
  if (!p.ok) throw new Error(p.message);
  const F = S.foreign !== null && S.foreign !== "" ? R.loadForeign(S.foreign) : null;
  const shellNames = S.shell !== null && S.shell !== "" ? mdShellNames(S.shell) : new Set<string>();
  const line = lineAt(dist.text);
  const ml = mdModuleLevel(R, p.ast, dist.text, S.tsx, F, shellNames, line);
  const X = mdContext(R, dist.text, p.ast.count, line, ml.defs, shellNames, F, S.outside, S.probe, S.bound);
  const lines = new Map(ml.defs.map((d): [string, number] => [d.name, line(d.stmt.start)]));
  const { order, cycles } = mdOrder(ml.defs, X.byName, X.cellNames, lines);
  const fresh = ml.defs.map((d): [string, MdCellRec] => [d.name, mdFreshRec(d, lines.get(d.name) ?? 0, [...(ml.ignores.get(d.name) ?? []), ...(cycles.get(d.name) ?? [])])]);
  const M: MdMod = { value: new Map(), refInner: new Map(), eventsInner: new Map(), listeners: new Set(), stateful: new Map(), fnFed: new Map(), boundaries: new Map(), viewTypes: new Map(), out: new Map(fresh), probe: null };
  let gap: string | null = null;
  for (const d of order) {
    const g = mdCell(X, M, d);
    if (gap === null) gap = g;
  }
  const rn = mdRenamed(X, dist.dups, M.out);
  const cells = ml.defs.flatMap((d) => { const c = rn.out.get(d.name); return c === undefined ? [] : [c]; });
  const module = [...ml.module, ...rn.module];
  const bounds = M.boundaries;
  const facts = ml.defs.map((d) => mdFactsOf(rn.shown.get(d.name) ?? d.name, d, bounds.get(d.name) ?? null, M.out.get(d.name)?.casts ?? [], M.out.get(d.name)?.holes ?? [], M.out.get(d.name)?.promises ?? null));
  return { port: S.name ?? "cells", file: S.tsx ? "cells.tsx" : "cells.ts", ok: module.length === 0 && cells.every((c) => c.status === "ok"), module, cells, facts, gap, probe: M.probe };
};

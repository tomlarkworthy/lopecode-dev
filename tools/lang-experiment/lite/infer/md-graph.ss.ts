// The cell graph of core.ts checkSources (lines 154-176, island.ts specOf and compileCalls): what each cell takes,
// the compile(...) calls that name cells, and the order of checking with its cycles.

export type MdSpec = { readonly inputs: string[]; readonly refs: string[]; readonly outputs: string[]; readonly options: AstNode | null };
// a literal array of strings, or null
export const mdNames = () => (v: AstNode): string[] | null => {
  if (v.type !== "ArrayExpression") return null;
  const out: Mut<string[]> = mut([]);
  for (const el of v.elements) {
    if (el === null || el.type !== "Literal" || typeof el.value !== "string") return null;
    out.push(el.value);
  }
  return freeze(out);
};
// island.ts specOf: compile({ inputs, refs, outputs, options }) with literal arrays of cell names, or null
export const mdSpecOf = (mdNames) => (call: AstNode): MdSpec | null => {
  if (call.type !== "CallExpression" || call.arguments.length !== 1) return null;
  const arg = call.arguments[0];
  if (arg === undefined || arg.type !== "ObjectExpression") return null;
  let inputs: string[] = [], refs: string[] = [], outputs: string[] = [];
  let options: AstNode | null = null;
  for (const p of arg.properties) {
    if (p.type !== "Property" || p.computed || p.key.type !== "Identifier") return null;
    const k = p.key.name;
    if (k === "options") { options = p.value; continue; }
    const xs = k === "inputs" || k === "refs" || k === "outputs" ? mdNames(p.value) : null;
    if (xs === null) return null;
    if (k === "inputs") inputs = [...inputs, ...xs];
    else if (k === "refs") refs = [...refs, ...xs];
    else outputs = [...outputs, ...xs];
  }
  return outputs.length ? { inputs, refs, outputs, options } : null;
};
// island.ts compileCalls: the compile(...) calls in the body of a cell whose parameters include compile
export const mdCompileCalls = (kidsOf) => (fn: FnNode): AstNode[] => {
  if (!fn.params.some((p) => p.type === "Identifier" && p.name === "compile")) return [];
  const out: Mut<AstNode[]> = mut([]);
  const todo: Mut<AstNode[]> = mut([fn.body]);
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === "compile") out.push(n);
    for (const k of kidsOf(n).toReversed()) todo.push(k);
  }
  return freeze(out);
};
// the cells a cell is checked after: its parameters that name cells, then the cells its compile(...) calls name
export const mdDeps = (mdCompileCalls, mdSpecOf) => (d: MdDef, cellNames: Set<string>): string[] => {
  const ps = d.fn.params.flatMap((p) => (p.type === "Identifier" && cellNames.has(p.name) ? [p.name] : []));
  const named = mdCompileCalls(d.fn).flatMap((call) => {
    const sp = mdSpecOf(call);
    return sp === null ? [] : [...sp.inputs, ...sp.refs, ...sp.outputs].filter((n) => cellNames.has(n));
  });
  return [...ps, ...named];
};
export type MdVisit = { state: Map<string, number>; order: MdDef[]; cycles: Map<string, MdErr[]> };
// one step of core.ts visit: a cell on the stack again closes a cycle, which every cell on it reports
export const mdVisit = () => {
  function visit(S: Mut<MdVisit>, deps: Map<string, string[]>, byName: Map<string, MdDef>, lines: Map<string, number>, n: string, stack: string[]): void {
    const st = S.state.get(n);
    if (st === 2) return;
    if (st === 1) {
      const cyc = stack.slice(stack.indexOf(n));
      const msg = `dependency cycle ${[...cyc, n].join(" -> ")}`;
      for (const x of cyc) S.cycles = new Map([...S.cycles, [x, [...(S.cycles.get(x) ?? []), { rule: "cycle", line: lines.get(x) ?? 0, msg }]]]);
      return;
    }
    S.state = new Map([...S.state, [n, 1]]);
    for (const d of deps.get(n) ?? []) visit(S, deps, byName, lines, d, [...stack, n]);
    S.state = new Map([...S.state, [n, 2]]);
    const def = byName.get(n);
    if (def !== undefined) S.order = [...S.order, def];
  }
  return visit;
};
// the order the cells are checked in, and each cell's cycle errors
export const mdOrder = (mdDeps, mdVisit) => (defs: MdDef[], byName: Map<string, MdDef>, cellNames: Set<string>, lines: Map<string, number>): { order: MdDef[]; cycles: Map<string, MdErr[]> } => {
  const deps = new Map(defs.map((d): [string, string[]] => [d.name, mdDeps(d, cellNames)]));
  const S: Mut<MdVisit> = mut({ state: new Map(), order: [], cycles: new Map() });
  for (const d of defs) mdVisit(S, deps, byName, lines, d.name, []);
  return { order: S.order, cycles: S.cycles };
};

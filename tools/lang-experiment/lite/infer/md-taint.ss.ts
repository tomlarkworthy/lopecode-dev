// The state-dependence of a cell's inputs (core.ts checkSources lines 302-327): which parameters an action may not
// capture and why, what feeds the cell a function from another language, and the cell's own state-dependence.

// why a parameter's value depends on state, or null
export const mdTaintOf = (mdAnn, mdRefName, isNamed) => (X: MdCtx, M: MdMod, p: AstNode): string | null => {
  if (p.type !== "Identifier") return null;
  const wrapper = mdRefName(mdAnn(p));
  if (wrapper === "State" || wrapper === "Events") return null;
  const name = p.name, caps = X.R.capabilities.has(name);
  if (X.cellNames.has(name)) {
    const t = M.value.get(name);
    if (t !== null && t !== undefined && t.k === "named" && isNamed(t, "Action")) return null;
    if (M.refInner.has(name)) return `the value of the state cell ${name}`;
    if (X.byName.get(name)?.fn.generator === true) return `the latest value of the events cell ${name}`;
    const why = M.stateful.get(name);
    return why === undefined ? null : `${name} ${why}`;
  }
  if (X.shellNames.has(name)) return `a shell cell's value`;
  if (X.outside.has(name) && !caps) return `the value of ${name}, a cell in another language`;
  // log writes nothing the program reads back; invalidation is the cell's own lifetime
  return caps && name !== "invalidation" && name !== "log" ? `capability ${name}` : null;
};
export const mdTainted = (mdTaintOf) => (X: MdCtx, M: MdMod, d: MdDef): Map<string, string> => {
  const out: Mut<Map<string, string>> = mut(new Map());
  for (const p of d.fn.params) {
    const why = mdTaintOf(X, M, p);
    if (why !== null && p.type === "Identifier") out.set(p.name, why);
  }
  return freeze(out);
};
// the first parameter that feeds the cell a function from another language, and how
export const mdFedBy = () => (M: MdMod, d: MdDef): string | null => {
  for (const p of d.fn.params) {
    if (p.type !== "Identifier") continue;
    if (M.boundaries.get(d.name)?.get(p.name)?.shape.k === "fn") return `takes ${p.name}, a function from another language`;
    const via = M.fnFed.get(p.name);
    if (via !== undefined) return `takes ${p.name}, which ${via}`;
  }
  return null;
};
// what the cell records of its own state-dependence and feeding, for the cells after it
export const mdMarkStateful = () => (M: MdMod, d: MdDef, tainted: Map<string, string>, fedBy: string | null): void => {
  if (fedBy !== null) M.fnFed = new Map([...M.fnFed, [d.name, fedBy]]);
  const first = [...tainted.entries()][0];
  if (first !== undefined) M.stateful = new Map([...M.stateful, [d.name, first[1].startsWith("capability ") ? `takes the ${first[1]}` : `reads ${first[0]}`]]);
  if (d.fn.generator) M.stateful = new Map([...M.stateful, [d.name, "is a generator"]]);
};

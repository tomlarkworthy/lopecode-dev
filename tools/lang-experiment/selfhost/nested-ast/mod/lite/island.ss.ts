// The cells a compile({inputs, refs, outputs}) call runs, in order, as SoundScript cells: every cell upstream of an
// output, stopping at inputs (the call's arguments) and refs (values read from the graph when the calling cell
// runs). Under bun, types.ts links them; in the notebook they are compiled cells of @tomlarkworthy/soundscript-checker.
// island.ts reads the call's text and passes the capability names.

export type IslandCell = { name: string; params: string[]; refCell?: boolean };
export type IslandSpec = { inputs: string[]; refs: string[]; outputs: string[] };
export type IslandProblem = { name: string; msg: string };
export type Island = { order: string[]; problems: IslandProblem[] };

// names the call lists that are not cells, and outputs it also lists as inputs or refs
export const specProblems = () => (names: Set<string>, spec: IslandSpec): IslandProblem[] => {
  const cut = new Set([...spec.inputs, ...spec.refs]);
  return [
    ...[...spec.inputs, ...spec.refs, ...spec.outputs].filter((n) => !names.has(n)).map((n) => ({ name: n, msg: `no cell ${n}` })),
    ...spec.outputs.filter((n) => cut.has(n)).map((n) => ({ name: n, msg: `${n} is both an output and an input or ref` })),
  ];
};
// capabilities: the names of the capabilities, which an island cell may not take
export const islandWith = (specProblems) => (capabilities: Set<string>) => (cells: IslandCell[], spec: IslandSpec): Island => {
  const by = new Map(cells.map((c): [string, IslandCell] => [c.name, c]));
  const cut = new Set([...spec.inputs, ...spec.refs]);
  const problems: Mut<IslandProblem[]> = mut([...specProblems(new Set(by.keys()), spec)]);
  const order: Mut<string[]> = mut([]);
  const seen = mut(new Set<string>());
  function visit(n: string, from: string): void {
    if (cut.has(n) || seen.has(n)) return;
    seen.add(n);
    const c = by.get(n);
    if (!c) {
      problems.push({ name: from, msg: capabilities.has(n) ? `island cell ${from} takes the capability ${n}` : `island cell ${from} takes ${n}, which is not a cell` });
      return;
    }
    if (c.refCell) problems.push({ name: n, msg: `${n} is a state cell; list it in refs` });
    for (const p of c.params) visit(p, n);
    order.push(n);
  }
  for (const o of spec.outputs) if (by.has(o) && !cut.has(o)) visit(o, o);
  return { order: freeze(order), problems: freeze(problems) };
};

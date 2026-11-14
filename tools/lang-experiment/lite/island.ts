// The slice of the cell graph that compile({inputs, refs, outputs}) runs: every cell upstream of an
// output, stopping at inputs (the call's arguments) and refs (values read from the graph when the
// calling cell runs). Shared by the checker (core.ts) and the runner (browser/run.ts).
import { kids } from "./parse.ts";

export type IslandCell = { name: string; params: string[]; refCell?: boolean };
export type IslandSpec = { inputs: string[]; refs: string[]; outputs: string[] };
export type Island = { order: string[]; problems: { name: string; msg: string }[] };

export const ISLAND_CAPABILITIES = new Set(["now", "random", "fetch", "log", "invalidation", "compile", "pool"]);

export function island(cells: IslandCell[], spec: IslandSpec): Island {
  const by = new Map(cells.map((c) => [c.name, c]));
  const problems: Island["problems"] = [];
  const cut = new Set([...spec.inputs, ...spec.refs]);
  for (const n of [...spec.inputs, ...spec.refs, ...spec.outputs]) if (!by.has(n)) problems.push({ name: n, msg: `no cell ${n}` });
  for (const n of spec.outputs) if (cut.has(n)) problems.push({ name: n, msg: `${n} is both an output and an input or ref` });
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (n: string, from: string) => {
    if (cut.has(n) || seen.has(n)) return;
    seen.add(n);
    const c = by.get(n);
    if (!c) {
      problems.push({ name: from, msg: ISLAND_CAPABILITIES.has(n) ? `island cell ${from} takes the capability ${n}` : `island cell ${from} takes ${n}, which is not a cell` });
      return;
    }
    if (c.refCell) problems.push({ name: n, msg: `${n} is a ref cell; list it in refs` });
    for (const p of c.params) visit(p, n);
    order.push(n);
  };
  for (const o of spec.outputs) if (by.has(o) && !cut.has(o)) visit(o, o);
  return { order, problems };
}

// compile({...}) arguments as written: literal arrays of cell names, or null when they are not literal.
export function specOf(call: any): (IslandSpec & { options: any | null }) | null {
  const arg = call.arguments?.[0];
  if (call.arguments?.length !== 1 || arg?.type !== "ObjectExpression") return null;
  const spec: IslandSpec & { options: any | null } = { inputs: [], refs: [], outputs: [], options: null };
  for (const p of arg.properties) {
    if (p.type !== "Property" || p.computed || p.key.type !== "Identifier") return null;
    const k = p.key.name;
    if (k === "options") { spec.options = p.value; continue; }
    if (k !== "inputs" && k !== "refs" && k !== "outputs") return null;
    if (p.value.type !== "ArrayExpression") return null;
    for (const el of p.value.elements) {
      if (el?.type !== "Literal" || typeof el.value !== "string") return null;
      spec[k as "inputs" | "refs" | "outputs"].push(el.value);
    }
  }
  return spec.outputs.length ? spec : null;
}

// Every compile(...) call in a cell whose parameter list includes compile.
export function compileCalls(fn: any): any[] {
  if (!fn.params?.some((p: any) => p.type === "Identifier" && p.name === "compile")) return [];
  const out: any[] = [];
  const walk = (n: any) => {
    if (n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === "compile") out.push(n);
    kids(n).forEach(walk);
  };
  walk(fn.body);
  return out;
}

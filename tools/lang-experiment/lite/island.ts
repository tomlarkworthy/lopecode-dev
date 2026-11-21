// The slice of the cell graph that compile({inputs, refs, outputs}) runs: every cell upstream of an
// output, stopping at inputs (the call's arguments) and refs (values read from the graph when the
// calling cell runs). Shared by the checker (core.ts) and the runner (browser/run.ts). The order is
// island.ss.ts; this file reads the call's arguments.
import { kids } from "./parse.ts";
import { CAPABILITIES } from "./intrinsics.ts";
import { islandWith, type IslandSpec } from "./types.ts";

export type { IslandCell, IslandSpec, Island } from "./island.ss.ts";

export const ISLAND_CAPABILITIES = new Set(Object.keys(CAPABILITIES));
// the order and problems of an island (island.ss.ts)
export const island = islandWith(ISLAND_CAPABILITIES);

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

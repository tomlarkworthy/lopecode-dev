// What the compiler and the in-page compile need to know about a cell, read from its function node:
// parameter names and whether each is typed State<T> or Events<T>, whether it returns state(...), whether it
// is a generator, and its compile(...) calls. The checker computes these from its own parse (LiteCell
// .facts), so a caller holding a check result does not parse the cells again; cellsOf parses source. The facts are
// the cells mdFactsOf (lite/infer/md-facts.ss.ts) and cpCellsOf (lite/infer/cp-facts.ss.ts) over the typed tree; this
// file turns them into CellInfo and a parse error into a throw.
import { cpCellsOf, cpGlobalRefs, mdFactsOf, mdPreludeCalls } from "./infer-ss.ts";
import type { IslandSpec } from "./island.ts";
import type { MdInfo } from "./infer-ss.ts";
import type { AstNode } from "./acorn/acorn-types.ss.ts";
import type { FnNode } from "./acorn/acorn.ss.ts";

// span: the cell's statement in the source that was parsed, [start, end)
export type CellInfo = { name: string; span?: [number, number]; params: { name: string; refTyped: boolean; eventsTyped: boolean; boundary?: { shape: unknown; ref: boolean } }[]; returnsRef: boolean; generator: boolean; compiles: IslandSpec[]; casts?: unknown[] };
// the cells this file calls, as one record (lite/infer/cp-diff.ts hands a copy with one cell replaced)
export const FACTS = { cpCellsOf, cpGlobalRefs, mdFactsOf, mdPreludeCalls };
export type FactCalls = typeof FACTS;

// the facts as CellInfo, keys in the order callers have always read them
export const infoOf = (f: MdInfo, span = true): CellInfo => ({
  name: f.name, ...(span ? { span: [f.span[0] ?? 0, f.span[1] ?? 0] as [number, number] } : {}), returnsRef: f.returnsRef, generator: f.generator,
  compiles: f.compiles.map(({ inputs, refs, outputs }) => ({ inputs, refs, outputs })),
  params: f.params.map((p) => ({ name: p.name, refTyped: p.refTyped, eventsTyped: p.eventsTyped })),
});
export function cellsOf(src: string, C: FactCalls = FACTS): CellInfo[] {
  const r = C.cpCellsOf(src);
  if (!r.ok) throw new Error(r.message);
  return r.cells.map((f) => infoOf(f));
}
export const factsOf = (name: string, fn: FnNode, stmt?: AstNode, C: FactCalls = FACTS): CellInfo => infoOf(C.mdFactsOf(name, { name, fn, stmt: stmt ?? fn }, null, []), !!stmt);
// The calls in fn of the prelude function `name` (the callee is that bare name and no parameter or declaration between
// the call and the cell binds it), and the references in fn to the global `name` that nothing binds: typed-tree nids
export const preludeCalls = (fn: AstNode, name: string, C: FactCalls = FACTS): Set<number> => C.mdPreludeCalls(fn, name);
export const globalRefs = (fn: AstNode, name: string, C: FactCalls = FACTS): Set<number> => C.cpGlobalRefs(fn, name);

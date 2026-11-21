// Test tooling for the cells of lite/infer: the one-cell check (ixCheckFn) run on its own with an optional compile
// hook, and checkSources run on a copy of the cells (diff.ts's controls, module-time.ts). The shipped checker is
// lite/core.ts over lite/infer-ss.ts.
import { makeReg as regView, regCore, globalsOf, runCheck, mdRegistry, type Sources, type CheckOpts, type CheckRun } from "../core.ts";
import type { Node, Parsed } from "../parse.ts";
import type { Registry } from "../registry.ts";
import type { AstNode } from "../acorn/acorn-types.ss.ts";
import type { IxReg, IxDiag, IxInput, IxOutput } from "./ix-types.ss.ts";
import type { Ty } from "../types.ss.ts";
import { childrenOf } from "../acorn/index.ts";
import { linkIx, linkMd, IX_FILES, OW_FILES, MD_FILES, IX_CELLS, OW_CELLS, MD_CELLS, MD_GIVEN } from "../infer-ss.ts";
import { kids } from "../parse.ts";
export { linkIx, linkMd, IX_FILES, OW_FILES, MD_FILES, IX_CELLS, OW_CELLS, MD_CELLS, MD_GIVEN, globalsOf, mdRegistry, regCore, kids };

// core.ts's compile hook, called with the checker methods it uses (diff.ts lends it the real checker's)
export type CompileCh = { infer: (n: Node) => Ty; err: (n: Node, rule: string, msg: string) => void; unsupported: (n: Node, what: string) => void };
export type CompileHook = (e: Node, ch: CompileCh) => Ty;
const STOP = new Error("ix: the compile hook asked for a type");
const keyOf = (n: { start: number; end: number; type: string }) => `${n.start}:${n.end}:${n.type}`;
function findIn(n: AstNode, key: string): AstNode | null {
  if (keyOf(n) === key) return n;
  for (const k of childrenOf(n)) { const x = findIn(k.node, key); if (x) return x; }
  return null;
}
// core.ts's view of the registry for one cell, with hook as its compile; a hook that asks for a type reports nothing
export function makeReg(reg: Registry, P: Parsed, hook: CompileHook | null = null): IxReg & { restore: () => void; requeue: (ds: IxDiag[]) => void } {
  const R = regView(reg, P);
  const compile = hook && ((e: AstNode, options: Ty | null) => {
    const before = R.drain(), asked: { n: Node | null } = { n: null };
    const push = (n: Node, rule: string, msg: string) => R.requeue([{ start: n.start, end: n.end, rule, msg }]);
    const ch: CompileCh = { infer: (n) => { if (options === null) { asked.n = n; throw STOP; } return options; }, err: push, unsupported: (n, what) => push(n, "unsupported", what) };
    try { const t = hook(R.toP(e), ch); const got = R.drain(); R.requeue(before); R.requeue(got); return { k: "done" as const, t }; } catch (x) { if (x !== STOP) throw x; }
    R.drain();
    R.requeue(before);
    const at = asked.n && findIn(e, keyOf(asked.n));
    if (!at) throw new Error("ix: the compile hook asked for a node outside the call");
    return { k: "options" as const, at };
  });
  return { ...R, compile };
}
export type IxLinked = ReturnType<typeof linkIx>;
export function runIx(L: IxLinked, reg: Registry, P: Parsed, input: Omit<IxInput, "globals">, hook: CompileHook | null = null): IxOutput {
  const R = makeReg(reg, P, hook);
  try { return L.ixCheckFn(R, { ...input, globals: globalsOf(reg) }); } finally { R.restore(); }
}
export type MdLinked = ReturnType<typeof linkMd>;
export type MdRun = CheckRun;
// checkSources by a linked copy of the md cells
export const runMd = (L: MdLinked, src: Sources, opts: CheckOpts = {}): MdRun => runCheck(L.mdCheckSources, src, opts);

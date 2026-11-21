// Differential for the identity visitor: port opaqueCaptures (visit-own.ss.ts) against capture.ts opaqueCaptures
// (orig/), on every corpus cell whose checker saw an action body. The original runs on the checker object of its own
// checkSources run (taken through onCell) after that run; the port gets the same facts as data keyed by nid
// (acornOrder of the checker's own parse) and binding id, crossed with the facts' type OwnFacts, and the tree the
// adapter makes of the same text, crossed with NParse. Both get every identifier parameter of the cell as tainted, and
// skip = the identifiers capture.ts captures reports. Compared as ordered lists of "name Lline why opaque".
// Controls: mutated port cells must give differences.
// Run: bun diff-own.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "./orig/lite/core.ts";
import { captures as capturesOrig, opaqueCaptures as opaqueOrig } from "./orig/lite/capture.ts";
import * as rtCells from "./orig/lite/runtime.ss.ts";
import * as messageCells from "./orig/lite/messages.ss.ts";
import { link } from "./orig/lite/link.ts";
import * as kidsCells from "./kids-n.ss.ts";
import * as N from "./visit-n.ss.ts";
import * as O from "./visit-own.ss.ts";
import { nestParse, acornOrder } from "./adapter.ts";
import { corpus } from "./corpus.ts";
import { SYNTHETIC } from "./synthetic.ts";
import { SYNTHETIC_OWN } from "./synthetic-own.ts";
import { SHAPE, byNid } from "./diff.ts";

const HERE = import.meta.dir;
const { cross } = await import("./recdisp/lite/boundary.ts");
const { checkSources: checkRec } = await import("./recfix/lite/core.ts");
const FACTS = checkRec({ cells: readFileSync(join(HERE, "visit-own.ss.ts"), "utf8").split("\n").filter((l) => l.startsWith("export type Bind") || l.startsWith("export type OwnFacts")).join("\n") + `\nexport const f = (x: OwnFacts): number => 1;`, tsx: false, outside: [{ name: "x" }] }).facts!.get("f")!.params[0]!.boundary!.shape;
const prelude = { mut: rtCells.mut(), freeze: rtCells.freeze() };
const { parsed: _a, ...nCells } = N as any, { ownFactsIn: _b, ...oCells } = O as any;
const linkO = (over: Record<string, any> = {}) => link({ ...messageCells, ...kidsCells, ...nCells, ...oCells, ...over } as any, prelude) as any;

type Case = { id: string; src: string; tsx: boolean; outside?: any; shell?: string };
function run(L: any, label: string, inputs: Case[], quiet = false) {
  const t = { cells: 0, withBodies: 0, same: 0, differ: 0, nonEmpty: 0, caps: 0, fnOutside: 0, nodeOutside: 0 };
  const shown: string[] = [];
  let k = 0;
  for (const c of inputs) {
    const seen: { name: string; ch: any; fn: any }[] = [];
    try { checkSources({ cells: c.src, tsx: c.tsx, outside: c.outside ?? null, shell: c.shell ?? null }, { onCell: (name, ch, fn) => seen.push({ name, ch, fn }) }); } catch { continue; }
    for (const { name, ch, fn } of seen) {
      t.cells++;
      if (!ch.actionBodies.size) continue;
      t.withBodies++;
      const order = acornOrder(ch.parsed.program), nidOf = new Map<any, number>(order.map((n, i) => [n, i] as const));
      const P = ch.parsed;
      const tainted = new Map<string, string>(fn.params.filter((p: any) => p.type === "Identifier").map((p: any) => [p.name, `param ${p.name}`]));
      const viaName = capturesOrig(fn, tainted).map((x) => x.node);
      const want = opaqueOrig(fn, ch, tainted, new Set(viaName)).map((x) => `${x.name} L${P.line(x.node.start)} ${x.why}${x.opaque ? " (opaque)" : ""}`);
      // the facts as data
      const binds = [...new Set(ch.facts.bindingOf.values())] as any[];
      const inFn = (n: any) => !!n && n.start >= fn.start && n.end <= fn.end;
      for (const b of binds) { if (b.fnNode && !inFn(b.fnNode) && b.kind !== "prelude" && b.kind !== "global") t.fnOutside++; if (b.node && !nidOf.has(b.node)) t.nodeOutside++; }
      const facts = {
        bindingOf: [...ch.facts.bindingOf].flatMap(([n, b]: any) => (nidOf.has(n) ? [[nidOf.get(n), b.id]] : [])),
        bindings: binds.map((b) => ({ id: b.id, name: b.name, kind: b.kind, cellParam: !!b.cellParam, mutOwned: !!b.mutOwned, node: b.node && nidOf.has(b.node) ? nidOf.get(b.node) : -1, start: b.node?.start ?? -1, end: b.node?.end ?? -1, fnNode: b.fnNode && nidOf.has(b.fnNode) ? nidOf.get(b.fnNode) : -1 })),
        actionBodies: [...ch.actionBodies].flatMap((a: any) => (nidOf.has(a) ? [nidOf.get(a)] : [])),
      };
      const factsIn: any = cross(facts, FACTS, `own${k}.ownFacts`);
      const parse: any = nestParse(P.src, c.tsx);
      const tree: any = cross(parse, SHAPE, `own${k++}.nestedParse`);
      const cellFn = byNid(tree.ast.program)[nidOf.get(fn)!];
      const skip = new Set(viaName.map((n) => nidOf.get(n)!));
      const got = L.opaqueCaptures(cellFn, factsIn, tainted, skip).map((x: any) => `${x.name} L${x.node.line} ${x.why}${x.opaque ? " (opaque)" : ""}`);
      const same = want.length === got.length && want.every((x, i) => x === got[i]);
      if (same) t.same++; else { t.differ++; if (shown.length < 5) shown.push(`${c.id} ${name}: want ${JSON.stringify(want)} got ${JSON.stringify(got)}`); }
      if (want.length) { t.nonEmpty++; t.caps += want.length; }
    }
  }
  if (!quiet) {
    console.log(`${label}: ${t.cells} cells, ${t.withBodies} with an action body; same ${t.same}, differ ${t.differ}; cells with an opaque capture ${t.nonEmpty} (${t.caps} captures); bindings with a fnNode outside the cell ${t.fnOutside}, with a node outside the parse ${t.nodeOutside}`);
    for (const s of shown) console.log(`  ${s.slice(0, 500)}`);
  }
  return t;
}
run(linkO(), "corpus", corpus());
run(linkO(), "synthetic", SYNTHETIC);
run(linkO(), "synthetic-own", SYNTHETIC_OWN);
const all = [...corpus(), ...SYNTHETIC, ...SYNTHETIC_OWN];
const controls: [string, Record<string, any>][] = [
  ["treeOf takes every child of a JSX opening element as a component name (drops p.name.nid === n.nid)", { treeOf: (kids: any) => (root: any) => {
    const byNid = new Map(), parent = new Map(), ids: any[] = [], comps: any[] = [];
    const walk = (n: any, p: any) => { byNid.set(n.nid, n); if (p !== null) parent.set(n.nid, p.nid); if (n.type === "Identifier") ids.push(n); if (p !== null && p.type === "JSXOpeningElement" && (n.type !== "JSXIdentifier" || /^[A-Z]/.test(n.name))) comps.push(n); for (const c of kids(n)) walk(c, n); };
    walk(root, null); return { byNid, parent, ids, comps };
  } }],
  ["valueSpan ignores fnNode", { valueSpan: () => (t: any, b: any) => {
    const up = (n: any) => { const p = n === undefined ? undefined : t.parent.get(n.nid); return p === undefined ? undefined : t.byNid.get(p); };
    let d = up(t.byNid.get(b.node)); while (d !== undefined && d.type !== "VariableDeclarator") d = up(d);
    const decl = up(d), loop = up(decl);
    if (loop !== undefined && loop.type === "ForOfStatement" && decl !== undefined && loop.left.nid === decl.nid) return [decl, loop.right];
    return d !== undefined && d.init !== null ? [d] : null;
  } }],
  // expected to give 0: the declaring identifier is the binding's span, so within(r, x) && !within(b, x) already excludes it
  ["usesInActions ignores b.node === r (nid identity)", { usesInActions: (within: any, isLocal: any) => (t: any, facts: any, skip: Set<number>) => {
    const bindings = new Map(facts.bindings.map((b: any) => [b.id, b])), bindingOf = new Map(facts.bindingOf);
    const bodies = facts.actionBodies.flatMap((id: number) => { const a = t.byNid.get(id); return a === undefined ? [] : [a]; });
    return t.ids.flatMap((r: any) => { const id = bindingOf.get(r.nid), b: any = id === undefined ? undefined : bindings.get(id); if (skip.has(r.nid) || b === undefined || !isLocal(b)) return []; const a = bodies.find((x: any) => within(r, x) && !within(b, x)); return a === undefined ? [] : [{ r, b, a }]; });
  } }],
  ["valueSpan ignores the for...of left === decl test", { valueSpan: () => (t: any, b: any) => {
    const fn = t.byNid.get(b.fnNode); if (fn !== undefined) return [fn];
    const up = (n: any) => { const p = n === undefined ? undefined : t.parent.get(n.nid); return p === undefined ? undefined : t.byNid.get(p); };
    let d = up(t.byNid.get(b.node)); while (d !== undefined && d.type !== "VariableDeclarator") d = up(d);
    return d !== undefined && d.init !== null ? [d] : null;
  } }],
];
for (const [name, over] of controls) { const t = run(linkO(over), `control: ${name}`, all, true); console.log(`control (${name}): differ ${t.differ} of ${t.withBodies}`); }

// bun selfhost/typed-imports/demo.ts: run-time demonstrations. (1) a value crosses by reference: the importer's
// parameter is the exporter's value (===), boundary.ts counts no copy; today the same program copies. (2) an exporter
// redefined: the importer runs again with the new value, and the value it held before is unchanged. (3) the checks
// as cells of a Runtime: each module's check a variable over its source and the checks of the modules it imports;
// redefining @b's source re-runs @a's check, which rejects @a. No timers: every step awaits module.value.
import { Runtime } from "@observablehq/runtime";
import { build } from "./rt.ts";
import { crossings } from "../../lite/boundary.ts";
import { programGlue, tiStep, tiMerge, tiGraph, CAPS } from "./ti-link.ts";
import type { TiKnown, TiModule } from "./ti-types.ss.ts";

const B = "export const tree = () => ({ kind: \"root\", kids: [{ kind: \"leaf\", v: 1 }, { kind: \"leaf\", v: 2 }] });";
const A = "const held = (tree) => tree;\nconst sum = (tree) => tree.kids.reduce((a, k) => a + k.v, 0);";
// today the importer must declare the type again
const A_TODAY = "type Leaf = { readonly kind: string; readonly v: number };\ntype Tree = { readonly kind: string; readonly kids: readonly Leaf[] };\nconst held = (tree: Tree) => tree;\nconst sum = (tree: Tree) => tree.kids.reduce((a, k) => a + k.v, 0);";
const IMP = [{ local: "tree", imported: "tree", from: "@b" }];
for (const mode of ["typed", "today"] as const) {
  const c0 = crossings.copies;
  const b = build([{ name: "@b", cells: B }, { name: "@a", cells: mode === "typed" ? A : A_TODAY, imports: IMP as any }], mode);
  const exp = await b.value("@b", "tree"), held = await b.value("@a", "held"), sum = await b.value("@a", "sum");
  console.log(`(1) ${mode}: @a.held === @b.tree: ${held === exp}; kids === : ${held.kids === exp.kids}; sum ${sum}; boundary copies made: ${crossings.copies - c0}; errors ${b.errors.length}`);
}

{
  const b = build([{ name: "@b", cells: B }, { name: "@a", cells: A, imports: IMP as any }], "typed");
  const before = await b.value("@a", "held");
  const text = JSON.stringify(before);
  const B2 = "export const tree = () => ({ kind: \"root\", kids: [{ kind: \"leaf\", v: 10 }] });";
  const b2 = build([{ name: "@b", cells: B2 }], "typed");
  const d = b2.compiled.get("@b")!.find((x) => x.name === "tree")!;
  for (const v of b.runtime._variables) if (v._module === b.modules.get("@b") && v._name === "tree") v.define("tree", d.inputs, (0, eval)(`(${d.definition})`));
  const after = await b.value("@a", "held"), sum = await b.value("@a", "sum");
  console.log(`(2) @b.tree redefined: @a.held now ${JSON.stringify(after)} (sum ${sum}); the value @a held before: ${JSON.stringify(before) === text ? "unchanged" : "CHANGED"} ${text}; same object as now: ${before === after}`);
}

{
  // (3) the check of a program as dataflow
  const G = programGlue();
  const rt = new Runtime();
  const m = rt.module();
  const runs: Record<string, number> = {};
  const count = (n: string) => { runs[n] = (runs[n] ?? 0) + 1; };
  const mod = (name: string, cells: string, imports: { local: string; imported: string; from: string }[] = []): TiModule => ({ name, cells, outside: [], imports: imports.map((i) => ({ ...i, view: false })) });
  m.define("src_b", [], () => mod("@b", "export const n = (): number => 1;"));
  m.define("src_a", [], () => mod("@a", "const twice = (k) => k * 2;", [{ local: "k", imported: "n", from: "@b" }]));
  m.define("graph", ["src_a", "src_b"], (a: TiModule, b: TiModule) => (count("graph"), tiGraph([b, a])));
  const empty: TiKnown = { P: new Map(), vis: new Map(), mods: new Map() };
  m.define("check_b", ["graph", "src_b"], (g: any, b: TiModule) => (count("check_b"), tiStep(G, empty, b, g.heads.get("@b"), g.cyclic, CAPS)));
  m.define("check_a", ["graph", "src_a", "check_b"], (g: any, a: TiModule, kb: TiKnown) => (count("check_a"), tiStep(G, tiMerge([kb]), a, g.heads.get("@a"), g.cyclic, CAPS)));
  const show = (k: TiKnown, n: string) => k.P.get(n)!.result.cells.map((c) => `${c.name} ${c.status}${c.errors.map((e) => ` [${e.rule}] ${e.msg}`).join("")}`).join("; ");
  let ka: TiKnown = await m.value("check_a");
  console.log(`(3) first check: @a ${show(ka, "@a")}; runs ${JSON.stringify(runs)}`);
  m.redefine("src_b", [], () => mod("@b", "export const n = (): string => \"one\";"));
  ka = await m.value("check_a");
  console.log(`    @b redefined (n: string): @a ${show(ka, "@a")}; @a's exports: ${JSON.stringify(ka.P.get("@a")!.exports.map((e) => [e.name, e.t]))}; runs ${JSON.stringify(runs)}`);
  m.redefine("src_a", [], () => mod("@a", "const twice = (k) => k + k;", [{ local: "k", imported: "n", from: "@b" }]));
  ka = await m.value("check_a");
  console.log(`    @a redefined (k + k): @a ${show(ka, "@a")}; runs ${JSON.stringify(runs)}`);
}

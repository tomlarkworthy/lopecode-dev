// bun selfhost/typed-imports/measure.ts [--rounds R]: (1) check time of a three-module program, today (each module
// alone, its imports annotated and the types it needs declared again) and as one program (ti cells); (2) the same for
// an importer of the typed acorn trees (lite/acorn/acorn-types.ss.ts); (3) delivery of one acorn tree of about 1000
// nodes across a module edge: today ss_cross (copy and check against the Parse shape), by reference nothing, and a
// deep freeze of the tree, the remedy RESULTS.md weighs; (4) the same delivery end to end in a Runtime.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../../lite/core.ts";
import { cross } from "../../lite/boundary.ts";
import { acornParse } from "../../lite/acorn/acorn-shell.ts";
import { parse } from "../../lite/parse.ts";
import { checkProgram } from "./ti-link.ts";
import { build } from "./rt.ts";

const at = process.argv.indexOf("--rounds");
const ROUNDS = at < 0 ? 15 : Number(process.argv[at + 1]);
const LITE = join(import.meta.dir, "../../lite");
const stats = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return `min ${s[0]!.toFixed(3)} median ${s[Math.floor(s.length / 2)]!.toFixed(3)} max ${s[s.length - 1]!.toFixed(3)} (n=${s.length})`; };
const time = (f: () => unknown, n = ROUNDS) => { const out: number[] = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); f(); out.push(performance.now() - t0); } return out; };
const env = () => { const b = Bun.spawnSync(["pmset", "-g", "batt"]).stdout.toString().split("\n")[0]; const l = Bun.spawnSync(["uptime"]).stdout.toString().trim().replace(/.*load averages?: /, ""); return `[${b}; load ${l}]`; };

// (1) three modules
const TYPES_C = "export type Item = { readonly id: number; readonly tags: readonly string[] };\nexport type Bag = { readonly items: readonly Item[]; readonly name: string };";
const C = `${TYPES_C}\nexport const bag = (): Bag => ({ items: [{ id: 1, tags: ["a"] }, { id: 2, tags: [] }], name: "b" });\nexport const tagCount = () => (i: Item): number => i.tags.length;`;
const B_TI = `import type { Bag, Item } from "@c";\nexport const ids = (bag: Bag) => bag.items.map((i: Item) => i.id);\nexport const total = (bag, tagCount) => bag.items.map(tagCount).reduce((a, b) => a + b, 0);`;
const A_TI = `import type { Bag } from "@c";\nconst report = (ids, total, bag: Bag) => \`\${bag.name}: \${ids.length} items, \${total} tags\`;`;
const B_TODAY = `${TYPES_C}\nexport const ids = (bag: Bag) => bag.items.map((i: Item) => i.id);\nexport const total = (bag: Bag, tagCount: (i: Item) => number) => bag.items.map(tagCount).reduce((a, b) => a + b, 0);`;
const A_TODAY = `${TYPES_C}\nconst report = (ids: readonly number[], total: number, bag: Bag) => \`\${bag.name}: \${ids.length} items, \${total} tags\`;`;
const imp = (local: string, from: string) => ({ local, imported: local, from, view: false });
const PROG = [
  { name: "@c", cells: C, outside: [], imports: [] },
  { name: "@b", cells: B_TI, outside: [], imports: [imp("bag", "@c"), imp("tagCount", "@c")] },
  { name: "@a", cells: A_TI, outside: [], imports: [imp("ids", "@b"), imp("total", "@b"), imp("bag", "@c")] },
];
const okProg = checkProgram(PROG);
const okToday = [checkSources({ cells: C, tsx: true }), checkSources({ cells: B_TODAY, tsx: true, outside: [{ name: "bag" }, { name: "tagCount" }] }), checkSources({ cells: A_TODAY, tsx: true, outside: [{ name: "ids" }, { name: "total" }, { name: "bag" }] })];
console.log(`three modules: program ok = ${[...okProg.modules.values()].map((r) => r.result.ok)}, today ok = ${okToday.map((r) => r.ok)}`);
for (let w = 0; w < 3; w++) { checkProgram(PROG); okToday.forEach(() => checkSources({ cells: C, tsx: true })); }
console.log(`${env()}\n  today, three checks: ${stats(time(() => { checkSources({ cells: C, tsx: true }); checkSources({ cells: B_TODAY, tsx: true, outside: [{ name: "bag" }, { name: "tagCount" }] }); checkSources({ cells: A_TODAY, tsx: true, outside: [{ name: "ids" }, { name: "total" }, { name: "bag" }] }); }))} ms`);
console.log(`${env()}\n  one program (ti): ${stats(time(() => checkProgram(PROG)))} ms`);

// (2) an importer of the typed acorn trees
const ACORN_TYPES = readFileSync(join(LITE, "acorn/acorn-types.ss.ts"), "utf8");
const PRODUCER = `${ACORN_TYPES}\nexport const tree = (raw: Parse) => raw;`;
const USER_TI = `import type { Parse } from "@acorn";\nconst count = (tree: Parse) => (tree.ok ? tree.ast.count : 0);`;
const USER_TODAY = `${ACORN_TYPES}\nconst count = (tree: Parse) => (tree.ok ? tree.ast.count : 0);`;
const AC = [{ name: "@acorn", cells: PRODUCER, outside: [{ name: "raw", view: false }], imports: [] }, { name: "@user", cells: USER_TI, outside: [], imports: [imp("tree", "@acorn")] }];
const acP = checkProgram(AC);
console.log(`acorn: program ok = ${[...acP.modules.values()].map((r) => r.result.ok)}; today ok = ${checkSources({ cells: USER_TODAY, tsx: true, outside: [{ name: "tree" }] }).ok}`);
console.log(`${env()}\n  today, the importer alone (the Parse types declared again): ${stats(time(() => checkSources({ cells: USER_TODAY, tsx: true, outside: [{ name: "tree" }] }), 7))} ms`);
console.log(`${env()}\n  the producer alone: ${stats(time(() => checkSources({ cells: PRODUCER, tsx: true, outside: [{ name: "raw" }] }), 7))} ms`);
console.log(`${env()}\n  one program, producer and importer (ti): ${stats(time(() => checkProgram(AC), 7))} ms`);

// (3) delivery of one tree
const text = readFileSync(join(LITE, "infer/md-cell.ss.ts"), "utf8");
const sample = acornParse(text, false) as any;
console.log(`tree: ${sample.ok ? sample.ast.count : "?"} nodes (lite/infer/md-cell.ss.ts, ${text.length} characters)`);
const todayCheck = checkSources({ cells: USER_TODAY, tsx: true, outside: [{ name: "tree" }] });
const shape = todayCheck.facts!.get("count")!.params[0]!.boundary!.shape;
const N = 200;
const trees = Array.from({ length: N }, () => acornParse(text, false));
const c0 = cross(trees[0], shape, "probe.tree", "@user") as any;
console.log(`cross gives a copy: ${c0 !== trees[0]}, deeply frozen: ${Object.isFrozen(c0) && Object.isFrozen(c0.ast.program)}, count ${c0.ast?.count}`);
let i = 0;
console.log(`${env()}\n  today, ss_cross per delivery, one reading parameter (a new tree each time, equal to the last): ${stats(time(() => cross(trees[i++ % N], shape, "count.tree", "@user"), N))} ms`);
i = 0;
console.log(`${env()}\n  today, ss_cross per delivery, a fresh parameter key each time (no comparison with the last copy): ${stats(time(() => cross(trees[i % N], shape, `count.tree${i++}`, "@user"), N))} ms`);
const deepFreeze = (v: any): void => { if (v === null || typeof v !== "object" || Object.isFrozen(v)) return; Object.freeze(v); for (const k of Object.keys(v)) deepFreeze(v[k]); };
const fresh = Array.from({ length: N }, () => acornParse(text, false));
i = 0;
console.log(`${env()}\n  a deep freeze of a fresh tree (the remedy weighed in RESULTS.md): ${stats(time(() => deepFreeze(fresh[i++ % N]), N))} ms`);
i = 0;
console.log(`${env()}\n  by reference: the reference itself (an identity call): ${stats(time(() => ((x: unknown) => x)(trees[i++ % N]), N))} ms`);

// (4) end to end in a Runtime: the tree a cell in another language of @acorn; @user's count reads it through @acorn's tree
const rtMods = (mode: "typed" | "today") => [
  { name: "@acorn", cells: PRODUCER, js: { raw: [[], () => acornParse(text, false)] as [string[], () => unknown] } },
  { name: "@user", cells: mode === "typed" ? USER_TI : USER_TODAY, imports: [{ local: "tree", imported: "tree", from: "@acorn" }] },
];
for (const mode of ["typed", "today"] as const) {
  const b = build(rtMods(mode) as any, mode);
  await b.value("@user", "count");
  const raw = [...b.runtime._variables].find((v: any) => v._module === b.modules.get("@acorn") && v._name === "raw");
  const out: number[] = [];
  for (let k = 0; k < 60; k++) {
    const t = acornParse(text, false);
    const t0 = performance.now();
    raw.define("raw", [], () => t);
    await b.value("@user", "count");
    out.push(performance.now() - t0);
  }
  const same = (await b.value("@user", "count")) === (sample.ok ? sample.ast.count : -1);
  console.log(`${env()}\n  Runtime, raw redefined and @user.count awaited (${mode}): ${stats(out)} ms; count right: ${same}; errors ${b.errors.length}`);
}
void parse;

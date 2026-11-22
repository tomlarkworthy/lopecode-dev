// bun selfhost/late-code/validate.ts: the counter on hand-written cells with known answers.
// Each case: the source, and per cell name what the counter must report (Y/A hits by binding name and write/read; K
// hits by binding name with write and laterWrite; P hits by binding name). A cell absent from want must report nothing.
import { analyzeSource, type CellRep } from "./analyze.ts";

type Want = { ya?: string[]; k?: string[]; p?: string[]; visible?: boolean[] };
type Case = { name: string; src: string; want: Record<string, Want> };
const sumYA = (c: CellRep) => c.ya.map((h) => `${h.kind}:${h.name}:${h.uses.some((u) => u.write && !u.fresh) ? "w" : h.uses.some((u) => !u.fresh) ? "r" : "fresh"}`).sort();
const sumK = (c: CellRep) => c.k.map((h) => `${h.name}:${h.write ? "w" : "r"}${h.laterWrite ? ":late" : ""}`).sort();
const sumP = (c: CellRep) => c.p.map((h) => h.name).sort();

const cases: Case[] = [
  { name: "Y1 push after yield (write)", src: `const g = function* () {\n  const xs = [1];\n  yield 1;\n  xs.push(2);\n  yield xs.length;\n};`, want: { g: { ya: ["Y:xs:w"] } } },
  { name: "Y2 read after yield", src: `const g = function* () {\n  const xs = [1, 2];\n  yield 0;\n  yield xs.length;\n};`, want: { g: { ya: ["Y:xs:r"] } } },
  { name: "Y3 negative: plain const array snapshot used after yield is not Mut", src: `const g = function* () {\n  const xs: readonly number[] = [1, 2];\n  yield 0;\n  yield xs.length;\n};`, want: {} },
  { name: "Y4 negative: Mut used only before the yield", src: `const g = function* () {\n  const xs = [1];\n  xs.push(2);\n  yield xs.length;\n};`, want: {} },
  { name: "Y5 loop: let declared before loop, used before the yield in the loop", src: `const g = function* () {\n  let n = 0;\n  while (n < 3) {\n    n = n + 1;\n    yield n;\n  }\n};`, want: { g: { ya: ["Y:n:w"] } } },
  { name: "Y6 loop: Mut declared inside the loop before the yield (fresh each iteration)", src: `const g = function* () {\n  for (let i = 0; i < 3; i++) {\n    const m = [i];\n    m.push(1);\n    yield m.length;\n  }\n};`, want: { g: { ya: ["Y:i:w", "Y:m:fresh"] } } },
  { name: "A4 a write whose expression holds the await", src: `const f = async () => {\n  const xs = [0];\n  xs.push(await Promise.resolve(1));\n  return 0;\n};`, want: { f: { ya: ["A:xs:w"] } } },
  { name: "A1 async cell: write after await", src: `const f = async () => {\n  const xs = [1];\n  await Promise.resolve(0);\n  xs.push(2);\n  return xs.length;\n};`, want: { f: { ya: ["A:xs:w"], visible: [false] } } },
  { name: "A2 negative: async cell, all before the await", src: `const f = async () => {\n  const xs = [1];\n  xs.push(2);\n  const n = xs.length;\n  return n + (await Promise.resolve(0));\n};`, want: {} },
  { name: "A3 n = await: let assigned by an expression holding the await", src: `const f = async () => {\n  let n = 0;\n  n = await Promise.resolve(2);\n  return 1;\n};`, want: { f: { ya: ["A:n:w"] } } },
  { name: "K1 kept function reads a Mut (accepted today when no later write)", src: `const k = () => {\n  const xs = [1, 2];\n  return () => xs.length;\n};`, want: { k: { k: ["xs:r"] } } },
  { name: "K2 kept function writes a captured Mut (mut-capture today)", src: `const k = () => {\n  const xs = [1, 2];\n  return () => { xs.push(3); return xs.length; };\n};`, want: { k: { k: ["xs:w"] } } },
  { name: "K3 encloser writes after the kept function is made", src: `const k = () => {\n  const xs = [1, 2];\n  const f = () => xs.length;\n  xs.push(3);\n  return f;\n};`, want: { k: { k: ["xs:r:late"] } } },
  { name: "K4 negative: helper only called", src: `const k = () => {\n  const xs = [1, 2];\n  const h = () => xs.length;\n  return h() + h();\n};`, want: {} },
  { name: "K5 negative: kept function captures a const snapshot", src: `const k = () => {\n  const xs = [1, 2];\n  xs.push(3);\n  const snap: readonly number[] = xs.slice();\n  return () => snap.length;\n};`, want: {} },
  { name: "K6 kept function reads a let", src: `const k = () => {\n  let n = 1;\n  return () => n + 1;\n};`, want: { k: { k: ["n:r"] } } },
  { name: "P1 kept function captures a promise", src: `const k = () => {\n  const p = Promise.resolve(1);\n  return () => p;\n};`, want: { k: { p: ["p"] } } },
  { name: "Y8 helper call after the yield uses what the helper captures", src: `const g = function* () {\n  const xs = [1];\n  const add = () => { xs.push(2); };\n  yield 0;\n  add();\n  yield xs.length;\n};`, want: { g: { ya: ["Y:xs:w"] } } },
  { name: "A5 kept async function: visible before it ends", src: `const k = () => async () => {\n  const xs = [1];\n  await Promise.resolve(0);\n  xs.push(2);\n  return xs.length;\n};`, want: { k: { ya: ["A:xs:w"], visible: [true] } } },
  { name: "Y9 negative: let reassigned only before the yield, never used after", src: `const g = function* () {\n  let n = 0;\n  n = n + 2;\n  yield n;\n};`, want: {} },
  { name: "A6 async helper in a kept async fn writes a captured Mut after its own await (visible)", src: `const bad = () => async () => {\n  const m = { n: 1 };\n  const h = async (): Promise<void> => {\n    await 0;\n    m.n = 2;\n  };\n  await h();\n  return 1;\n};`, want: { bad: { ya: ["A:m:w"], visible: [true] } } },
  { name: "A7 async helper of a plain async cell, captured Mut written after its await (not visible)", src: `const c = async () => {\n  const m = { n: 1 };\n  const h = async (): Promise<void> => {\n    await 0;\n    m.n = 2;\n  };\n  await h();\n  return 1;\n};`, want: { c: { ya: ["A:m:w"], visible: [false] } } },
  { name: "A8 async helper of a sync cell, called and dropped: runs after the cell returns (visible)", src: `const c = () => {\n  const m = { n: 1 };\n  const h = async (): Promise<void> => {\n    await 0;\n    m.n = 2;\n  };\n  h();\n  return 1;\n};`, want: { c: { ya: ["A:m:w"], visible: [true] } } },
  { name: "F3 async generator: let across an await and a yield (Y, visible)", src: `const g = async function* () {\n  let n = 0;\n  await Promise.resolve(0);\n  n = n + 1;\n  yield n;\n};`, want: { g: { ya: ["Y:n:w"], visible: [true] } } },
  { name: "F4 nested generator in a sync cell, kept: Mut across its yield", src: `const k = () => function* () {\n  const xs = [1];\n  yield 0;\n  xs.push(2);\n  yield xs.length;\n};`, want: { k: { ya: ["Y:xs:w"], visible: [true] } } },
];

let bad = 0;
for (const c of cases) {
  const r = analyzeSource({ cells: c.src, tsx: true, outside: [] } as any);
  const errs: string[] = [];
  for (const cell of r.cells) {
    if (!cell.reached) errs.push(`${cell.name} not reached (${cell.status} ${cell.rules.join(",")})`);
    const w = c.want[cell.name] ?? {};
    const eq = (a: string[], b: string[] | undefined, what: string) => { const bb = [...(b ?? [])].sort(); if (JSON.stringify(a) !== JSON.stringify(bb)) errs.push(`${cell.name} ${what}: got ${JSON.stringify(a)} want ${JSON.stringify(bb)}`); };
    eq(sumYA(cell), w.ya, "ya"); eq(sumK(cell), w.k, "k"); eq(sumP(cell), w.p, "p");
    if (w.visible) { const v = cell.ya.map((h) => h.visible); if (JSON.stringify(v) !== JSON.stringify(w.visible)) errs.push(`${cell.name} visible: got ${JSON.stringify(v)}`); }
  }
  const st = r.cells.map((x) => `${x.name}:${x.status}${x.rules.length ? "[" + x.rules.join(",") + "]" : ""}`).join(" ");
  console.log(`${errs.length ? "FAIL" : "ok  "} ${c.name}  (checker: ${st})`);
  for (const e of errs) console.log("     " + e);
  if (errs.length) bad++;
}
// for await: the checker reports it unsupported, so no accepted cell holds one and its facts are partial; checked here
const fa = analyzeSource({ cells: `const f = async () => {\n  const xs = [0];\n  for await (const v of [Promise.resolve(1)]) xs.push(v);\n  return xs.length;\n};`, tsx: true, outside: [] } as any).cells[0];
console.log(`for await: checker status ${fa?.status} (unsupported expected)`);
if (fa?.status !== "unsupported") bad++;
console.log(`${cases.length - bad}/${cases.length} cases right`);
process.exit(bad ? 1 : 0);

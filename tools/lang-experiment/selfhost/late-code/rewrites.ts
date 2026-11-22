// bun selfhost/late-code/rewrites.ts: each representative cell R rejects, as shipped and rewritten; both run through
// the checker and the counter. A rewrite passes when the checker accepts it and the counter finds no R use in it.
import { analyzeSource, type CellRep } from "./analyze.ts";

const rUses = (c: CellRep) => [
  ...c.ya.filter((h) => h.uses.some((u) => !u.fresh) && (h.kind === "Y" || h.visible)).map((h) => `${h.kind}:${h.name}`),
  ...c.k.map((h) => `K:${h.name}`),
];
type Rw = { from: string; before: string; after: string | null; note: string };
const rws: Rw[] = [
  { from: "fixtures/accept-basic/cells.ts:15 ticks; lite/soundscript/spec-7.ts:1 s7_beats (same shape)",
    before: `const ticks = function* () {\n  for (let i = 0; i < 3; i++) yield i;\n};`,
    after: `const ticks = function* () {\n  for (const i of [0, 1, 2]) yield i;\n};`,
    note: "loop counter becomes for-of over a fresh array; the iterator still carries state across the yield, out of the checker's sight" },
  { from: "fixtures/accept-basic/cells.ts:15 ticks, general bound n",
    before: `const n = () => 3;\nconst ticks = function* (n: number) {\n  for (let i = 0; i < n; i++) yield i;\n};`,
    after: `const n = () => 3;\nconst ticks = function* (n: number) {\n  for (const i of Array.from({ length: n }, (_, i) => i)) yield i;\n};`,
    note: "the same for a bound that is an input; allocates n numbers up front, and an unbounded generator has no such rewrite" },
  { from: "lite/soundscript/spec-5.ts:1 s5_frames (and the 9 inline copies in spec.ojs, reject:S5.2#191/#192)",
    before: `const s5_frames = function* () {\n  const buf = new Float32Array(3);\n  for (let k = 1; k <= 3; k++) {\n    for (let i = 0; i < buf.length; i++) buf[i] = k * (i + 1);\n    yield buf.slice();\n  }\n};`,
    after: `const s5_frames = function* () {\n  const frame = (k: number): Float32Array => {\n    const b = new Float32Array(3);\n    for (let i = 0; i < b.length; i++) b[i] = k * (i + 1);\n    return b;\n  };\n  for (const k of [1, 2, 3]) yield frame(k).slice();\n};`,
    note: "build each frame in a helper call; the .slice() stays because the checker does not take a helper's result as fresh for mut-yield (two allocations per frame instead of one)" },
  { from: "inline:spec.ojs#om4wd8zo38rt a; reject:S4.4#184 a",
    before: `const a = function* () {\n  const r = { n: 0 };\n  for (let k = 0; k < 2; k++) {\n    r.n = k;\n    yield { ...r };\n  }\n};`,
    after: `const a = function* () {\n  for (const k of [0, 1]) yield { n: k };\n};`,
    note: "yield a fresh record per step" },
  { from: "lite/notebook/examples/09-breakout.tsx:56 ticks; fixtures/lite-game/accept-breakout/cells.tsx:56 ticks",
    before: `const now = () => (): number => 0;\nconst playing = () => true;\nconst over = () => false;\nconst ticks = function* (now: () => number, playing: boolean, over: boolean) {\n  if (!playing || over) return;\n  let t = now();\n  while (true) {\n    const t1 = now();\n    yield t1 - t;\n    t = t1;\n  }\n};`,
    after: null,
    note: "no reasonable rewrite: the frame delta needs the previous time carried across the yield. Recursion through yield* grows without bound; yielding now() moves the subtraction to the consumer, which then needs a state cell" },
  { from: "selfhost/rt/probe3.ss.ts:9 awaitLoop (ss and ssx)",
    before: `const awaitLoop = () => async (xs: readonly Promise<number>[]): Promise<number> => { let s = 0; for (const x of xs) s += await x; return s; };`,
    after: `const awaitLoop = () => async (xs: readonly Promise<number>[]): Promise<number> => (await Promise.all(xs)).reduce((s, v) => s + v, 0);`,
    note: "Promise.all then a fold; a rejection is now reported by the first promise to reject rather than the first in order" },
  { from: "inline:spec.ojs#2cylt8z8h1s2l a",
    before: `const a = () => {\n  const out = [0];\n  const f = () => out.length;\n  return f;\n};`,
    after: `const a = () => {\n  const out: readonly number[] = [0];\n  const f = () => out.length;\n  return f;\n};`,
    note: "annotate the local read-only, so it is not Mut" },
  { from: "lite/render.ss.ts:33 eventOf (module context: sswith); lite/infer/ix-core.ss.ts:159 ixAdmits (module:lite/infer) has the same shape (standalone reduction: DOM_EVENTS inlined)",
    before: `const eventOf = () => {\n  const events = new Map<string, string>([["onClick", "click"]]);\n  return (name: string): string | undefined => events.get(name);\n};`,
    after: `const eventOf = () => {\n  const events: Map<string, string> = new Map<string, string>([["onClick", "click"]]);\n  return (name: string): string | undefined => events.get(name);\n};`,
    note: "a lookup table built once and read by the returned function: annotate it with its plain (non-Mut) type, which is read-only" },
  { from: "fixtures/lite-mut/reject-mut-capture/cells.ts:5 bad_stored",
    before: `const bad_stored = () => { const out = [0]; const f = () => out[0]; return [f, out]; };`,
    after: `const bad_stored = () => { const out = [0]; const snap: readonly number[] = out.slice(); const f = () => snap[0]; return [f, out]; };`,
    note: "const snapshot before the kept function; note this cell sits in a fixture named reject-mut-capture but is accepted today" },
  { from: "inline:spec.ojs#1lj0ijbwa8dg5 bad and #3af5e7gfxw7kh bad (S5.4, was borrowed-await)",
    before: `const bad = () => async () => {\n  const m = { n: 1 };\n  const h = async (): Promise<void> => {\n    await 0;\n    m.n = 2;\n  };\n  const p = h();\n  const v = m;\n  await p;\n  return v.n;\n};`,
    after: null,
    note: "a spec example of the hazard itself (a write after an await seen through an alias); R rejecting it is the intent, no rewrite is meant" },
];
let pass = 0;
for (const r of rws) {
  const b = analyzeSource({ cells: r.before, tsx: true, outside: [] } as any).cells;
  const bs = b.map((c) => `${c.name}:${c.status} R[${rUses(c).join(",")}]`).join(" ");
  let as = "-";
  let ok = r.after === null;
  if (r.after !== null) {
    const a = analyzeSource({ cells: r.after, tsx: true, outside: [] } as any).cells;
    as = a.map((c) => `${c.name}:${c.status}${c.rules.length ? "[" + c.rules.join(",") + "]" : ""} R[${rUses(c).join(",")}]`).join(" ");
    ok = a.every((c) => c.status === "ok" && rUses(c).length === 0);
  }
  if (ok) pass++;
  console.log(`${ok ? "ok  " : "FAIL"} ${r.from}\n     before: ${bs}\n     after:  ${as}\n     ${r.note}`);
}
console.log(`${pass}/${rws.length}`);

// bun selfhost/no-mut/rewrites.ts: each shipped cell (or a standalone reduction of it, marked) and its rewrite under D,
// both put through today's checker and the census counter. The original must show a D use (explicit Mut, a Mut alias,
// a pass to a Mut parameter, or a write outside the allowed groups); the rewrite must be accepted and show none.
// D1 allows writes in groups a, g-fresh and g-copy (S4.3's fresh values) through the binding's own name; D2 also b.
import { analyzeSource } from "./analyze.ts";

type Case = { id: string; at: string; reduction: boolean; variant: "D1" | "D2"; orig: string; rw: string; cost: string };
const cases: Case[] = [
  {
    id: "R1", at: "fixtures/lite-mut/accept-mut-helpers-loops/cells.ts:3 scaled", reduction: false, variant: "D1", cost: "none: one pass, as before",
    orig: `let rows = () => [[1, 2], [3, 4]];\nlet scaled = (rows) => {\n  const out: Mut<number[][]> = [];\n  const add = (r: readonly number[]) => { out.push(r.map((x) => x * 10)); };\n  for (const r of rows) {\n    const row = [...r];\n    row.push(0);\n    add(row);\n  }\n  return out;\n};`,
    rw: `let rows = () => [[1, 2], [3, 4]];\nlet scaled = (rows) => rows.map((r) => [...r, 0].map((x) => x * 10));`,
  },
  {
    id: "R2", at: "lite/soundscript/spec-4.ts:12 s4_counts", reduction: false, variant: "D1", cost: "none: the helper is inlined into the loop",
    orig: `const s4_counts = () => {\n  const m = new Map<string, number>();\n  const bump = (k: string) => {\n    m.set(k, (m.get(k) ?? 0) + 1);\n  };\n  for (const w of ["a", "b", "a"]) bump(w);\n  const f = m;\n  return [f.get("a"), f.get("b")];\n};`,
    rw: `const s4_counts = () => {\n  const m = new Map<string, number>();\n  for (const w of ["a", "b", "a"]) m.set(w, (m.get(w) ?? 0) + 1);\n  return [m.get("a"), m.get("b")];\n};`,
  },
  {
    id: "R3", at: "inline:spec.ojs#2c29mmprz7lwt (S4.5 forEach callback writes a captured Mut)", reduction: false, variant: "D1", cost: "none: forEach becomes for-of",
    orig: `const a = () => {\n  const out = [0];\n  [1].forEach(() => {\n    out[0] = 1;\n  });\n  return out;\n};`,
    rw: `const a = () => {\n  const out = [0];\n  for (const _ of [1]) out[0] = 1;\n  return out;\n};`,
  },
  {
    id: "R4", at: "fixtures/lite-mut/reject-mut-escape/cells.ts:30 ok_mut_param", reduction: false, variant: "D1", cost: "each call copies the array: O(n) per call where the push was O(1); n calls on one array cost O(n^2)",
    orig: `let ok_mut_param = () => {\n  const bump = (m: Mut<number[]>, k: number) => { m[0] += k; m.push(k); };\n  const out = [0];\n  bump(out, 1);\n  bump(out, 2);\n  return out;\n};`,
    rw: `let ok_mut_param = () => {\n  const bump = (m: readonly number[], k: number): number[] => [(m[0] ?? 0) + k, ...m.slice(1), k];\n  return bump(bump([0], 1), 2);\n};`,
  },
  {
    id: "R5", at: "fixtures/lite-mut/reject-mut-freeze-param/cells.ts:10 ok", reduction: false, variant: "D1", cost: "none: the helper's write moves to the owner",
    orig: `let ok = () => {\n  const fill = (m: Mut<number[]>) => { m[0] = 4; };\n  const out = [1];\n  fill(out);\n  return out;\n};`,
    rw: `let ok = () => {\n  const out = [1];\n  out[0] = 4;\n  return out;\n};`,
  },
  {
    id: "R6", at: "horde/cells.ts:70 atMF (and atMI, atMU8; probe-at atMF): a reader typed Mut so a writable buffer can be passed", reduction: true, variant: "D1", cost: "none: the parameter only reads",
    orig: `type Oob = (i: number, n: number) => number;\ntype AtM<T> = (a: Mut<T>, i: number) => number;\nconst oob = (): Oob => (i: number, n: number): number => { throw new RangeError(\`index \${i} of \${n}\`); };\nconst atMF = (oob: Oob): AtM<Float32Array> => (a: Mut<Float32Array>, i: number): number => {\n  const v = a[i];\n  if (v === undefined) return oob(i, a.length);\n  return v;\n};\nconst use = (atMF: AtM<Float32Array>) => {\n  const buf = new Float32Array(4);\n  buf[0] = 1;\n  buf[1] = atMF(buf, 0) + 1;\n  return buf[1];\n};`,
    rw: `type Oob = (i: number, n: number) => number;\ntype AtF = (a: Float32Array, i: number) => number;\nconst oob = (): Oob => (i: number, n: number): number => { throw new RangeError(\`index \${i} of \${n}\`); };\nconst atMF = (oob: Oob): AtF => (a: Float32Array, i: number): number => {\n  const v = a[i];\n  if (v === undefined) return oob(i, a.length);\n  return v;\n};\nconst use = (atMF: AtF) => {\n  const buf = new Float32Array(4);\n  buf[0] = 1;\n  buf[1] = atMF(buf, 0) + 1;\n  return buf[1];\n};`,
  },
  {
    id: "R7", at: "horde/probe/cells.ts:26 p_write_param: a typed array a caller passes in, reused across frames", reduction: false, variant: "D1", cost: "a new buffer per call: an allocation of the buffer's size per frame where there was none; the fill is O(n) either way",
    orig: `export const p_write_param = () => (out: Mut<Float32Array>, v: number) => { out[0] = v; };`,
    rw: `export const p_write_param = () => (n: number, v: number): Float32Array => {\n  const out = new Float32Array(n);\n  out[0] = v;\n  return out;\n};`,
  },
  {
    id: "R8", at: "inline:spec.ojs#2t3ej43dstrm1 (S4.4: a function returning Mut, written by the caller)", reduction: false, variant: "D1", cost: "one copy of what mk returns",
    orig: `const a = () => {\n  const g = (mk: () => Mut<number[]>) => {\n    const xs = mk();\n    xs.push(1);\n    return xs.length;\n  };\n  return 1;\n};`,
    rw: `const a = () => {\n  const g = (mk: () => readonly number[]) => {\n    const xs = [...mk()];\n    xs.push(1);\n    return xs.length;\n  };\n  return 1;\n};`,
  },
  {
    id: "R9", at: "inline:spec.ojs#5dmpl0o0sfui (S4.4: a Mut field, destructured and written)", reduction: false, variant: "D1", cost: "the write becomes a copy: O(n)",
    orig: `const a = () => {\n  const g = (p: { readonly y: Mut<number[]> }) => {\n    const { y } = p;\n    y.push(1);\n    return 1;\n  };\n  return 1;\n};`,
    rw: `const a = () => {\n  const g = (p: { readonly y: readonly number[] }) => {\n    const y = [...p.y, 1];\n    return y.length;\n  };\n  return 1;\n};`,
  },
  {
    id: "R10", at: "fixtures/lite-mut/reject-mut-not-fresh/cells.ts:5 bad_binding (b: a second name writes)", reduction: false, variant: "D1", cost: "none",
    orig: `let bad_binding = () => { const ys = [1]; const m = ys; m[0] = 2; return m; };`,
    rw: `let bad_binding = () => { const ys = [1]; ys[0] = 2; return ys; };`,
  },
  {
    id: "R11", at: "lite/infer/ow-taint.ss.ts:16 owRefsOf (a recursive walk pushing into a Mut parameter)", reduction: true, variant: "D1", cost: "none: an explicit stack in one function, O(n) as before",
    orig: `type N = { readonly type: string; readonly kids: readonly N[] };\nconst refsOf = () => {\n  function walk(n: N, out: Mut<N[]>): void {\n    if (n.type === "Identifier") { out.push(n); return; }\n    for (const k of n.kids) walk(k, out);\n  }\n  return (n: N): N[] => {\n    const out = [n].slice(0, 0);\n    walk(n, out);\n    return out.slice();\n  };\n};`,
    rw: `type N = { readonly type: string; readonly kids: readonly N[] };\nconst refsOf = () => (n: N): N[] => {\n  const out = [n].slice(0, 0);\n  const todo = [n];\n  for (let x = todo.pop(); x !== undefined; x = todo.pop()) {\n    if (x.type === "Identifier") { out.push(x); continue; }\n    for (const k of x.kids.toReversed()) todo.push(k);\n  }\n  return out.slice();\n};`,
  },
  {
    id: "R12", at: "lite/infer/ow-capture.ss.ts:72 owMutDeep (a recursive helper writing a captured memo)", reduction: true, variant: "D1", cost: "none: an explicit stack with an exit marker per alias, O(n) as before",
    orig: `type Ty = { readonly k: "named"; readonly n: string; readonly args: readonly Ty[] } | { readonly k: "arr"; readonly el: Ty } | { readonly k: "num" };\ntype Reg = { readonly isAlias: (n: string) => boolean; readonly expand: (t: Ty) => Ty };\nconst mutDeep = () => (R: Reg, t0: Ty): string | null => {\n  const none = new Map<string, number>();\n  function deep(t: Ty, depth: number): string | null {\n    if (depth > 12) return null;\n    if (t.k === "arr") return deep(t.el, depth + 1);\n    if (t.k !== "named") return null;\n    if (t.n === "Mut") return t.n;\n    if (!R.isAlias(t.n)) { for (const x of t.args) { const w = deep(x, depth + 1); if (w) return w; } return null; }\n    const plain = !t.args.length, at = none.get(t.n);\n    if (plain && at !== undefined && at <= depth) return null;\n    const w = deep(R.expand(t), depth + 1);\n    if (!w && plain) none.set(t.n, depth);\n    return w;\n  }\n  return deep(t0, 0);\n};`,
    rw: `type Ty = { readonly k: "named"; readonly n: string; readonly args: readonly Ty[] } | { readonly k: "arr"; readonly el: Ty } | { readonly k: "num" };\ntype Reg = { readonly isAlias: (n: string) => boolean; readonly expand: (t: Ty) => Ty };\ntype Fr = { readonly t: Ty | null; readonly depth: number; readonly exit: string | null };\nconst mutDeep = () => (R: Reg, t0: Ty): string | null => {\n  const none = new Map<string, number>();\n  const first: Fr = { t: t0, depth: 0, exit: null };\n  const todo = [first];\n  for (let f = todo.pop(); f !== undefined; f = todo.pop()) {\n    const t = f.t;\n    if (t === null) { if (f.exit !== null) none.set(f.exit, f.depth); continue; }\n    if (f.depth > 12) continue;\n    if (t.k === "arr") { todo.push({ t: t.el, depth: f.depth + 1, exit: null }); continue; }\n    if (t.k !== "named") continue;\n    if (t.n === "Mut") return t.n;\n    if (!R.isAlias(t.n)) { for (const x of t.args.toReversed()) todo.push({ t: x, depth: f.depth + 1, exit: null }); continue; }\n    const plain = !t.args.length, at = none.get(t.n);\n    if (plain && at !== undefined && at <= f.depth) continue;\n    if (plain) todo.push({ t: null, depth: f.depth, exit: t.n });\n    todo.push({ t: R.expand(t), depth: f.depth + 1, exit: null });\n  }\n  return null;\n};`,
  },
  {
    id: "R13", at: "lite/events.ss.ts:97 queueValue (27 handlers writing the caller's handles map and effects array)", reduction: true, variant: "D1", cost: "none if the one caller applies the deltas to its own fresh map and array; each handler that calls another must return the union of deltas",
    orig: `type Rec = { readonly queue: readonly unknown[]; readonly draining: boolean };\ntype Effect = { readonly fx: string; readonly hid: number };\ntype Handles = Mut<Map<number, Rec>>;\ntype Effects = Mut<Effect[]>;\nconst queueValue = () => (handles: Handles, fx: Effects, hid: number, h: Rec, v: unknown): void => {\n  handles.set(hid, { ...h, queue: [...h.queue, v], draining: true });\n  if (!h.draining) fx.push({ fx: "then", hid });\n};\nconst step = (queueValue) => (prev: Map<number, Rec>, hid: number, v: unknown): number => {\n  const handles = new Map(prev);\n  const start: Effect = { fx: "start", hid };\n  const fx = [start];\n  const h = handles.get(hid);\n  if (h !== undefined) queueValue(handles, fx, hid, h, v);\n  return handles.size + fx.length;\n};`,
    rw: `type Rec = { readonly queue: readonly unknown[]; readonly draining: boolean };\ntype Effect = { readonly fx: string; readonly hid: number };\ntype Delta = { readonly set: readonly { readonly hid: number; readonly h: Rec }[]; readonly fx: readonly Effect[] };\nconst queueValue = () => (hid: number, h: Rec, v: unknown): Delta => ({\n  set: [{ hid, h: { ...h, queue: [...h.queue, v], draining: true } }],\n  fx: h.draining ? [] : [{ fx: "then", hid }],\n});\nconst step = (queueValue) => (prev: Map<number, Rec>, hid: number, v: unknown): number => {\n  const handles = new Map(prev);\n  const start: Effect = { fx: "start", hid };\n  const fx = [start];\n  const h = handles.get(hid);\n  if (h !== undefined) {\n    const d = queueValue(hid, h, v);\n    for (const s of d.set) handles.set(s.hid, s.h);\n    for (const e of d.fx) fx.push(e);\n  }\n  return handles.size + fx.length;\n};`,
  },
  {
    id: "R14", at: "lite/infer/ix-core.ss.ts:52 ixFlowSet (a cell's function writing the checker's flow table W, one of 129 such cells)", reduction: true, variant: "D1", cost: "W is copied on every set: O(F) per set where it was O(1), O(F^2) over a check; and every caller up to the cell that made W must take the new table and pass it on",
    orig: `type Flow = Map<string, number>;\ntype Flows = Mut<Map<number, Flow>>;\nconst flowSet = () => (W: Flows, id: number, k: string, t: number): void => {\n  const m = new Map<string, number>(W.get(id) ?? []);\n  m.set(k, t);\n  W.set(id, m);\n};\nconst check = (flowSet) => () => {\n  const W = new Map<number, Flow>();\n  flowSet(W, 0, "x", 1);\n  flowSet(W, 0, "y", 2);\n  return W.size;\n};`,
    rw: `type Flow = Map<string, number>;\nconst flowSet = () => (W: Map<number, Flow>, id: number, k: string, t: number): Map<number, Flow> => {\n  const m = new Map<string, number>(W.get(id) ?? []);\n  m.set(k, t);\n  const w2 = new Map<number, Flow>(W);\n  w2.set(id, m);\n  return w2;\n};\nconst check = (flowSet) => () => flowSet(flowSet(new Map<number, Flow>(), 0, "x", 1), 0, "y", 2).size;`,
  },
  {
    id: "R15", at: "lite/infer/ix-core.ss.ts:22 ixErr (76 cells updating fields of the checker's control record C)", reduction: true, variant: "D1", cost: "each update copies the record (about 20 fields in IxCtl); every caller must thread the returned record, and a caller that already returns a value must return a pair",
    orig: `type Diag = { readonly at: number; readonly msg: string };\ntype Ctl = Mut<{ diags: readonly Diag[]; n: number }>;\nconst err = () => (C: Ctl, at: number, msg: string): void => {\n  C.diags = [...C.diags, { at, msg }];\n  C.n = C.n + 1;\n};\nconst run = (err) => () => {\n  const none: readonly Diag[] = [];\n  const C = { diags: none, n: 0 };\n  err(C, 1, "a");\n  return C.n;\n};`,
    rw: `type Diag = { readonly at: number; readonly msg: string };\ntype Ctl = { readonly diags: readonly Diag[]; readonly n: number };\nconst err = () => (C: Ctl, at: number, msg: string): Ctl => ({ diags: [...C.diags, { at, msg }], n: C.n + 1 });\nconst run = (err) => () => {\n  const none: readonly Diag[] = [];\n  return err({ diags: none, n: 0 }, 1, "a").n;\n};`,
  },
];

const legal = (variant: string) => (w: any) => !w.captured && (w.group === "a" || w.group === "g-fresh" || w.group === "g-copy" || (variant === "D2" && w.group === "b"));
const dUses = (r: ReturnType<typeof analyzeSource>, variant: string): string[] => {
  const u: string[] = [];
  for (const x of r.outside) u.push(`explicit Mut outside cells (${x.pos})`);
  for (const c of r.cells) {
    for (const x of c.explicit) u.push(`${c.name}: explicit Mut (${x.pos})`);
    for (const a of [...c.aliasIs, ...c.aliasHas]) u.push(`${c.name}: Mut alias ${a}`);
    for (const p of c.passes) u.push(`${c.name}: pass to ${p.callee}`);
    for (const w of c.writes) if (!legal(variant)(w)) u.push(`${c.name}: write ${w.captured ? "f/" : ""}${w.group} ${w.how} ${w.root ?? ""}`);
  }
  return u;
};
let bad = 0;
for (const c of cases) {
  const o = analyzeSource({ cells: c.orig, tsx: true, outside: [] } as any);
  const r = analyzeSource({ cells: c.rw, tsx: true, outside: [] } as any);
  const oOk = o.cells.every((x) => x.status === "ok"), rOk = r.cells.every((x) => x.status === "ok");
  const ou = dUses(o, c.variant), ru = dUses(r, c.variant);
  const pass = oOk && ou.length > 0 && rOk && ru.length === 0;
  if (!pass) bad++;
  console.log(`${pass ? "ok  " : "FAIL"} ${c.id} ${c.at}${c.reduction ? " (reduction)" : ""}`);
  console.log(`     original: ${o.cells.map((x) => `${x.name}:${x.status}${x.rules.length ? "[" + x.rules.join(",") + "]" : ""}`).join(" ")}; D uses ${ou.length}: ${[...new Set(ou)].slice(0, 4).join("; ")}`);
  console.log(`     rewrite:  ${r.cells.map((x) => `${x.name}:${x.status}${x.rules.length ? "[" + x.rules.join(",") + "]" : ""}`).join(" ")}; D uses ${ru.length}${ru.length ? ": " + ru.join("; ") : ""}; writes ${r.cells.flatMap((x) => x.writes.map((w) => w.group)).join(",") || "none"}`);
  console.log(`     cost: ${c.cost}`);
}
console.log(`${cases.length - bad}/${cases.length} rewrites accepted with no D use (originals accepted, each with a D use)`);
process.exit(bad ? 1 : 0);

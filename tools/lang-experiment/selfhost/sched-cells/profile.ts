// Where the per-value cost goes, by elimination. One bench run (L listeners, H idle handles) through shell.ts with
// the linked split step records every (state, event) pair; the pure steps are then replayed alone on that trace.
// Also: cell sizes (splitCells), closures made per step call (acorn over the erased cell text), and whether the
// island and the giant step give the same output as the linked split step on the trace.
// Run: bun selfhost/sched-cells/profile.ts [L] [H]
import { readFileSync } from "node:fs";
import * as acorn from "acorn";
import { splitCells, declaredName } from "../../lite/toolchain/ss-toolchain.ts";
import { link } from "../../lite/link.ts";
import { mut, freeze } from "../../lite/runtime-ss.ts";
import * as rtCells from "../../lite/runtime.ss.ts";
import * as giantCells from "../sched/step.ss.ts";
const P = await import("../../prelude.runtime.ts");
const C = await import("./shell.ts");
const I = await import("./island.ts");
const L = Number(process.argv[2] ?? 1), H = Number(process.argv[3] ?? 0), N = 20000;
const split = C.linked, giant = link({ ...rtCells, ...giantCells }, { mut, freeze });

const lines = (p: string) => splitCells(readFileSync(new URL(p, import.meta.url).pathname, "utf8"), false)
  .map((t) => ({ name: declaredName(t), t })).filter((c) => c.name !== null).map(({ name, t }) => ({ name, n: t.trim().split("\n").filter((l) => l.trim() && !l.trim().startsWith("//")).length }));
for (const [label, p] of [["split", "./step.ss.ts"], ["giant", "../sched/step.ss.ts"]] as const) {
  const c = lines(p), ns = c.map((x) => x.n).toSorted((a, b) => a - b);
  console.log(`${label} cells ${c.length}, lines max ${ns.at(-1)} median ${ns[Math.floor(ns.length / 2)]}, >20: ${c.filter((x) => x.n > 20).map((x) => `${x.name} ${x.n}`).join(", ") || "none"}`);
  if (label === "split") console.log("  " + c.map((x) => `${x.name} ${x.n}`).join(", "));
}
const closures = (f: unknown) => {
  const fn: any = acorn.parseExpressionAt(`(${String(f)})`, 0, { ecmaVersion: "latest" });
  const inner = fn.body.type === "ArrowFunctionExpression" ? fn.body : null;
  let n = 0;
  const walk = (x: any) => { if (!x || typeof x.type !== "string") return; if (x !== inner && /Function/.test(x.type)) n++; for (const k in x) { const v = x[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object" && k !== "loc") walk(v); } };
  walk(inner?.body);
  return n;
};
console.log(`function literals inside the step function's body (made per call, plus per loop turn): giant ${closures(giantCells.step)}, split step ${closures((await import("./step.ss.ts")).step)}`);

const trace: [any, any][] = [];
C.useStep((s, e) => { trace.push([s, e]); return split.step(s, e); });
const frames: (() => void)[] = [];
C.scheduler.frame = (f) => void frames.push(f);
const idle = Array.from({ length: H }, (_, i) => C.events("p", `idle${i}`, [], () => (function* () {})() as any, null));
const h = C.events("p", "bench", [], () => (function* () { for (let i = 0; i < N; i++) yield i; })() as any, null);
let got = 0;
const ls = Array.from({ length: L }, (_, i) => C.listen(C.on(h, P.action(() => void got++)), `l${i}`, null, "p"));
const t0 = trace.length;
const w0 = performance.now();
while (frames.length) frames.splice(0).forEach((f) => f());
const live = (performance.now() - w0) * 1000 / N;
const run = trace.slice(t0);
C.useStep(null);
for (const x of [...ls, h, ...idle]) C.release(x);
const fx = run.reduce((a, [s, e]) => a + split.step(s, e).effects.length, 0);
const kinds = new Map<string, number>();
for (const [, e] of run) kinds.set(e.t, (kinds.get(e.t) ?? 0) + 1);
console.log(`L=${L} H=${H}: ${got} deliveries, ${(run.length / N).toFixed(2)} steps/value (${[...kinds].map(([k, n]) => `${k} ${(n / N).toFixed(2)}`).join(" ")}), ${(fx / N).toFixed(2)} effects/value`);

const sameOut = (f: (s: any, e: any) => any) => run.every(([s, e]) => Bun.deepEquals(f(s, e), split.step(s, e)));
console.log(`same output as the linked split step on all ${run.length} steps: giant ${sameOut(giant.step)}, island ${sameOut(I.islandStepSync)}`);

const copyOnly = (s: any) => ({ state: { hs: new Map(s.hs), at: new Map(s.at), ls: new Map(s.ls), lat: new Map(s.lat), placer: s.placer, generation: s.generation, born: new Map(s.born) }, effects: [] });
const nothing = (s: any) => ({ state: s, effects: [] });
const arms: [string, (s: any, e: any) => any][] = [["linked split step", split.step], ["giant step", giant.step], ["island, sync runHere", I.islandStepSync], ["copy 5 maps only", copyOnly], ["return state", nothing]];
const replay = (f: (s: any, e: any) => any) => { const a = performance.now(); for (const [s, e] of run) f(s, e); return (performance.now() - a) * 1000 / N; };
const asyncReplay = async () => { const a = performance.now(); for (const [s, e] of run) await I.compiled({ st: s, ev: e }); return (performance.now() - a) * 1000 / N; };
for (const [, f] of arms) replay(f);
await asyncReplay();
const t = new Map<string, number[]>();
for (let r = 0; r < 5; r++) {
  for (const [k, f] of arms) t.set(k, [...(t.get(k) ?? []), replay(f)]);
  t.set("island, compile (await)", [...(t.get("island, compile (await)") ?? []), await asyncReplay()]);
}
console.log(`live run through the shell: ${live.toFixed(2)} us/value (one run, includes the recording wrapper)`);
for (const [k, ts] of t) console.log(`replay ${k.padEnd(26)} ${Math.min(...ts).toFixed(2)}-${Math.max(...ts).toFixed(2)} us/value`);

// in place: the live bench run with the step called once, twice, or once plus a copy-only step; the extra call's cost
// is the step's (or the copies') in-place cost, and the rest of the single run is the shell
const liveRun = (f: (s: any, e: any) => any) => {
  C.useStep(f);
  const frames2: (() => void)[] = [];
  C.scheduler.frame = (g) => void frames2.push(g);
  const idle2 = Array.from({ length: H }, (_, i) => C.events("q", `idle${i}`, [], () => (function* () {})() as any, null));
  const h2 = C.events("q", "bench", [], () => (function* () { for (let i = 0; i < N; i++) yield i; })() as any, null);
  const ls2 = Array.from({ length: L }, (_, i) => C.listen(C.on(h2, P.action(() => {})), `l${i}`, null, "q"));
  const a = performance.now();
  while (frames2.length) frames2.splice(0).forEach((g) => g());
  const us = (performance.now() - a) * 1000 / N;
  for (const x of [...ls2, h2, ...idle2]) C.release(x);
  C.useStep(null);
  return us;
};
const inPlace: [string, (s: any, e: any) => any][] = [["step once", split.step], ["step twice", (s, e) => (split.step(s, e), split.step(s, e))], ["step + copy-only", (s, e) => (copyOnly(s), split.step(s, e))], ["step + return-state", (s, e) => (nothing(s), split.step(s, e))]];
for (const [, f] of inPlace) liveRun(f);
const lt = new Map<string, number[]>();
for (let r = 0; r < 5; r++) for (const [k, f] of [...inPlace.slice(r % 4), ...inPlace.slice(0, r % 4)]) lt.set(k, [...(lt.get(k) ?? []), liveRun(f)]);
for (const [k, ts] of lt) console.log(`live ${k.padEnd(22)} ${Math.min(...ts).toFixed(2)}-${Math.max(...ts).toFixed(2)} us/value`);

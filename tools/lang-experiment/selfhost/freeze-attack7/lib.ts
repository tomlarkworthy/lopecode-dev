// freeze-attack7 shared pieces. A program: freeze-attack3 harness C(name, src, { drive, ctl }). Run by
// ../../lite/infer/attack/drive-run.ts (silent = harness CHANGED line, drive line with DIFF, or a publishTap TAP line).
import { C } from "../freeze-attack3/harness.ts";
export { C };
// drive (freeze-attack6/t0.ts act): call the action, settle, compare what lg recorded inside the action at the publish
// (the second cell w holds it) with what the holder cell v's function gives now
export const act = (cell = "put", key = "go", holder = "v", given = "w", call = (h: any) => (typeof h === "function" ? h() : h.f ? h.f() : h[0]())) => async (p: any) => {
  const a = p.value(cell); const g = typeof a === "function" ? a : a?.[key];
  if (typeof g !== "function") return `no action (${p.status(cell)} ${String(p.error?.(cell) ?? "").slice(0, 80)})`;
  try { g(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 120)}`; }
  await p.settle(400);
  const h = p.value(holder), w = p.value(given);
  let now: unknown; try { now = call(h); } catch (e) { now = `throws ${(e as Error).message.slice(0, 60)}`; }
  // -1 is every holder state's initial reading: the program gave the holder nothing
  if (now === -1) return `same: the holder was not written (holds its initial value; lg ${JSON.stringify(w)})`;
  return `${JSON.stringify(now) !== JSON.stringify(w) ? "DIFF" : "same"} given ${JSON.stringify(w)} holds ${JSON.stringify(now)}`;
};
// a drive that only settles and compares (a listener or a generator did the publish)
export const cmp = (holder = "v", given = "w", call = (h: any) => (typeof h === "function" ? h() : h.f ? h.f() : h[0]())) => async (p: any) => {
  await p.settle(400);
  const h = p.value(holder), w = p.value(given);
  if (h === undefined) return `no holder (${p.status(holder)})`;
  let now: unknown; try { now = call(h); } catch (e) { now = `throws ${(e as Error).message.slice(0, 60)}`; }
  return `${JSON.stringify(now) !== JSON.stringify(w) ? "DIFF" : "same"} given ${JSON.stringify(w)} holds ${JSON.stringify(now)}`;
};
// memo (p1-attacks hit): cell a calls sq(r), records r.f(), writes; cell b calls sq(a.r). Only a hit holds what a gave
export const hit = async (p: any) => {
  const a = p.value("a"), b = p.value("b");
  if (!a || !b) return `no value (a ${p.status("a")}, b ${p.status("b")} ${String(p.error?.("a") ?? p.error?.("b") ?? "").slice(0, 80)})`;
  if (b !== a.got) return "same: a miss, nothing was stored";
  if (typeof b.o.f !== "function") return "same: a hit on a key with no function (data, frozen at the miss)";
  let now: unknown; try { now = b.o.f(); } catch (e) { now = `throws ${(e as Error).message.slice(0, 60)}`; }
  return `${a.before !== now ? "DIFF" : "same"} hit: stored when the reading was ${a.before}, holds ${now}`;
};
export const ST = (t = "() => number", init = "() => -1") => `const s = () => state<${t}>(${init});\nconst lg = () => state(-1);\nconst v = (s: ${t}) => s;\nconst w = (lg: number) => lg;\n`;
// an action cell; ls is lg.set read before anything else (a point before every local, so it constrains none)
export const body = (b: string, t = "() => number") => `const put = (s: State<${t}>, lg: State<number>) => ({ go: action(() => { const ls = lg.set; ${b} }) });`;
export const SP = "const xs = [0]; const c: readonly number[] = xs; const f = () => c.length;";
// holders: a Mut local, a read-only alias c bound before f, f reading c, and writes to the Mut
export type H = { id: string; setup: string; read: string; writes: [string, string][] };
export const HOLD: H[] = [
  { id: "arr", setup: "const xs = [0, 1]; const c: readonly number[] = xs;", read: "c.length * 100 + c.reduce((p, q) => p * 3 + q, 0)",
    writes: [["push", "xs.push(1);"], ["index", "xs[0] = 5;"], ["len0", "xs.length = 0;"], ["sort", "xs.sort((p, q) => q - p);"]] },
  { id: "map", setup: "const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m;", read: "c.size * 10 + (c.get('a') ?? 0)", writes: [["set", "m.set('k', 1);"], ["delete", "m.delete('a');"]] },
  { id: "set", setup: "const st0 = new Set<number>([1]); const c: Set<number> = st0;", read: "c.size", writes: [["add", "st0.add(2);"]] },
  { id: "rec", setup: "const o = { n: 1 }; const c: { readonly n: number } = o;", read: "c.n", writes: [["assign", "o.n = 5;"], ["incr", "o.n++;"]] },
  { id: "opt", setup: "const o: { n?: number } = { n: 1 }; const c: { readonly n?: number } = o;", read: "c.n ?? -1", writes: [["delete", "delete o.n;"]] },
  { id: "err", setup: "const e = new Error('x'); const c: Error = e;", read: "c.message.length", writes: [["message", "e.message = 'longer';"]] },
  { id: "nest", setup: "const xs = [0]; const r = { t: xs }; const c: { readonly t: readonly number[] } = r;", read: "c.t.length", writes: [["push", "xs.push(1);"]] },
  { id: "tuple", setup: "const xs = [0]; const t = [xs, 1] as const; const c: readonly [readonly number[], 1] = t;", read: "c[0].length", writes: [["push", "xs.push(1);"]] },
  { id: "arrrec", setup: "const o = { n: 1 }; const c: readonly { readonly n: number }[] = [o];", read: "c[0]?.n ?? -1", writes: [["assign", "o.n = 4;"]] },
];
// controls, run with the checker skipped: a let written after the publish (fires in both modes), and the direct P form
// (fires with SS_MEASURE_REG=0 only: registration freezes xs at the publish)
export const controls = (set: string) => [
  C(`${set}-ctl-let`, ST() + body("const st = s.set; let n = 1; const f = () => n; st(f); ls(f()); n = 2;"), { drive: act(), ctl: true }),
  C(`${set}-ctl-P`, ST() + body(`${SP} s.set(f); ls(f()); xs.push(1);`), { drive: act(), ctl: true }),
];

// Shared pieces: a bun Observable Runtime that runs a list of variables, and the comparison helpers.
(globalThis as any).requestAnimationFrame = (f: () => void) => void setTimeout(f, 1);
export const ss = await import("../lite/stdlib/runtime.ts");
export const P = await import("../prelude.runtime.ts");
export const T = await import("../lite/toolchain/ss-toolchain.ts");
const { Runtime } = await import("@observablehq/runtime");
// Observable's own Generators.input, from the vendored stdlib source
const { input } = await import(new URL("../../../vendor/observable-stdlib/src/generators/input.js", import.meta.url).pathname as any);
export const Generators = { input };

export type Var = { name: string | null; inputs: string[]; definition: string };
const tick = () => new Promise((r) => setTimeout(r, 0));
// true once the runtime and the action queue have been idle for 5 ticks in a row; false after 2000 ticks without
export async function settle(runtime: any): Promise<boolean> {
  let quiet = 0;
  for (let i = 0; i < 2000 && quiet < 5; i++) { await tick(); quiet = P.idle() && !runtime._computing ? quiet + 1 : 0; }
  return quiet >= 5;
}
export const show = (x: unknown): string => {
  if (typeof x === "function") return "fn";
  if (typeof x === "number" || x === undefined) return String(x);
  if (x && typeof x === "object" && (x as any)[Symbol.iterator] && typeof (x as any).next === "function") return "generator";
  if ((x as any)?.__ssView) return "handle";
  if (x instanceof EventTarget) return `view(${show((x as any).value)})`;
  if (x && typeof x === "object" && P.isRefHandle(x)) return "handle";
  try { return JSON.stringify(x); } catch { return String(x); }
};
// the Observable JavaScript side: what an Observable notebook would supply
export function outside(stdlib: any = ss) {
  const view = new EventTarget() as any;
  view.value = 3;
  return {
    ...Object.fromEntries(T.RUNTIME_CELLS.map((n: string) => [T.INPUTS[n], stdlib[n]])), Generators, ss_now: () => 0, ss_random: () => 0.5, ss_log: () => {},
    ss_fetch: async () => ({ status: 200 }), ss_compile: () => "compiled",
    shop_basket: [{ item: "a", qty: 2 }, { item: "b", qty: 1 }],
    "viewof shop_price": view, shop_price: 3,
  } as Record<string, unknown>;
}
// Runs vars on a fresh runtime, every variable observed; returns snapshots of every value or error by name.
export async function run(vars: Var[], stdlib: any = ss) {
  const runtime = new Runtime();
  const m = runtime.module();
  const values = new Map<string, unknown>(), errs = new Map<string, string>();
  const obs = (n: string) => ({
    fulfilled: (x: unknown) => { values.set(n, x); errs.delete(n); },
    rejected: (e: unknown) => { errs.set(n, ((e as Error)?.message ?? String(e)).replace(/\s+/g, " ").slice(0, 80)); },
  });
  const out = outside(stdlib);
  const defined = new Set(vars.map((v) => v.name));
  for (const [n, x] of Object.entries(out)) if (!defined.has(n)) m.variable(obs(n)).define(n, [], () => x);
  let anon = 0;
  for (const v of vars) {
    const n = v.name ?? `<anon ${anon++}>`;
    let f: unknown;
    try { f = (0, eval)(`(${v.definition})`); } catch (e) { errs.set(n, `eval: ${(e as Error).message}`); continue; }
    m.variable(obs(n)).define(v.name, v.inputs, f);
  }
  const settled = async () => { if (!(await settle(runtime))) throw new Error("the runtime did not settle in 2000 ticks"); };
  await settled();
  const snap = () => ({
    ...Object.fromEntries([...new Set([...values.keys(), ...errs.keys()])].filter((n) => !(n in out)).sort().map((n) => [n, errs.has(n) ? `ERR ${errs.get(n)}` : show(values.get(n))])),
    "shop_price view": show((out["viewof shop_price"] as any).value),
  });
  // one snapshot after settling, then one after each action call, each called on its own
  const snaps: Record<string, string>[] = [snap()];
  for (const [a, arg] of ACTIONS) {
    const f = values.get(a);
    let r = "";
    if (typeof f === "function") { try { (f as any)(arg); } catch (e) { r = `threw ${(e as Error).message}`; } } else r = "not a function";
    await settled();
    snaps.push({ ...snap(), [`call ${a}`]: r || "ok" });
  }
  // a function value is compared by calling it: getter goes through the fetch capability
  const g = values.get("getter");
  let got = "not a function";
  if (typeof g === "function") { try { got = `resolved ${JSON.stringify(await (g as any)("u"))}`; } catch (e) { got = `rejected ${(e as Error).message.slice(0, 60)}`; } }
  snaps.push({ ...snap(), "call getter(\"u\")": got });
  // every other function value, called with (2, 3); a promise is awaited
  const calls: Record<string, string> = {};
  for (const [n, f] of [...values].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (typeof f !== "function" || n === "getter" || ACTIONS.some(([a]) => a === n) || n in out) continue;
    try { calls[`call ${n}(2, 3)`] = `returned ${show(await (f as any)(2, 3))}`; } catch (e) { calls[`call ${n}(2, 3)`] = `threw ${String((e as Error)?.message ?? e).slice(0, 60)}`; }
  }
  await settled();
  snaps.push({ ...snap(), ...calls });
  runtime.dispose();
  await tick(); // the invalidations dispose resolves run their callbacks
  return snaps;
}
export const ACTIONS: [string, unknown][] = [["increment", undefined], ["save", undefined], ["tick", 5], ["cheaper", undefined], ["measureCount", undefined]];
// rows where two runs differ at any snapshot: [name, a's values, b's values]
export function diffRuns(a: Record<string, string>[], b: Record<string, string>[], rename: (n: string) => string = (n) => n) {
  const names = [...new Set([...Object.keys(a.at(-1)!), ...Object.keys(a[0])])].sort();
  const rows: [string, string, string][] = [];
  for (const n of names) {
    const x = a.map((s) => s[n] ?? "-").join(" | "), y = b.map((s) => s[rename(n)] ?? "-").join(" | ");
    if (x !== y) rows.push([n, x, y]);
  }
  return { names: names.length, rows };
}

// freeze-attack8 shared pieces
import { C } from "../freeze-attack3/harness.ts";
export { C };
export const SP = "const xs = [0]; const c: readonly number[] = xs;";
const num = async (x: unknown) => (x instanceof Promise ? await x : x);
// D: the cell put returns { f: F, k, wm }; wm (a WeakMap, which deepFreeze does not walk) holds a writer of xs that the
// drive calls after the cell has returned; w = put.f() is a second cell holding the reading before the write
export const D = (form: string, extra = "") => `const put = () => { ${SP} ${form} const wm = new WeakMap<object, () => void>(); const k = {}; wm.set(k, () => { xs.push(1); }); return { f: F, k, wm${extra} }; };\nconst w = (put: { readonly f: () => number }) => put.f();`;
export const Dbase = (form: string, extra = "") => `const put = () => { ${SP} ${form} return { f: F${extra} }; };\nconst w = (put: { readonly f: () => number }) => put.f();`;
export const driveD = async (p: any) => {
  const put = p.value("put");
  if (!put || typeof put.f !== "function") return `no put (${p.status("put")} ${String(p.error?.("put") ?? "").slice(0, 120)})`;
  const before = p.value("w");
  let wrote = "wrote";
  try { put.wm.get(put.k)(); } catch (e) { wrote = `write threw: ${(e as Error).message.slice(0, 100)}`; }
  await p.settle(200);
  let now: unknown; try { now = await num(put.f()); } catch (e) { now = `f throws ${(e as Error).message.slice(0, 80)}`; }
  return `${wrote}; ${JSON.stringify(now) !== JSON.stringify(before) ? "DIFF" : "same"} w (earlier reading) = ${JSON.stringify(before)}, put.f() now = ${JSON.stringify(now)}`;
};
// G: a generator cell yields { f: F }, then writes xs and ends; w = g.f() is a second cell
export const G = (form: string) => `const g = function* () { ${SP} ${form} yield { f: F }; xs.push(1); };\nconst w = (g: { readonly f: () => number }) => g.f();`;
export const Gbase = (form: string) => `const g = function* () { ${SP} ${form} yield { f: F }; };\nconst w = (g: { readonly f: () => number }) => g.f();`;
export const driveG = async (p: any) => {
  await p.settle(200);
  const g = p.value("g"), before = p.value("w");
  const st = p.status("g");
  if (!g || typeof g.f !== "function") return `no g (${st} ${String(p.error?.("g") ?? "").slice(0, 120)})`;
  let now: unknown; try { now = await num(g.f()); } catch (e) { now = `f throws ${(e as Error).message.slice(0, 80)}`; }
  return `g ${st}${st === "rejected" ? " " + String(p.error?.("g") ?? "").slice(0, 100) : ""}; ${JSON.stringify(now) !== JSON.stringify(before) ? "DIFF" : "same"} w (earlier reading) = ${JSON.stringify(before)}, g.f() now = ${JSON.stringify(now)}`;
};

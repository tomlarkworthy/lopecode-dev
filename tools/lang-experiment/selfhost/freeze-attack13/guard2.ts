// freeze-attack13 target 5, part 2: then spellings the checker accepts and cell kinds other than a plain cell, each
// reaching a laundered Action (VA) as in guard.ts; and a control for the F (false positive) vehicle.
import { type Cand } from "./lib13.ts";
import { rt } from "../../prelude.runtime.ts";
const R: Cand[] = [];
const L = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\nconst w = (a: Action<[]>) => action(() => a);\nconst s = (): StateCell<readonly (() => void)[]> => state([]);\nconst put = (w: Action<[]>, s: State<readonly (() => void)[]>) => action(() => { const f = w() ?? (() => {}); s.set([f]); });\n`;
const CALL = `const f = s[0]; if (f !== undefined) f();`;
const SP = `s: readonly (() => void)[]`;
const call = (p: any, n: string, st: string[]) => { const f = p.value(n); if (typeof f !== "function") { st.push(`${n} missing`); return; } try { f(); st.push(`${n} ok`); } catch (e) { st.push(`${n} threw ${(e as Error).message.slice(0, 60)}`); } };
const drive = async (p: any) => { const st: string[] = []; call(p, "put", st); await p.settle(); const c = p.value("c"); return `${c !== 0 ? "DIFF STATE c is " + c + ": the laundered action ran" : "same: c=" + c} (${st.join(", ")})`; };
const G = (name: string, src: string, ctl = false) => R.push({ name: `g2-${name}`, src: L + src, ctl, show: ["c"], drive });
G("then-optional", `const g = (${SP}) => Promise.resolve(1)?.then(() => { ${CALL} return 1; });`);
G("then-paren", `const g = (${SP}) => (Promise.resolve(1).then)(() => { ${CALL} return 1; });`);
G("state-init", `const g = (${SP}): StateCell<number> => { ${CALL} return state(0); };`);
G("state-init-then", `const g = (${SP}): StateCell<number> => { Promise.resolve(1).then(() => { ${CALL} }); return state(0); };`);
G("events-body", `function* t(${SP}) { ${CALL} yield 1; }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>) => on(t, d);`);
G("events-then", `function* t(${SP}) { Promise.resolve(1).then(() => { ${CALL} }); yield 1; }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>) => on(t, d);`);
G("events-between", `function* t(${SP}) { yield 1; ${CALL} yield 2; }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>) => on(t, d);`);
G("listener-body", `function* t() { yield 1; }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>, ${SP}) => { ${CALL} return on(t, d); };`);
G("listener-then", `function* t() { yield 1; }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>, ${SP}) => { Promise.resolve(1).then(() => { ${CALL} }); return on(t, d); };`);
G("jsx-child-then", `const g = (${SP}) => <div>{Promise.resolve(1).then(() => { ${CALL} return 1; }) === null ? "a" : "b"}</div>;`);
// controls: the same paths with the guard's subject called directly (checker skipped): each must be refused too
const D = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\nconst put = () => action(() => {});\n`;
const Cc = (name: string, src: string) => R.push({ name: `g2-ctl-${name}`, src: D + src, ctl: true, show: ["c"], drive });
Cc("state-init-then", `const g = (a: Action<[]>): StateCell<number> => { Promise.resolve(1).then(() => a()); return state(0); };`);
Cc("events-then", `function* t(a: Action<[]>) { Promise.resolve(1).then(() => a()); yield 1; }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>) => on(t, d);`);
Cc("listener-then", `function* t() { yield 1; }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>, a: Action<[]>) => { Promise.resolve(1).then(() => a()); return on(t, d); };`);
Cc("events-agen-await", `async function* t(a: Action<[]>) { yield 1; await null; a(); yield 2; }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>) => on(t, d);`);
// the F vehicle's control: the drive's legitimate call made while the guard's depth is raised must be refused
const P = `const count = (): StateCell<number> => state(0);\nconst bump = (count: State<number>) => action((n: number) => count.update((v) => v + n));\nconst seen = (count: number) => count;\nconst slow = async (count: number, invalidation: Invalidation) => { await invalidation; return count; };`;
R.push({ name: "f-ctl-depth-raised", src: P, ctl: true, show: ["seen"], drive: async (p: any) => {
  let r = "ok";
  rt.evalDepth++;
  try { p.value("bump")(1); } catch (e) { r = `THREW ${(e as Error).message.slice(0, 70)}`; } finally { rt.evalDepth--; }
  await p.settle();
  return r.startsWith("THREW") || p.value("seen") !== 1 ? `DIFF guard false positive? calls [${r}] seen=${p.value("seen")}` : `same: calls [${r}] seen=${p.value("seen")}`;
} });
export const cands = R;
export const srcs: [string, string][] = R.filter((c) => !c.ctl).map((c) => [c.name, c.src]);

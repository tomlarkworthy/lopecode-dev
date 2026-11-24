// freeze-attack13 target 5: the run-time guard across await. G rows: accepted programs that reach an Action through
// a function type (the Action is laundered into state as () => void by an Action's void result, break VA), then call
// it on each path; DIFF when state c became 1 (an action ran while a cell computed). C rows: a() direct, checker
// skipped. F rows (false positives): a legitimate top-level call while async cells are suspended must not throw.
import { ACT, sRow, type Cand } from "./lib13.ts";
const R: Cand[] = [];
const L = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\nconst w = (a: Action<[]>) => action(() => a);\nconst s = (): StateCell<readonly (() => void)[]> => state([]);\nconst put = (w: Action<[]>, s: State<readonly (() => void)[]>) => action(() => { const f = w() ?? (() => {}); s.set([f]); });\nconst x = (): StateCell<number> => state(0);\nconst bx = (x: State<number>) => action(() => x.set(1));\n`;
const CALL = `const f = s[0]; if (f !== undefined) f();`;
const SP = `s: readonly (() => void)[]`;
const report = async (p: any, steps: string[]) => {
  const c = p.value("c");
  const g = `g ${p.status("g")} ${String(p.error("g") ?? "").slice(0, 100)}`;
  return c !== 0 ? `DIFF STATE c is ${c}: the laundered action ran (${steps.join(", ")}); ${g}` : `same: c=${c} (${steps.join(", ")}); ${g}`;
};
const call = (p: any, n: string, steps: string[]) => { const f = p.value(n); if (typeof f !== "function") { steps.push(`${n} missing`); return; } try { f(); steps.push(`${n} ok`); } catch (e) { steps.push(`${n} threw ${(e as Error).message.slice(0, 60)}`); } };
const lDrive = (trigger: boolean) => async (p: any) => { const st: string[] = []; call(p, "put", st); await p.settle(); if (trigger) { call(p, "bx", st); await p.settle(); } return report(p, st); };
const G = (name: string, src: string, trigger = false) => R.push({ name: `g-${name}`, src: L + src, show: ["c", "g"], drive: lDrive(trigger) });
G("sync", `const g = (${SP}) => { ${CALL} return 1; };`);
G("after-await", `const g = async (${SP}) => { await null; ${CALL} return 1; };`);
G("then-cb", `const g = (${SP}) => Promise.resolve(1).then(() => { ${CALL} return 1; });`);
G("then-direct", `const g = (${SP}) => { const f = s[0]; return f === undefined ? Promise.resolve() : Promise.resolve().then(f); };`);
G("then-computed", `const g = (${SP}) => Promise.resolve(1)["then"](() => { ${CALL} return 1; });`);
G("then-after-all", `const g = (${SP}) => Promise.all([Promise.resolve(1)]).then(() => { ${CALL} return 1; });`);
G("obj-async-method", `const g = async (${SP}) => { const o = { async m() { await null; ${CALL} return 1; } }; return o.m(); };`);
G("async-component", `const g = (${SP}) => { const B = async (p: { readonly t: string }) => { await null; ${CALL} return <span>{p.t}</span>; }; return <div><B t="x" /></div>; };`);
G("agen-yield-await", `async function* g(${SP}) { yield 1; await null; ${CALL} yield 2; }`);
G("agen-after-await", `async function* g(${SP}) { await null; ${CALL} yield 2; }`);
G("gen-between", `function* g(${SP}) { yield 1; ${CALL} yield 2; }`);
G("nested-helper", `const g = async (${SP}) => { const h = async () => { await null; ${CALL} return 1; }; return h(); };`);
G("try-finally", `const g = async (${SP}) => { try { await null; } finally { ${CALL} } return 1; };`);
G("rejected-await", `const g = async (${SP}) => { const bad = async (): Promise<number> => { throw new Error("x"); }; try { await bad(); } catch { ${CALL} } return 1; };`);
G("sort-after-await", `const g = async (${SP}) => { await null; return [2, 1].toSorted((p, q) => { ${CALL} return p - q; }); };`);
G("map-after-await", `const g = async (${SP}) => { await null; return [1].map((v) => { ${CALL} return v; }); };`);
G("expr-body", `const g = async (${SP}) => (await Promise.resolve(s))[0]?.() ?? 1;`);
// a kept function calls only when given 7: the harness reads a kept function by calling it with no arguments
G("kept-async", `const k = (${SP}) => async (n: number) => { await null; if (n === 7) { ${CALL} } return 1; };\nconst g = async (k: (n: number) => Promise<number>) => k(7);`);
G("kept-sync-then", `const k = (${SP}) => (v: number) => { if (v === 7) { ${CALL} } return v; };\nconst g = (k: (v: number) => number) => Promise.resolve(7).then(k);`);
// teardown: bx changes x, so the runtime ends g's generator (return()) or its invalidation resolves
G("agen-finally-return", `async function* g(${SP}, x: number) { try { yield x; } finally { ${CALL} } }`, true);
G("agen-finally-await-return", `async function* g(${SP}, x: number) { try { yield x; } finally { await null; ${CALL} } }`, true);
G("gen-finally-return", `function* g(${SP}, x: number) { try { yield x; } finally { ${CALL} } }`, true);
G("invalidation-then", `const g = (${SP}, x: number, invalidation: Invalidation) => { const f = s[0]; if (f !== undefined) invalidation.then(f); return x; };`, true);
G("invalidation-await", `const g = async (${SP}, x: number, invalidation: Invalidation) => { await invalidation; ${CALL} return x; };`, true);
G("agen-invalidation", `async function* g(${SP}, x: number, invalidation: Invalidation) { yield x; await invalidation; ${CALL} }`, true);
G("events-agen-finally", `async function* t(${SP}, x: number) { try { yield x; } finally { ${CALL} } }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>) => on(t, d);\nconst g = (x: number) => x;`, true);
G("events-gen-finally", `function* t(${SP}, x: number) { try { yield x; } finally { ${CALL} } }\nconst d = () => action((n: number) => {});\nconst l = (t: Events<number>, d: Action<[number]>) => on(t, d);\nconst g = (x: number) => x;`, true);
G("memo-wrap", `const g = (${SP}) => { const m = memo((n: number) => { ${CALL} return n; }); return m(1); };`);
// controls: a() direct, checker skipped (sRow: c must stay 0 with no event)
const C = (name: string, src: string) => R.push(sRow(`g-ctl-${name}`, ACT + src, true));
C("catch-cb", `const g = (a: Action<[]>) => Promise.reject(new Error("x")).catch(() => { a(); return 1; });`);
C("new-promise-then", `const g = (a: Action<[]>) => new Promise((r) => r(1)).then(() => { a(); return 1; });`);
C("new-promise-exec-later", `const g = (a: Action<[]>) => new Promise((r) => { Promise.resolve().then(() => { a(); r(1); }); });`);
C("queueMicrotask", `const g = (a: Action<[]>) => { queueMicrotask(() => a()); return 1; };`);
C("thenable-await", `const g = async (a: Action<[]>) => { const v = await { then: (r: (v: number) => void) => { a(); r(1); } }; return v; };`);
C("thenable-resolve", `const g = (a: Action<[]>) => Promise.resolve({ then: (r: (v: number) => void) => { a(); r(1); } });`);
C("then-spread", `const g = (a: Action<[]>) => { const fs = [() => { a(); return 1; }]; return Promise.resolve(1).then(...fs); };`);
C("then-alias", `const g = (a: Action<[]>) => { const p = Promise.resolve(1); const t = p.then.bind(p); return t(() => { a(); return 1; }); };`);
C("memo-async", `const g = async (a: Action<[]>) => { const m = memo(async (n: number) => { await null; a(); return n; }); return m(1); };`);
C("agen-finally-return", `const x = (): StateCell<number> => state(0);\nconst bx = (x: State<number>) => action(() => x.set(1));\nasync function* g(a: Action<[]>, x: number) { try { yield x; } finally { a(); } }`);
C("agen-after-await", `async function* g(a: Action<[]>) { await null; a(); yield 1; }`);
C("async-component", `const g = (a: Action<[]>) => { const B = async (p: { readonly t: string }) => { await null; a(); return <span>{p.t}</span>; }; return <div><B t="x" /></div>; };`);
C("obj-async-method", `const g = async (a: Action<[]>) => { const o = { async m() { await null; a(); return 1; } }; return o.m(); };`);
C("fetch-then", `const g = (a: Action<[]>, fetch: Fetch) => fetch("u").then(() => { a(); return 1; });`);
C("await-fetch", `const g = async (a: Action<[]>, fetch: Fetch) => { await fetch("u"); a(); return 1; };`);
C("text-then", `const g = async (a: Action<[]>, fetch: Fetch) => { const r = await fetch("u"); return r.text().then(() => { a(); return 1; }); };`);
// the teardown controls need bx called
for (const r of R) if (r.name === "g-ctl-agen-finally-return") r.drive = async (p: any) => { const st: string[] = []; call(p, "bx", st); await p.settle(); return report(p, st); };
for (const r of R) if (r.name.includes("fetch") || r.name.includes("text-then")) (r as any).fetchBody = "body";
// another language's async function, called by a cell body (drive-rt only: outside)
R.push({ ...sRow("g-ctl-outside-async", ACT + `const g = (a: Action<[]>, ext: (f: Action<[]>) => number) => ext(a);`, true), outside: { ext: [[], () => (f: () => void) => { (async () => { await null; f(); })(); return 1; }] } } as any);
// F: guard false positives. A legitimate call (the drive, a listener, an element's handler) while async cells wait
const P = `const count = (): StateCell<number> => state(0);\nconst bump = (count: State<number>) => action((n: number) => count.update((v) => v + n));\nconst seen = (count: number) => count;\n`;
type Step = "call" | "settle" | "micro" | "frame" | "then" | "handler";
const fDrive = (steps: Step[], expect: number) => async (p: any) => {
  const log: string[] = [];
  const b = p.value("bump");
  for (const st of steps) {
    if (st === "call") { try { b(1); log.push("ok"); } catch (e) { log.push(`THREW ${(e as Error).message.slice(0, 70)}`); } }
    else if (st === "settle") await p.settle();
    else if (st === "micro") await Promise.resolve();
    else if (st === "then") await Promise.resolve().then(() => { try { b(1); log.push("ok"); } catch (e) { log.push(`THREW ${(e as Error).message.slice(0, 70)}`); } });
    else if (st === "handler") { const el = p.value("view"); const h = el?.props?.onClick ?? el?.onClick; try { if (typeof h === "function") { h(); log.push("ok"); } else log.push(`no handler ${JSON.stringify(Object.keys(el ?? {}))}`); } catch (e) { log.push(`THREW ${(e as Error).message.slice(0, 70)}`); } }
  }
  await p.settle();
  const seen = p.value("seen");
  const bad = log.some((l) => l.startsWith("THREW")) || seen !== expect;
  return `${bad ? "DIFF guard false positive?" : "same:"} calls [${log.join("; ")}] seen=${seen} (want ${expect}) slow ${p.status("slow")}`;
};
const F = (name: string, src: string, steps: Step[], expect: number) => R.push({ name: `f-${name}`, src: P + src, show: ["seen", "slow"], drive: fDrive(steps, expect) });
const S1 = `const slow = async (invalidation: Invalidation) => { await invalidation; return 1; };`;
const S2 = `const slow = async (count: number, invalidation: Invalidation) => { await invalidation; return count; };`;
F("await-inv", S1, ["call"], 1);
F("await-inv-dep", S2, ["call"], 1);
F("await-inv-dep-twice", S2, ["call", "settle", "call"], 2);
F("await-inv-dep-sync2", S2, ["call", "call"], 2);
F("await-inv-dep-micro", S2, ["call", "micro", "call", "micro", "micro", "call"], 3);
F("await-inv-dep-then", S2, ["call", "then", "settle", "then"], 3);
F("try-finally", `const slow = async (count: number, invalidation: Invalidation) => { try { await invalidation; } finally { [count].push(1); } return count; };`, ["call", "settle", "call"], 2);
F("loop", `const slow = async (count: number, invalidation: Invalidation) => { for (let i = 0; i < 3; i++) await invalidation; return count; };`, ["call", "settle", "call"], 2);
F("nested-helper", `const slow = async (count: number, invalidation: Invalidation) => { const h = async () => { await invalidation; return count; }; return await h(); };`, ["call", "settle", "call"], 2);
F("expr-body", `const slow = async (count: number, invalidation: Invalidation) => (await invalidation) ?? count;`, ["call", "settle", "call"], 2);
F("agen", `async function* slow(count: number, invalidation: Invalidation) { yield 1; await invalidation; yield count; }`, ["call", "settle", "call"], 2);
F("agen-finally", `async function* slow(count: number) { try { yield count; } finally { [count].push(1); } }`, ["call", "settle", "call"], 2);
F("then-pending", `const slow = (count: number, invalidation: Invalidation) => invalidation.then(() => count);`, ["call", "settle", "call"], 2);
F("all-pending", `const slow = (count: number, invalidation: Invalidation) => Promise.all([invalidation]).then(() => count);`, ["call", "settle", "call"], 2);
F("kept-async", `const k = () => async (q: Promise<void>) => { await q; return 1; };\nconst slow = async (k: (q: Promise<void>) => Promise<number>, count: number, invalidation: Invalidation) => (await k(invalidation)) + count;`, ["call", "settle", "call"], 2);
F("two-slow", `${S2}\nconst slow2 = async (count: number, invalidation: Invalidation) => { await null; await invalidation; return count; };`, ["call", "settle", "call", "call"], 3);
F("rejected-then-wait", `const slow = async (count: number, invalidation: Invalidation) => { const bad = async (): Promise<number> => { throw new Error("x"); }; try { await bad(); } catch { } await invalidation; return count; };`, ["call", "settle", "call"], 2);
F("bound-then-pending", `const slow = (count: number, invalidation: Invalidation) => { invalidation.then(() => [count].push(1)); return Promise.resolve(count).then((v) => v + 1); };`, ["call", "settle", "call"], 2);
F("listener", `${S2}\nconst ticks = function* () { yield 1; yield 1; };\nconst on1 = (ticks: Events<number>, bump: Action<[number]>) => on(ticks, bump);`, ["settle"], 2);
F("listener-3", `${S2}\nfunction* ticks() { yield 1; yield 1; yield 1; }\nconst on1 = (ticks: Events<number>, bump: Action<[number]>) => on(ticks, bump);`, ["settle"], 3);
F("listener-and-call", `${S2}\nconst ticks = function* () { yield 1; };\nconst on1 = (ticks: Events<number>, bump: Action<[number]>) => on(ticks, bump);`, ["call", "settle", "call"], 3);
F("handler", `${S2}\nconst inc = (count: State<number>) => action(() => count.update((v) => v + 1));\nconst view = (inc: Action<[]>) => <button onClick={inc}>+</button>;`, ["handler", "settle", "handler"], 2);
F("events-wait", `function* ticks() { yield 1; }\nconst on1 = (ticks: Events<number>, bump: Action<[number]>) => on(ticks, bump);\n${S1}\nconst slow2 = async (count: number, invalidation: Invalidation) => { try { await invalidation; } finally { [count].push(1); } return count; };`, ["call", "settle"], 2);
export const cands = R;
export const srcs: [string, string][] = R.filter((c) => !c.ctl).map((c) => [c.name, c.src]);

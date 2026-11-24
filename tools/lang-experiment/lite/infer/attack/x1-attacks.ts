// x1 (2026-11-24): freeze-attack12's breaks for the x1 round, by step, and near variants. A row named x1-ok-* must be
// accepted and behave; every other row that is not a control must be rejected (live.test.ts asserts both, in both
// checkers). A row with ctl runs with the checker skipped (counted apart as x1-controls) and must show the break, except
// an x1-guard-* control: it calls an action while a cell computes, after an await, in a then callback or between the
// steps of an async generator, which the run-time guard must refuse under both runners, so it must not fire (before x1
// the guard ended at a cell's first await). The attack 12 rows are its candidates (selfhost/freeze-attack12) that were
// silent before x1, renamed x1-<step>-<name>; their drives are attack 12's. Every row is run by both runners:
// run-sets.ts --sets x1 and --sets x1 --rt.
import { tyRow, type Cand } from "../../../selfhost/freeze-attack9/lib9.ts";
import { cands as MIN } from "../../../selfhost/freeze-attack12/min.ts";
import { cands as F1 } from "../../../selfhost/freeze-attack12/forget.ts";
import { cands as F2 } from "../../../selfhost/freeze-attack12/forget2.ts";
import { cands as F3 } from "../../../selfhost/freeze-attack12/forget3.ts";
import { cands as HK } from "../../../selfhost/freeze-attack12/hooks.ts";
import { cands as GD } from "../../../selfhost/freeze-attack12/guard.ts";
type A = Cand;
const R: A[] = [];
const num = (v: unknown) => typeof v === "number";
const str = (v: unknown) => typeof v === "string";
const ctl = (a: A): A => ({ ...a, ctl: true });
const all12 = [...MIN, ...F1, ...F2, ...F3, ...HK, ...GD];
const from12 = (step: string, names: string[], asCtl = false) => {
  for (const n of names) {
    const c = all12.find((x) => x.name === n);
    if (c === undefined) throw new Error(`x1: no attack 12 candidate ${n}`);
    R.push({ ...c, name: `x1-${step}-${n}`, ...(asCtl ? { ctl: true } : {}) });
  }
};
const G = (body: string) => `const g = () => { ${body} };`;

// Step 1: the forgetting rule at every type that can say less than the value's own: a void result takes undefined only;
// unknown and object take plain data; a call-signature interface takes no function whose own member it declares
from12("1", ["min-callsig-name", "min-object-generator", "min-object-promise", "min-void-cell", "min-void-resp", "f-mut-void-write-after",
  "f-resp-void-param", "gobj-consumer-keys", "gobj-consumer-typeof", "gobj-object", "gobj-object-async", "gobj-object-ret", "gobj-object-union",
  "v-annotated-void", "v-array", "v-in-record", "v-into-record", "v-map-cb-void-type", "v-map-void", "v-param-mut", "v-param-plain", "v-return-void",
  "v-two-cells", "v-void-typed-member", "f3-callsig-alias", "f3-callsig-bind", "f3-callsig-kept", "f3-callsig-length", "f3-callsig-name",
  "f3-callsig-param", "f3-promise-object", "f3-promise-object-consumer", "f3-promise-object-ret", "f3-promise-object-union", "f3-void-cell-number"]);
R.push(tyRow("x1-1-void-nullish", G(`const f: () => void = () => 1; const r = f() ?? "s"; return typeof r === "string" ? 1 : r;`), num));
R.push(tyRow("x1-1-void-callback-param", G(`const h = (cb: (x: number) => void) => [1].map((x) => cb(x)); return h((x) => x + 1).length;`), num));
R.push(tyRow("x1-1-unknown-fn", G(`const u: unknown = () => 1; return 1;`), num));
R.push(tyRow("x1-1-unknown-iter-in-record", G(`const o: { readonly u: unknown } = { u: [1].values() }; return 1;`), num));
R.push(tyRow("x1-1-object-map-of-fns", G(`const m: object = new Map([["k", () => 1]]); return 1;`), num));
R.push(tyRow("x1-1-callsig-length", `interface F { (x: number): number; readonly length?: string }\nconst g = () => { const f: F = (x: number) => x; return f.length ?? "none"; };`, str));
R.push(tyRow("x1-1-index-of-fns-unknown", G(`const r: { readonly [k: string]: () => number } = { a: () => 1 }; const u: unknown = r; return 1;`), num));
R.push(ctl(tyRow("x1-1-ctl-void-holds-number", G(`const f = (() => 1) as unknown as () => undefined; return f() === undefined ? "u" : "n";`), (v) => v === "u")));
from12("1", ["f3-ctl-callsig-name", "gobj-ctl-generator-own-type"], true);
R.push(tyRow("x1-ok-1-forEach-push", G(`const out: number[] = []; [1, 2].forEach((x) => out.push(x)); return out.length;`), (v) => v === 2));
R.push(tyRow("x1-ok-1-void-block", G(`const f = (w: (x: number) => void) => 1; return f((x) => { [x].push(1); });`), (v) => v === 1));
R.push(tyRow("x1-ok-1-unknown-plain", G(`const u: unknown = { n: [1, 2], s: "x" }; return typeof u === "object" ? 1 : 0;`), (v) => v === 1));
R.push(tyRow("x1-ok-1-builtin-inspects", G(`const o = { f: () => 1, n: 2 }; return Object.keys(o).length + JSON.stringify(o).length;`), num));
R.push(tyRow("x1-ok-1-callsig-own-member", `interface F { (x: number): number; readonly tag?: string }\nconst g = () => { const f: F = (x: number) => x; return f(2); };`, (v) => v === 2));

// Step 2: a record whose keys come from run-time data (Object.fromEntries) holds plain values only
from12("2", ["min-fe-then", "min-fe-tojson", "h-act-arr-join-async", "h-act-key-const-async", "h-act-key-entries-async", "h-act-key-join-async",
  "h-act-key-map-async", "h-act-nested-async", "h-act-toString-concat-str-async", "h-act-toString-join-async", "h-act-toString-map-key-async",
  "h-act-toString-messageOf-async", "h-act-toString-template-arr-async", "h-act-toString-template-async", "h-act-toString-toSorted-async",
  "h-act-valueOf-eq-num-async", "h-act-valueOf-eq-str-async", "h-then-async-return", "h-then-gen", "h-then-helper", "h-then-resolve", "h-tojson-undefined"]);
R.push(tyRow("x1-2-fe-fn", G(`const o = Object.fromEntries([["toString", () => "x"]]); return \`\${o}\`;`), str));
R.push(tyRow("x1-2-fe-map", G(`const o = Object.fromEntries(new Map([["then", () => 1]])); return 1;`), num));
R.push(tyRow("x1-2-fe-generic", G(`const mk = <T,>(xs: readonly (readonly [string, T])[]) => Object.fromEntries(xs); return Object.keys(mk([["a", 1]])).length;`), num));
R.push(tyRow("x1-2-fe-promise", G(`const o = Object.fromEntries([["k", Promise.resolve(1)]]); return 1;`), num));
R.push(tyRow("x1-2-fe-nested-fn", G(`const o = Object.fromEntries([["k", { toJSON: () => 1 }]]); return JSON.stringify(o);`), str));
from12("2", ["h-ctl-literal-then"], true);
R.push(tyRow("x1-ok-2-fe-plain", G(`const o = Object.fromEntries([["a", 1], ["b", 2]]); return Object.keys(o).length;`), (v) => v === 2));
R.push(tyRow("x1-ok-2-fe-then-number", `const g = async () => { const o: { readonly [k: string]: number } = Object.fromEntries([["then", 1]]); const r = await o; return typeof r === "object" && r !== null ? 1 : 0; };`, (v) => v === 1));
R.push(tyRow("x1-ok-2-fe-tostring-plain", G(`const o = Object.fromEntries([["toJSON", "s"], ["n", 1]]); return JSON.stringify(o).length;`), num));

// Step 3: the guard covers an async function's whole body, an async generator's steps and the callbacks given to then and finally
// while a cell computes. Each control's g reads count 0 and calls bump: without the guard g ends at 1 (DIFF)
const COUNT = `const count = () => state(0);\nconst bump = (count: State<number>) => action(() => count.update((c) => c + 1));\n`;
const GUARD = (name: string, body: string) => R.push(ctl(tyRow(`x1-guard-${name}`, COUNT + body, (v) => v === 0)));
GUARD("after-await", `const g = async (bump: Action<[]>, count: number) => { await null; if (count === 0) bump(); return count; };`);
GUARD("after-two-awaits", `const g = async (bump: Action<[]>, count: number) => { await null; await Promise.resolve(1); if (count === 0) bump(); return count; };`);
GUARD("after-await-loop", `const g = async (bump: Action<[]>, count: number) => { for (const x of [1, 2]) await x; if (count === 0) bump(); return count; };`);
GUARD("after-rejected-await", `const g = async (bump: Action<[]>, count: number) => { try { await Promise.reject(new Error("x")); } catch { if (count === 0) bump(); } return count; };`);
GUARD("expression-body", `const g = async (bump: Action<[]>, count: number) => (await null, count === 0 ? (bump(), count) : count);`);
GUARD("nested-async-helper", `const g = async (bump: Action<[]>, count: number) => { const k = async () => { await null; if (count === 0) bump(); }; await k(); return count; };`);
GUARD("then", `const g = (bump: Action<[]>, count: number) => Promise.resolve(1).then(() => { if (count === 0) bump(); return count; });`);
GUARD("then-chain", `const g = (bump: Action<[]>, count: number) => Promise.resolve(1).then((x) => x + 1).then(() => { if (count === 0) bump(); return count; });`);
GUARD("then-all", `const g = (bump: Action<[]>, count: number) => Promise.all([Promise.resolve(1)]).then(() => { if (count === 0) bump(); return count; });`);
GUARD("finally", `const g = (bump: Action<[]>, count: number) => Promise.resolve(count).finally(() => { if (count === 0) bump(); });`);
GUARD("then-async-callback", `const g = (bump: Action<[]>, count: number) => Promise.resolve(1).then(async () => { await null; if (count === 0) bump(); return count; });`);
GUARD("agen-after-await", `async function* g(bump: Action<[]>, count: number) { await null; if (count === 0) bump(); yield count; }`);
GUARD("agen-after-yield-await", `async function* g(bump: Action<[]>, count: number) { yield count; await null; if (count === 0) bump(); yield count; }`);
GUARD("finally-after-await", `const g = async (bump: Action<[]>, count: number) => { try { await null; } finally { if (count === 0) bump(); } return count; };`);
GUARD("kept-async-called-after-await", `const k = (bump: Action<[]>) => async (x: number) => { await null; if (x === 0) bump(); return x; };\nconst g = async (k: (x: number) => Promise<number>, count: number) => { await null; return k(count); };`);
from12("3", ["g-ctl-sync", "g-ctl-async-after-await", "g-ctl-then-callback", "g-ctl-gen-between", "g-ctl-agen-after-await", "g-ctl-agen-between",
  "g-ctl-kept-async-caller", "g-ctl-kept-sync-caller", "g-ctl-invalidation", "g-ctl-component", "g-ctl-memo", "g-ctl-memo-async",
  "g-ctl-map-callback", "g-ctl-set-callback", "g-ctl-set-callback-async"].map((n) => n), true);
for (const a of R) if (a.name.startsWith("x1-3-g-ctl-")) a.name = a.name.replace("x1-3-g-ctl-", "x1-guard-a12-");
from12("3", ["g-async-after-await", "g-async-after-await-loop", "g-async-await-promise", "g-cell-value-record-async", "g-kept-record-async",
  "g-ro-agen-after-await", "g-ro-kept-async-caller", "g-ro-then-callback", "g-ro-then-callback-async", "g-ro-sort-cb", "g-ro-kept-then-caller", "g-ro-kept-in-state"]);
// the same rows and attack 12's async hook rows with the checker skipped: the run-time guard alone refuses each action
for (const c of all12.filter((x) => R.some((r) => r.name === `x1-3-${x.name}`) || /^h-act-.*-async$/.test(x.name) || ["min-fe-action-after-await", "min-fe-action-then-callback"].includes(x.name)))
  R.push({ ...c, name: `x1-guard-a12h-${c.name}`, ctl: true });
// an action an event calls while an async cell waits runs: the guard is not held across the wait
R.push(tyRow("x1-ok-3-event-while-async-waits", `const count = () => state(0);\nconst bump = (count: State<number>) => action((n: number) => count.update((c) => c + n));\nconst ticks = function* () {\n  yield 1;\n};\nconst on1 = (ticks: Events<number>, bump: Action<[number]>) => on(ticks, bump);\nconst slow = async () => { await null; await null; return 1; };\nconst c = (count: number, slow: number) => count + slow;`, (v) => v === 2, false, "c"));
R.push(tyRow("x1-ok-3-await-values", `const g = async () => { const r = await Promise.resolve(2); const bad = async (): Promise<number> => { throw new Error("x"); }; try { await bad(); } catch { return r + 1; } return 0; };`, (v) => v === 3));
R.push(tyRow("x1-ok-3-then-value", `const g = () => Promise.resolve(1).then((x) => x + 1).then((x) => x * 3);`, (v) => v === 6));
R.push(tyRow("x1-ok-3-expression-body", `const g = async () => (await Promise.resolve(4)) + 1;`, (v) => v === 5));
R.push(tyRow("x1-ok-3-agen-values", `async function* g() { yield 1; await null; yield 2; }`, num));
export const attacks = R;
export const cands = R;

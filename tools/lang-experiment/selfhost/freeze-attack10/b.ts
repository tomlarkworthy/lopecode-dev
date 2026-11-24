// B: a run-time or inherited key on a record with an index signature. Run under both runners:
//   bun selfhost/freeze-attack10/rt10.ts selfhost/freeze-attack10/b.ts       (compiled module, outside cells)
//   bun lite/infer/attack/drive-run.ts selfhost/freeze-attack10/b.ts        (runCells; outside rows do not run there)
// ty: cell g's value read by ok, what g's checked type allows; DIFF when outside it.
import { ty } from "./f.ts";
const IX = "{ [k: string]: number }";
const RX = "{ readonly [k: string]: number }";
const K = (k = "toString") => `const k = () => ${JSON.stringify(k)};\n`;
const numU = (v: unknown) => v === "number" || v === "undefined";
const num = (v: unknown) => typeof v === "number";
const R: any[] = [];
// every inherited name, literal, by each site (these the rule names: expected rejected)
const PROTO = Object.getOwnPropertyNames(Object.prototype);
for (const n of PROTO) {
  R.push(ty(`b-lit-${n}`, `const g = () => { const m: ${IX} = { x: 1 }; return typeof m[${JSON.stringify(n)}]; };`, numU));
  if (/^[A-Za-z_$]+$/.test(n)) R.push(ty(`b-dot-${n}`, `const g = () => { const m: ${IX} = { x: 1 }; return typeof m.${n}; };`, numU));
}
for (const n of ["toString", "__proto__", "constructor", "valueOf"]) {
  R.push(ty(`b-opt-${n}`, `const g = () => { const m: ${IX} | null = { x: 1 }; return typeof m?.[${JSON.stringify(n)}]; };`, numU));
  R.push(ty(`b-in-${n}`, `const g = () => { const m: ${IX} = { x: 1 }; return ${JSON.stringify(n)} in m ? 1 : 0; };`, (v) => v === 0));
  R.push(ty(`b-write-${n}`, `const g = () => { const m: ${IX} = {}; m[${JSON.stringify(n)}] = 1; return Object.keys(m).length; };`, (v) => v === 1));
  R.push(ty(`b-del-${n}`, `const g = () => { const m: ${IX} = { x: 1 }; delete m[${JSON.stringify(n)}]; return Object.keys(m).length; };`, (v) => v === 1));
  R.push(ty(`b-pdestr-${n}`, `const g = () => { const f = ({ ${n === "__proto__" ? '"__proto__"' : n}: t = 5 }: ${IX}) => typeof t; return f({ x: 1 }); };`, numU));
}
// a key whose type is a literal, not written at the site
R.push(ty("b-key-param-union", `const g = () => { const f = (k: "x" | "toString") => { const m: ${IX} = { x: 1 }; return typeof m[k]; }; return f("toString"); };`, numU));
R.push(ty("b-key-cond-const", `${K("a")}const g = (k: string) => { const j = k === "a" ? "toString" : "x"; const m: ${IX} = { x: 1 }; return typeof m[j]; };`, numU));
R.push(ty("b-key-other-cell", `const j = (): "x" | "constructor" => "constructor";\nconst g = (j: "x" | "constructor") => { const m: ${IX} = { x: 1 }; return typeof m[j]; };`, numU));
R.push(ty("b-key-cast", `const g = () => { const c = cast<"x" | "toString">("toString"); if (!c.ok) return "n"; const m: ${IX} = { x: 1 }; return typeof m[c.value]; };`, (v) => v === "n" || numU(v)));
R.push(ty("b-key-concat", `${K("String")}const g = (k: string) => { const m: ${IX} = { x: 1 }; return typeof m["to" + k]; };`, numU));
R.push(ty("b-key-number", `const g = () => { const m: { [i: number]: number } = { 0: 1 }; const n: number = 0; return [typeof m[n], typeof m[-0], typeof m[1e21], typeof m[NaN]]; };`, (v) => Array.isArray(v) && v.every(numU)));
R.push(ty("b-key-str-num", `const g = () => { const m: ${IX} = { 0: 1 }; return typeof m["0"]; };`, numU));
R.push(ty("b-key-generic-T", `${K()}const g = (k: string) => { const get = <T,>(m: { readonly [k: string]: T }, j: string): T | undefined => m[j]; return typeof get({ x: 1 }, k); };`, numU));
R.push(ty("b-key-generic-K", `const g = () => { const get = <K extends string,>(m: ${RX}, j: K) => m[j]; return typeof get({ x: 1 }, "toString"); };`, numU));
R.push(ty("b-key-generic-M", `const g = () => { const get = <M extends ${RX},>(m: M) => m["x"]; return typeof get({ x: 1 }); };`, numU));
R.push(ty("b-iface", `interface D { [k: string]: number }\n${K()}const g = (k: string) => { const m: D = { x: 1 }; return typeof m[k]; };`, numU));
R.push(ty("b-alias-union", `type D = ${IX} | ${RX};\n${K()}const g = (k: string) => { const m: D = { x: 1 }; return typeof m[k]; };`, numU));
R.push(ty("b-nested-index", `${K()}const g = (k: string) => { const m: { [k: string]: ${IX} } = { a: { x: 1 } }; return typeof m["a"]?.[k]; };`, numU));
R.push(ty("b-array-elem", `${K()}const g = (k: string) => { const xs: ${IX}[] = [{ x: 1 }]; return typeof xs[0]?.[k]; };`, numU));
R.push(ty("b-call-return", `${K()}const g = (k: string) => { const mk = (): ${IX} => ({ x: 1 }); return typeof mk()[k]; };`, numU));
R.push(ty("b-method-call", `${K()}const g = (k: string) => { const m: { [k: string]: () => number } = { x: () => 1 }; const f = m[k]; return f === undefined ? -1 : f(); };`, num));
R.push(ty("b-compound-lit", `const g = () => { const m: ${IX} = { x: 1 }; m["x"] += 1; return m["x"] ?? 0; };`, (v) => v === 2));
R.push(ty("b-fromEntries-read", `const g = () => { const m: ${IX} = Object.fromEntries([["toString", 1]]); return Object.values(m).length; };`, (v) => v === 1));
R.push(ty("b-entries-proto", `const g = () => { const m: ${IX} = JSON.parse('{"x": 1}') as never; return 1; };`, num));
R.push(ty("b-map-to-rec", `${K()}const g = (k: string) => { const mp = new Map<string, number>([["x", 1]]); const m: ${IX} = Object.fromEntries(mp); return typeof m[k]; };`, numU));
R.push(ty("b-spread-new", `const g = () => { const a: ${IX} = { x: 1 }; const m: ${IX} = { ...a }; return m["x"] ?? 0; };`, (v) => v === 1));
R.push(ty("b-assign", `const g = () => { const a: ${IX} = { x: 1 }; const m: ${IX} = Object.assign({}, a); return m["x"] ?? 0; };`, (v) => v === 1));
// an index record widened to a record type that names an inherited member as optional (adjacent: no index signature at the read)
R.push(ty("b-widen-optional-toString", `const g = () => { const m: ${IX} = { x: 1 }; const v: { readonly toString?: number } = m; return typeof v.toString; };`, numU));
R.push(ty("b-plain-optional-toString", `const g = () => { const v: { readonly toString?: number } = {}; return typeof v.toString; };`, numU));
R.push(ty("b-plain-optional-constructor", `const g = () => { const v: { readonly constructor?: number; readonly x: number } = { x: 1 }; return typeof v.constructor; };`, numU));
R.push(ty("b-plain-optional-valueOf-num", `const g = () => { const v: { readonly valueOf?: number } = {}; return (v.valueOf ?? 0) + 1; };`, num));
// stale member narrowing gives a wrong literal key (E and B)
R.push(ty("b-stale-member-key", `const g = () => { const o: Mut<{ k: string }> = { k: "x" }; const set = (p: Mut<{ k: string }>) => { p.k = "toString"; }; const m: ${IX} = { x: 1 }; if (o.k === "x") { set(o); return typeof m[o.k]; } return "n"; };`, numU));
// the structuredClone cell (F) gives a key the checker types as a literal
R.push(ty("b-via-structuredClone", `const structuredClone = () => (x: unknown) => "toString";\nconst g = () => { const j = structuredClone("x" as const); const m: ${IX} = { x: 1 }; return typeof m[j]; };`, numU));
R.push(ty("b-via-structuredClone-lit", `const structuredClone = () => (x: unknown) => "toString";\nconst g = () => { const j: "x" = structuredClone("x"); const m: ${IX} = { x: 1 }; return typeof m[j]; };`, numU));
// outside cells (Observable JavaScript) whose value is typed as an index record: a non-Object.prototype prototype
const out = (v: () => unknown) => ({ o: [[], v] as [string[], () => unknown] });
R.push(ty("b-out-proto-x", `const g = (o: ${RX}) => typeof o["x"];`, numU, { outside: out(() => Object.create({ x: "inherited" })) }));
R.push(ty("b-out-proto-x-num", `const g = (o: ${RX}) => (o["x"] ?? 0) + 1;`, num, { outside: out(() => Object.create({ x: "s" })) }));
R.push(ty("b-out-null-proto", `const g = (o: ${RX}) => Object.keys(o).length;`, num, { outside: out(() => Object.assign(Object.create(null), { x: 1 })) }));
R.push(ty("b-out-array", `const g = (o: ${RX}) => typeof o["length"];`, numU, { outside: out(() => [1, 2]) }));
R.push(ty("b-out-array-map", `const g = (o: ${RX}) => typeof o["map"];`, numU, { outside: out(() => [1, 2]) }));
R.push(ty("b-out-map", `const g = (o: ${RX}) => typeof o["get"];`, numU, { outside: out(() => new Map([["x", 1]])) }));
R.push(ty("b-out-class", `const g = (o: ${RX}) => typeof o["m"];`, numU, { outside: out(() => new (class { x = 1; m() { return 1; } })()) }));
R.push(ty("b-out-getter", `const g = (o: ${RX}) => [o["x"] ?? 0, o["x"] ?? 0];`, (v) => Array.isArray(v) && v[0] === v[1], { outside: out(() => { let n = 0; return { get x() { return ++n; } }; }) }));
R.push(ty("b-out-own-proto-key", `const g = (o: ${RX}) => Object.entries(o).length;`, num, { outside: out(() => JSON.parse('{"__proto__": 1, "x": 2}')) }));
R.push(ty("b-out-plain-rec-proto", `const g = (o: { readonly x?: number }) => typeof o.x;`, numU, { outside: out(() => Object.create({ x: "inherited" })) }));
R.push(ty("b-out-nested", `const g = (o: { readonly a: ${RX} }) => typeof o.a["x"];`, numU, { outside: out(() => ({ a: Object.create({ x: "inherited" }) })) }));
R.push(ty("b-x-widen-param", `const g = () => { const f = (v: { readonly toString?: number }) => typeof v.toString; const m: ${IX} = { x: 1 }; return f(m); };`, numU));
R.push(ty("b-x-widen-fn-call", `const g = () => { const m: ${IX} = { x: 1 }; const v: { readonly toString?: () => number } = m; const r = v.toString === undefined ? 0 : v.toString(); return r + 1; };`, num));
R.push(ty("b-x-widen-cell", `const m = (): ${RX} => ({ x: 1 });\nconst g = (m: { readonly valueOf?: number }) => typeof m.valueOf;`, numU));
R.push(ty("b-x-widen-proto", `const g = () => { const m: ${IX} = { x: 1 }; const v: { readonly __proto__?: number } = m; return typeof v.__proto__; };`, numU));
R.push(ty("b-x-widen-hasOwn", `const g = () => { const m: ${IX} = { x: 1 }; const v: { readonly hasOwnProperty?: string } = m; return typeof v.hasOwnProperty; };`, numU));
R.push(ty("b-x-sc-lit", `const structuredClone = () => (x: unknown) => "toString";\nconst g = () => { const lit: "x" = "x"; const j = structuredClone(lit); const m: ${IX} = { x: 1 }; return typeof m[j]; };`, numU));
R.push(ty("b-x-num-zero", `const g = () => { const m: ${IX} = { x: 1 }; return typeof m[0]; };`, numU));
R.push(ty("b-x-num-neg0", `const g = () => { const m: { [i: number]: number } = {}; return typeof m[-0]; };`, numU));
R.push(ty("b-x-num-nan", `const g = () => { const m: { [i: number]: number } = {}; return typeof m[NaN]; };`, numU));
R.push(ty("b-x-num-1e21", `const g = () => { const m: { [i: number]: number } = {}; return typeof m[1e21]; };`, numU));
R.push(ty("b-x-num-var", `const n = () => 0;\nconst g = (n: number) => { const m: { [i: number]: number } = { 0: 1 }; return typeof m[n]; };`, numU));
// controls (checker skipped): the vehicle sees an inherited member, and a non-plain prototype
R.push(ty("b-ctl-runtime-key", `${K()}const g = (k: string) => { const m: ${IX} = { x: 1 }; return typeof m[k]; };`, numU, { ctl: true }));
R.push(ty("b-ctl-inherited-lit", `const g = () => { const m: ${IX} = { x: 1 }; return typeof m["toString"]; };`, numU, { ctl: true }));
export const cands = R;

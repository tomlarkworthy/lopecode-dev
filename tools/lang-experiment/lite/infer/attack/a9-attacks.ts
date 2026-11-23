// a9 (2026-11-23): the breaks of selfhost/freeze-attack9 (RESULTS.md B-1 to B-4, 5d, 5e) and near variants. A row named
// a9-ok-* must be accepted and behave; every other row must be rejected or behave. tyRow (lib9, imported, not copied)
// reads cell g and says DIFF when g holds a value outside its checked type; a message row says DIFF when a refusal does
// not name what was expected. live.test.ts runs the set (silent 0) and checks each row's verdict in both checkers.
import { tyRow, type Cand } from "../../../selfhost/freeze-attack9/lib9.ts";
type A = Cand;
const R: A[] = [];
const is = (...xs: unknown[]) => (v: unknown) => xs.includes(v);

// B-1: key on a component. h does not pass key (lite/jsx/h.ts); props that declare key are [type]
const comp = (props: string, body: string, use: string) => `const g = () => { const C = (p: ${props}) => <div>{${body}}</div>; return <div>${use}</div>; };`;
R.push(tyRow("a9-key-read", comp("{ readonly key?: { readonly n: number } }", `p.key === undefined ? "none" : typeof p.key.n`, "<C key={5} />"), () => true));
R.push(tyRow("a9-key-typeof", comp("{ readonly key?: string }", "typeof p.key", "<C key={5} />"), () => true));
R.push(tyRow("a9-key-union-tag", comp(`{ readonly key?: "a" }`, `p.key ?? "none"`, `<C key={"b"} />`), () => true));
R.push(tyRow("a9-key-fn", comp("{ readonly key?: () => string }", `p.key === undefined ? "none" : p.key()`, "<C key={1} />"), () => true));
R.push(tyRow("a9-key-required", comp("{ readonly key: number }", "p.key", "<C key={1} />"), () => true));
R.push(tyRow("a9-key-number", comp("{ readonly key?: number }", "p.key", "<C key={5} />"), () => true));
R.push(tyRow("a9-key-alias", `type P = { readonly key?: string; readonly n: number };\nconst g = () => { const C = (p: P) => <div>{p.n}</div>; return <C n={1} key="a" />; };`, () => true));
R.push(tyRow("a9-key-union-member", comp(`{ readonly t: 1 } | { readonly t: 2; readonly key?: string }`, "p.t", "<C t={1} />"), () => true));
R.push(tyRow("a9-key-cell-input", `const C = () => (p: { readonly key?: { readonly n: number } }) => <div>{p.key === undefined ? "none" : typeof p.key.n}</div>;\nconst g = (C: (p: { readonly key?: { readonly n: number } }) => Elem) => <div><C key={5} /></div>;`, () => true));
// the props a component gets hold no key (Object.keys reads them)
const keysOf = (v: unknown) => JSON.stringify(v).includes('"children":["n"]');
R.push(tyRow("a9-ok-key-not-given", `const g = () => { const C = (p: { readonly n: number }) => <div>{Object.keys(p).join(",")}</div>; return <C n={1} key={2} />; };`, keysOf));
R.push(tyRow("a9-ok-key-intrinsic", `const g = () => <div key="a">x</div>;`, () => true));
R.push(tyRow("a9-ok-key-id-prop", comp("{ readonly id?: number }", "p.id", "<C id={5} key={5} />"), (v) => JSON.stringify(v).includes('"children":[5]')));

// B-2: a literal type JSON writes as null. [cast-type], and [boundary-type] at the boundary (live.test.ts)
const castNull = (t: string, read = `r.ok ? typeof r.value : "refused"`) => `const v = () => null;\nconst g = (v: null) => { const r = cast<${t}>(v); return ${read}; };`;
R.push(tyRow("a9-inf", castNull("1e400"), is("refused")));
R.push(tyRow("a9-neg-inf", castNull("-1e400"), is("refused")));
R.push(tyRow("a9-inf-member", castNull("{ readonly x: 1e400 }"), is("refused")));
R.push(tyRow("a9-inf-union-arr", castNull("readonly (1 | 1e400)[]"), is("refused")));
R.push(tyRow("a9-inf-arith", castNull("1e400", "r.ok ? r.value + 1 : 0"), is(0)));
R.push(tyRow("a9-inf-alias", `type I = 1e400;\n${castNull("I")}`, is("refused")));
R.push(tyRow("a9-inf-tuple", castNull("readonly [number, 1e400]"), is("refused")));
R.push(tyRow("a9-inf-optional", castNull("{ readonly x?: 2e308 }"), is("refused")));
R.push(tyRow("a9-inf-union-null", castNull("1e400 | null"), is("refused")));
R.push(tyRow("a9-ok-lit-big-finite", `const v = () => 1e300;\nconst g = (v: number) => { const r = cast<1e300>(v); return r.ok ? r.value : "refused"; };`, is(1e300)));
R.push(tyRow("a9-ok-lit-max", `const v = () => 1.7976931348623157e308;\nconst g = (v: number) => { const r = cast<1.7976931348623157e308>(v); return r.ok ? "ok" : "refused"; };`, is("ok")));
R.push(tyRow("a9-ok-lit-zero", `const v = () => 0;\nconst g = (v: number) => { const r = cast<0>(v); return r.ok ? "ok" : "refused"; };`, is("ok")));

// B-3: a promise as a cell's value. Its readers get what it settles to, every Promise level off
R.push(tyRow("a9-pp-async-input", `const p = async (): Promise<Promise<number>> => Promise.resolve(5);\nconst g = (p: Promise<number>) => typeof p;`, is("object")));
R.push(tyRow("a9-pp-sync-input", `const p = () => Promise.resolve(5);\nconst g = (p: Promise<number>) => typeof p;`, is("object")));
R.push(tyRow("a9-pp-sync-annotated", `const p = (): Promise<number> => Promise.resolve(5);\nconst g = (p: Promise<number>) => typeof p;`, is("object")));
R.push(tyRow("a9-pp-generic", `const p = () => { const f = <T,>(x: T): Promise<T> => Promise.resolve(x); return f(5); };\nconst g = (p: Promise<number>) => typeof p;`, is("object")));
R.push(tyRow("a9-pp-union", `const p = (): Promise<number> | string => Promise.resolve(5);\nconst g = (p: Promise<number> | string) => (typeof p === "string" ? "string" : "promise");`, is("string", "promise")));
R.push(tyRow("a9-pp-gen-yield", `const p = function* () { yield Promise.resolve(5); };\nconst g = (p: Promise<number>) => typeof p;`, is("object")));
R.push(tyRow("a9-pp-state", `const s = () => state(Promise.resolve(5));\nconst g = (s: Promise<number>) => typeof s;`, is("object")));
R.push(tyRow("a9-pp-then-member", `const p = () => Promise.resolve(5);\nconst g = (p: Promise<number>) => typeof p.then;`, is("function")));
R.push(tyRow("a9-ok-pp-sync-unann", `const p = () => Promise.resolve(5);\nconst g = (p) => typeof p;`, is("number")));
R.push(tyRow("a9-ok-pp-async-number", `const p = async (): Promise<Promise<number>> => Promise.resolve(5);\nconst g = (p: number) => p + 1;`, is(6)));
R.push(tyRow("a9-ok-pp-union", `const p = (): Promise<number> | string => Promise.resolve(5);\nconst g = (p) => typeof p;`, is("number", "string")));
R.push(tyRow("a9-ok-pp-state-number", `const s = () => state(Promise.resolve(5));\nconst g = (s: number) => s + 1;`, is(6)));
R.push(tyRow("a9-ok-pp-nested-kept", `const p = () => ({ q: Promise.resolve(5) });\nconst g = async (p: { readonly q: Promise<number> }) => [typeof p.q, await p.q];`, (v) => JSON.stringify(v) === '["object",5]'));
R.push(tyRow("a9-ok-pp-listener-gets-promise", `const keys = function* () { yield Promise.resolve(5); };\nconst s = () => state("none");\nconst onKey = (s: State<string>) => action((e: Promise<number>) => { s.set(typeof e); });\nconst l = (keys: Events<Promise<number>>, onKey: Action<[Promise<number>]>) => on(keys, onKey);\nconst g = (s: string) => s;`, is("none", "object")));

// B-4: a type that branches at each level. Refused within the row (SHAPE_PARTS bounds both passes of shapeAt)
const P = (d: number) => "P<".repeat(d) + "number" + ">".repeat(d);
const big = (decl: string, t: string) => `${decl}const v = () => 1;\nconst g = (v: number) => { const r = cast<${t}>(v); return r.ok ? "ok" : "refused"; };`;
const PD = "type P<X> = { readonly a: X; readonly b: X };\n";
const chain = (d: number) => Array.from({ length: d }, (_, i) => `type U${i} = { readonly a: U${i + 1}; readonly b: U${i + 1} };`).join("\n") + `\ntype U${d} = number;\n`;
const wide = (k: number, d: number) => Array.from({ length: d }, (_, i) => `type W${i} = { ${Array.from({ length: k }, (_, j) => `readonly m${j}: W${i + 1}`).join("; ")} };`).join("\n") + `\ntype W${d} = number;\n`;
for (const d of [18, 22, 30, 40]) R.push(tyRow(`a9-branch-generic-${d}`, big(PD, P(d)), () => true));
R.push(tyRow("a9-branch-chain-25", big(chain(25), "U0"), () => true));
R.push(tyRow("a9-branch-wide-4x7", big(wide(4, 7), "W0"), () => true));
R.push(tyRow("a9-branch-in-union", big(PD, `${P(24)} | null`), () => true));
R.push(tyRow("a9-branch-in-array", big(PD, `readonly ${P(24)}[]`), () => true));
R.push(tyRow("a9-ok-branch-generic-6", `${PD}const v = () => ({ a: { a: 1, b: 2 }, b: { a: 3, b: 4 } });\nconst g = (v: P<P<number>>) => { const r = cast<P<P<number>>>(v); return r.ok ? r.value.b.a : "refused"; };`, is(3)));
R.push(tyRow("a9-ok-branch-wide-3x6", big(wide(3, 6), "W0"), is("refused")));
R.push(tyRow("a9-ok-branch-recursive", big("type T = { readonly v: number; readonly kids: readonly T[] };\n", "T"), is("refused")));

// 5d: text the compiler reserves in a cell's text
R.push(tyRow("a9-mark-string", `const g = () => "/*ss-*/";`, () => true));
R.push(tyRow("a9-mark-cast", `const v = () => 1;\nconst g = (v: number) => { const r = cast<"/*ss-*/">(v); return r.ok ? 1 : 0; };`, () => true));
R.push(tyRow("a9-mark-lang", `const g = () => '/*{lang:"ss"}*/';`, () => true));
R.push(tyRow("a9-mark-comment", `const g = () => /*ss*/ 1;`, () => true));
R.push(tyRow("a9-mark-template", "const g = () => `/*ss${1}`;", () => true));
R.push(tyRow("a9-mark-jsx-text", `const g = () => <b>/*ss</b>;`, () => true));
R.push(tyRow("a9-mark-key", `const g = () => ({ "/*ss": 1 });`, () => true));
R.push(tyRow("a9-mark-type", `type T = "/*ss";\nconst g = () => { const t: T = "/*ss"; return t; };`, () => true));
R.push(tyRow("a9-ok-mark-split", `const g = () => "/" + "*ss-*/";`, is("/*ss-*/")));

// 5e: a refusal names what was expected (fetchValue: the JavaScript value json() gives)
const G = (t: string) => `const g = async (fetch: Fetch) => {\n  const res = await fetch("x");\n  const r = cast<${t}>(await res.json());\n  return r.ok ? "ok" : r.error;\n};`;
const says = (...parts: string[]) => (v: unknown) => typeof v === "string" && parts.every((p) => v.includes(p));
R.push({ ...tyRow("a9-ok-msg-tagged-union", G("{ readonly t: 1; readonly n: number } | { readonly t: 2; readonly s: string }"), says("an object { t: 1, n: number } or an object { t: 2, s: string }", "found an object")), fetchValue: () => ({ t: "1", n: 1 }) });
R.push({ ...tyRow("a9-ok-msg-inherited", G("{ readonly a?: number }"), says("an object whose prototype is not Object.prototype")), fetchValue: () => Object.create({ a: "x" }) });
R.push({ ...tyRow("a9-ok-msg-class", G("{ readonly n: number }"), says("expected an object { n: number }", "found a Date object")), fetchValue: () => new Date(0) });

// follow-up (2026-11-23): an alias that names itself is [type-cycle] once; a use of it adds no [unknown-type]
R.push(tyRow("a9-cycle-self-use", `type A = A | number;\nconst g = (): A => 1;`, () => true));
R.push(tyRow("a9-cycle-mutual-use", `type A = B | null;\ntype B = A | string;\nconst g = (): A => null;`, () => true));
R.push(tyRow("a9-cycle-generic-use", `type A<T> = A<T> | number;\nconst g = (): A<string> => 1;`, () => true));

export const attacks: A[] = R;
export const cands = R;

// The probe suite for Opaque<B>: each probe is a module source, the module's cells in another language, the cell judged
// and the verdict expected (ok, or the rule it is rejected with). Run against the patched copy of the checker:
//   bun selfhost/opaque-handles/probes.ts            every probe, a line each, and the totals
//   bun selfhost/opaque-handles/probes.ts --original the same sources against the shipped checker (lite/core.ts)
import { checkSources as patched } from "./proto/lite/core.ts";
import { checkSources as shipped } from "../../lite/core.ts";

type Probe = { id: string; src: string; out?: string[]; cell?: string; want: string };
// a cell P whose value is a function over two handles of brand "n": the probes of what checked code may do with one
const fn = (body: string, params = `a: Opaque<"n">, b: Opaque<"n">`) => `const P = () => (${params}) => ${body};`;
const blk = (body: string, params = `a: Opaque<"n">, b: Opaque<"n">`) => `const P = () => (${params}) => { ${body} };`;

export const PROBES: Probe[] = [
  // accepted: hold, pass, store, key, compare, return to a declared foreign function
  { id: "hold", src: fn("a"), want: "ok" },
  { id: "pass-local", src: blk(`const id = (x: Opaque<"n">) => x; return id(a);`), want: "ok" },
  { id: "record", src: fn("({ a, n: 1 })"), want: "ok" },
  { id: "array", src: fn("[a, b]"), want: "ok" },
  { id: "conditional", src: fn("a !== null ? a : b"), want: "ok" },
  { id: "nullable", src: fn("a === null ? 0 : 1", `a: Opaque<"n"> | null`), want: "ok" },
  { id: "loose-null", src: fn("a == null"), want: "ok" },
  { id: "map-key", src: fn("new Map([[a, 1]]).get(b) ?? 0"), want: "ok" },
  { id: "set-has", src: fn("new Set([a]).has(b)"), want: "ok" },
  { id: "includes", src: fn("[a].includes(b)"), want: "ok" },
  { id: "indexOf", src: fn("[a, b].indexOf(b)"), want: "ok" },
  { id: "sameHandle", src: fn("sameHandle(a, b)"), want: "ok" },
  { id: "sameHandle-generic", src: blk(`const s = <B,>(x: Opaque<B>, y: Opaque<B>): boolean => sameHandle(x, y); return s(a, b);`), want: "ok" },
  { id: "equals-identity", src: fn("equals(a, b)"), want: "ok" },
  { id: "two-brands-union", src: fn("[a, b]", `a: Opaque<"n">, b: Opaque<"g">`), want: "ok" },
  { id: "typeof-constant", src: fn(`typeof a === "object" ? 1 : 2`), want: "ok" },
  { id: "await-handle", src: `const P = () => async (a: Opaque<"n">) => { const x = await a; return [x]; };`, want: "ok" },
  { id: "map-in-record", src: blk(`const m: Map<Opaque<"n">, number> = new Map([[a, 1]]); return { m };`), want: "ok" },
  { id: "boundary-hold", src: `const P = (node: Opaque<"n">) => node;`, out: ["node"], want: "ok" },
  { id: "boundary-compare", src: `const P = (node: Opaque<"n">, other: Opaque<"n">) => sameHandle(node, other);`, out: ["node", "other"], want: "ok" },
  { id: "boundary-to-foreign-fn", src: `const P = (measure: (n: Opaque<"n">) => number, node: Opaque<"n">) => measure(node);`, out: ["measure", "node"], want: "ok" },
  { id: "boundary-from-foreign-fn", src: `const P = (make: (s: string) => Opaque<"n">) => [make("a"), make("b")];`, out: ["make"], want: "ok" },
  { id: "boundary-nullable", src: `const P = (node: Opaque<"n"> | null) => node === null ? 0 : 1;`, out: ["node"], want: "ok" },
  { id: "boundary-in-record", src: `type Row = { id: number; el: Opaque<"n"> };\nconst P = (rows: Row[]) => rows.map((r) => r.id);`, out: ["rows"], want: "ok" },
  { id: "state-data", src: `const P = (node: Opaque<"n">) => state({ held: node, n: 1 });`, out: ["node"], want: "ok" },
  { id: "state-map", src: `const P = (node: Opaque<"n">) => state(new Map([[node, 1]]));`, out: ["node"], want: "ok" },
  { id: "events-payload", src: `function* P(node: Opaque<"n">) { yield node; }`, out: ["node"], want: "ok" },
  { id: "action-arg", src: `const s = () => state(0);\nconst P = (s: State<number>) => action((a: Opaque<"n">, b: Opaque<"n">) => s.set(sameHandle(a, b) ? 1 : 0));`, want: "ok" },
  { id: "record-spread-holding", src: fn("({ ...{ a, n: 1 }, n: 2 })"), want: "ok" },
  { id: "in-record-holding", src: fn(`"a" in { a }`), want: "ok" },
  { id: "listener-of-handles", src: `function* ev(node: Opaque<"n">) { yield node; }\nconst s = () => state(0);\nconst act = (s: State<number>) => action((h: Opaque<"n">) => s.set(1));\nconst P = (ev: Events<Opaque<"n">>, act: Action<[Opaque<"n">]>) => on(ev, act);`, out: ["node"], want: "ok" },
  // rejected: look inside, call, mutate, construct
  { id: "member-read", src: fn("a.x"), want: "type" },
  { id: "member-opaque-field", src: fn("a.opaque"), want: "type" },
  { id: "member-h-field", src: fn(`a["h"]`), want: "type" },
  { id: "optional-chain", src: fn("a?.x"), want: "type" },
  { id: "index", src: fn("a[0]"), want: "type" },
  { id: "method-call", src: fn("a.toString()"), want: "type" },
  { id: "call", src: fn("a()"), want: "type" },
  { id: "member-write", src: blk("a.x = 1; return 1;"), want: "member-write" },
  { id: "delete", src: blk("delete a.x; return 1;"), want: "no-delete" },
  { id: "destructure", src: blk("const { x } = a; return x;"), want: "type" },
  { id: "object-spread", src: fn("({ ...a })"), want: "type" },
  { id: "array-spread", src: fn("[...a]"), want: "type" },
  { id: "for-of", src: blk("for (const x of a) return x; return 0;"), want: "type" },
  { id: "in-operator", src: fn(`"h" in a`), want: "type" },
  { id: "new", src: fn("new a()"), want: "new-non-intrinsic" },
  { id: "object-freeze", src: fn("Object.freeze(a)"), want: "object-freeze" },
  { id: "typeof-function-call", src: blk(`if (typeof a === "function") return a(); return 0;`), want: "type" },
  // rejected: widen to a type that hides the brand, and recover it
  { id: "to-unknown", src: blk("const u: unknown = a; return 1;"), want: "handle-pass" },
  { id: "to-object", src: blk("const u: object = a; return 1;"), want: "handle-pass" },
  { id: "to-empty-record", src: blk("const u: {} = a; return 1;"), want: "type" },
  { id: "to-optional-record", src: blk("const u: { x?: number } = a; return u.x;"), want: "type" },
  { id: "to-unknown-array", src: blk("const u: unknown[] = [a]; return u;"), want: "handle-pass" },
  { id: "to-type-param", src: blk("const id = <T,>(x: T): T => x; return id(a);"), want: "handle-pass" },
  { id: "unknown-back", src: blk(`const u: unknown = a; if (typeof u === "object" && u !== null) { const h: Opaque<"g"> = u; return h; } return null;`), want: "handle-pass" },
  { id: "brand-assign", src: blk(`const g: Opaque<"g"> = a; return g;`), want: "type" },
  { id: "brand-widen-string", src: blk(`const g: Opaque<string> = a; return g;`), want: "type" },
  { id: "brand-widen-union", src: blk(`const g: Opaque<"n" | "g"> = a; return g;`), want: "type" },
  { id: "brand-union-of-handles", src: blk(`const g: Opaque<"n"> | Opaque<"g"> = a; const h: Opaque<"g"> = g; return h;`), want: "type" },
  { id: "sameHandle-brands", src: fn("sameHandle(a, b)", `a: Opaque<"n">, b: Opaque<"g">`), want: "type" },
  { id: "cast", src: fn(`a as Opaque<"g">`), want: "no-cast" },
  { id: "forge-record", src: blk(`const h: Opaque<"n"> = { opaque: "n" }; return h;`), want: "type" },
  { id: "forge-token-shape", src: blk(`const h: Opaque<"n"> = { h: 1 }; return h;`), want: "type" },
  { id: "forge-from-unknown", src: blk(`if (typeof u === "object" && u !== null) { const h: Opaque<"n"> = u; return h; } return null;`, "u: unknown"), want: "type" },
  { id: "brand-not-literal", src: `const P = (node: Opaque<string>) => 1;`, out: ["node"], want: "boundary-type" },
  { id: "no-brand", src: fn("1", "a: Opaque"), want: "type" },
  // rejected: copy, send, print
  { id: "structuredClone", src: fn("structuredClone(a)"), want: "type" },
  { id: "structuredClone-record", src: fn("structuredClone({ a })"), want: "type" },
  { id: "snapshot", src: fn("snapshot(a)"), want: "type" },
  { id: "json", src: fn("JSON.stringify(a)"), want: "handle-pass" },
  { id: "json-record", src: fn("JSON.stringify({ a })"), want: "handle-pass" },
  { id: "throw", src: blk("throw a;"), want: "handle-pass" },
  { id: "template", src: fn("`${a}`"), want: "opaque-coerce" },
  { id: "template-array", src: fn("`${[a]}`"), want: "opaque-coerce" },
  { id: "concat", src: fn(`a + ""`), want: "opaque-coerce" },
  { id: "String", src: fn("String(a)"), want: "handle-pass" },
  { id: "loose-eq-string", src: fn(`a == "x"`), want: "opaque-coerce" },
  { id: "ordering", src: fn("a < b"), want: "type" },
  { id: "unary-plus", src: fn("+a"), want: "opaque-coerce" },
  { id: "messageOf", src: fn("messageOf(a)"), want: "opaque-coerce" },
  { id: "join", src: fn("[a].join()"), want: "opaque-coerce" },
  { id: "toSorted", src: fn("[a, b].toSorted()"), want: "opaque-coerce" },
  { id: "computed-key", src: fn("({ x: 1 })[a]"), want: "opaque-coerce" },
  { id: "strict-eq", src: fn("a === b"), want: "strict-eq-object" },
  { id: "Object.is", src: fn("Object.is(a, b)"), want: "handle-pass" },
  { id: "Object.keys", src: fn("Object.keys(a)"), want: "handle-pass" },
  { id: "jsx-child", src: `const P = () => (a: Opaque<"n">) => <div>{a}</div>;`, want: "type" },
  { id: "worker", src: `const x = (node: Opaque<"n">) => node;\nconst y = (x: Opaque<"n">) => 1;\nconst P = (compile) => compile({ inputs: ["x"], outputs: ["y"] });`, out: ["node"], want: "compile-boundary" },
  { id: "action-capture", src: `const s = () => state(0);\nconst P = (s: State<number>, node: Opaque<"n">) => action(() => s.set(sameHandle(node, node) ? 1 : 0));`, out: ["node"], want: "action-capture" },
];

if (import.meta.main) {
  const original = process.argv.includes("--original");
  const checkSources = original ? shipped : patched;
  let asWanted = 0;
  const off: string[] = [];
  for (const p of PROBES) {
    let got: string;
    try {
      const r = checkSources({ cells: p.src, tsx: true, outside: (p.out ?? []).map((name) => ({ name })) });
      const c = r.cells.find((x) => x.name === (p.cell ?? "P"));
      const rules = [...new Set([...(c?.errors ?? []), ...(c?.unsupported ?? []).map((u) => ({ ...u, rule: `unsupported:${u.rule}` }))].map((e) => e.rule))];
      got = !c ? "missing" : c.status === "ok" ? "ok" : `${c.status} ${rules.join(",")}`;
      const pass = p.want === "ok" ? c?.status === "ok" : c?.status === "rejected" && rules.includes(p.want);
      if (pass) asWanted++; else off.push(p.id);
      const first = c?.errors[0];
      console.log(`${pass ? "as expected" : "NOT AS EXPECTED"}  ${p.id.padEnd(26)} want ${p.want.padEnd(18)} got ${got}${first && !pass ? `  (${first.msg.slice(0, 110)})` : ""}`);
    } catch (e) { off.push(p.id); console.log(`NOT AS EXPECTED  ${p.id.padEnd(26)} threw ${(e as Error).message}`); }
  }
  const acc = PROBES.filter((p) => p.want === "ok").length;
  console.log(`\n${original ? "shipped" : "patched"} checker: ${PROBES.length} probes (${acc} want ok, ${PROBES.length - acc} want a rule); ${asWanted} as expected; off: ${off.join(" ") || "none"}`);
}

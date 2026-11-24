// the five rules of 2026-11-24
import { toSrcs, type Cand } from "./h.ts";
const A = (name: string, body: string, pre = ""): Cand => ({ name, src: `${pre}const a = () => { ${body} };`, show: ["a"] });
export const cands: Cand[] = [
  // 1. run-time keys on an index-signature record
  A("reject-runtime-key-read", `const o: { readonly [k: string]: number } = { x: 1 }; const k = ["x"].join(""); return o[k] ?? 0;`),
  A("reject-runtime-key-in", `const o: { readonly [k: string]: number } = { x: 1 }; const k = ["x"].join(""); return k in o;`),
  A("accept-literal-key-read", `const o: { readonly [k: string]: number } = { x: 1 }; return o["x"] ?? 0;`),
  A("accept-const-literal-key-read", `const o: { readonly [k: string]: number } = { x: 1 }; const k = "x"; return o[k] ?? 0;`),
  A("accept-map-runtime-key", `const m = new Map<string, number>([["x", 1]]); const k = ["x"].join(""); return m.get(k) ?? 0;`),
  A("accept-object-entries-of-index-record", `const o: { readonly [k: string]: number } = { x: 1, y: 2 }; return Object.entries(o).map((e) => e[0] + e[1]).join(",");`),
  A("reject-runtime-key-on-Record", `const o: Record<string, number> = {}; const k = ["x"].join(""); o[k] = 1; return Object.keys(o);`),
  // 2. delete
  A("accept-delete-optional-member", `const o: { a: number; b?: number } = { a: 1, b: 2 }; delete o.b; return Object.keys(o);`),
  A("reject-delete-required-member", `const o: { a: number; b?: number } = { a: 1, b: 2 }; delete o.a; return Object.keys(o);`),
  A("accept-delete-index-entry-literal-key", `const o: { [k: string]: number } = { x: 1, y: 2 }; delete o["x"]; return Object.keys(o);`),
  A("reject-delete-index-entry-runtime-key", `const o: { [k: string]: number } = { x: 1 }; const k = ["x"].join(""); delete o[k]; return Object.keys(o);`),
  A("reject-delete-array-element", `const xs = [1, 2]; delete xs[0]; return xs.length;`),
  A("reject-delete-on-non-mut", `const o: { readonly b?: number } = { b: 1 }; const p: { readonly b?: number } = o; delete p.b; return 1;`),
  // 3. a let assigned in a nested function is not narrowed
  A("reject-let-assigned-in-helper-narrowed", `let r: number | null = null; const set = () => { r = 3; }; set(); if (r !== null) return r + 1; return 0;`),
  A("accept-copy-to-const-then-narrow", `let r: number | null = null; const set = () => { r = 3; }; set(); const y = r; if (y !== null) return y + 1; return 0;`),
  A("accept-let-not-assigned-in-nested-is-narrowed", `let r: number | null = null; r = 3; if (r !== null) return r + 1; return 0;`),
  A("reject-param-narrowed-in-nested", `const f = (r: number | null): number => { r = r ?? 1; const g = () => (r !== null ? r + 1 : 0); return g(); }; return f(null);`),
  // 5. a fetch response is Mut and not a cell's value
  { name: "reject-response-as-cell-value", src: `const r = async (fetch: Fetch) => await fetch("x");`, fetchBody: "x" },
  { name: "accept-json-as-cell-value", src: `const data = async (fetch: Fetch) => (await fetch("x")).json();`, fetchBody: '{"a":1}', show: ["data"] },
  { name: "reject-response-as-unknown", src: `const r = async (fetch: Fetch) => { const res = await fetch("x"); const u: unknown = res; return 1; };`, fetchBody: "x" },
  { name: "reject-write-response-member", src: `const r = async (fetch: Fetch) => { const res = await fetch("x"); res.ok = false; return 1; };`, fetchBody: "x" },
];
export const srcs = toSrcs(cands);

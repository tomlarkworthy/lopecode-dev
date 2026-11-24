import { toSrcs, type Cand } from "./h.ts";
const I = (name: string, body: string): Cand => ({ name, src: `const a = () => { ${body} };`, show: ["a"] });
export const cands: Cand[] = [
  I("array-index-is-T-or-undefined", `const xs = [1, 2]; const v: number = xs[0]; return v;`),
  I("accept-array-index-fallback", `const xs = [1, 2]; const v: number = xs[0] ?? 0; return v;`),
  I("string-index", `const s = "abc"; const c: string = s[0]; return c;`),
  I("accept-string-index-fallback", `const s = "abc"; return s[5] ?? "none";`),
  I("typed-array-index", `const b = new Float64Array(2); const v: number = b[0]; return v;`),
  I("typed-array-index-plus-assign", `const b = new Float64Array(2); b[1] += 1; return b[1] ?? -1;`),
  I("tuple-literal-index", `const t: readonly [number, string] = [1, "x"]; const v: string = t[1]; return v;`),
  I("tuple-out-of-range-index", `const t: readonly [number, string] = [1, "x"]; return t[2];`),
  I("map-entry-tuple-index", `const m = new Map([["a", 1]]); let n = 0; for (const e of m.entries()) { const v: number = e[1]; n += v; } return n;`),
  I("regexp-match-index", `const m = "a1".match(/(\\d)/); if (m === null) return ""; const g: string = m[1]; return g;`),
  I("index-signature-literal-key-read", `const o: { readonly [k: string]: number } = { x: 1 }; const v: number = o["x"]; return v;`),
  I("index-signature-dot-read", `const o: { readonly [k: string]: number } = { x: 1 }; const v: number = o.x; return v;`),
  I("accept-at-minus-one", `const xs = [1, 2]; const v = xs.at(-1); return v === undefined ? 0 : v;`),
  I("string-charAt-is-string", `const s = "abc"; const c: string = s.charAt(9); return c.length;`),
];
export const srcs = toSrcs(cands);

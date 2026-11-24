const M = `const m: { [k: string]: number } = { x: 1 };`;
const mk = (name: string, body: string) => ({ name, src: `const k = () => "toString";\nconst c = (k: string) => { ${M} ${body} };`, show: ["c"] });
export const cands = [
  mk("lit-toString", `const v = m["toString"]; return v === undefined ? "undef" : typeof v;`),
  mk("dot-constructor", `const v = m.constructor; return v === undefined ? "undef" : typeof v;`),
  mk("dot-toString", `const v = m.toString; return v === undefined ? "undef" : typeof v;`),
  mk("in-valueOf", `return "valueOf" in m ? "in" : "out";`),
  mk("destructure-lit", `const { toString } = m; return toString === undefined ? "undef" : typeof toString;`),
  mk("destructure-computed", `const { [k]: v } = m; return v === undefined ? "undef" : typeof v;`),
  mk("optional-computed", `const v = m?.[k]; return v === undefined ? "undef" : typeof v;`),
  mk("lit-proto-read", `const v = m["__proto__"]; return v === undefined ? "undef" : typeof v;`),
  mk("template-key", "const v = m[`${k}`]; return v === undefined ? 'undef' : typeof v;"),
  mk("const-lit-typed", `const kk = "toString" as const; const v = m[kk]; return v === undefined ? "undef" : typeof v;`),
  mk("record-type", `const r: Record<string, number> = { x: 1 }; const v = r[k]; return v === undefined ? "undef" : typeof v;`),
  mk("num-key", `const a: { [i: number]: number } = { 0: 1 }; const n: number = k.length; const v = a[n]; return v === undefined ? "undef" : typeof v;`),
  mk("hasOwn-guard", `return Object.hasOwn(m, k) ? "own" : "not";`),
  mk("write-lit-toString", `const w: { [k: string]: number } = {}; w["toString"] = 1; return String(w) === "[object Object]" ? "ok" : "broken";`),
  mk("ok-lit-x", `const v = m["x"]; return v === undefined ? "undef" : typeof v;`),
  mk("ok-dot-x", `const v = m.x; return v === undefined ? "undef" : typeof v;`),
];

export const srcs: [string, string][] = [
  ["idx-local-proto", `const a = () => { const v = [1]; const m: { [k: string]: number[] } = {}; const k: string = "__proto__"; m[k] = v; return m; };\nconst c = (a: { [k: string]: number[] }) => { const x = a["0"]; return x === undefined ? "undef" : x.length; };`],
  ["idx-mut-proto", `const a = () => { const v = [1]; const m: Mut<{ [k: string]: number[] }> = {}; const k: string = "__proto__"; m[k] = v; return m; };\nconst c = (a: { [k: string]: number[] }) => { const x = a["0"]; return x === undefined ? "undef" : x.length; };`],
  ["idx-param-key", `const a = () => { const put = (m: Mut<{ [k: string]: number[] }>, k: string, v: number[]) => { m[k] = v; }; const m: { [k: string]: number[] } = {}; put(m, "__proto__", [1]); return m; };\nconst c = (a: { [k: string]: number[] }) => { const x = a["0"]; return x === undefined ? "undef" : x.length; };`],
  ["idx-literal-key", `const a = () => { const m: { [k: string]: number[] } = {}; m["__proto__"] = [1]; return m; };`],
];

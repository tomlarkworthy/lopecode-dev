import { checkSources } from "../../lite/core.ts";
const P: [string,string][] = [
 ["kept fn writes t[0] via as const", `const a = () => {\n  const xs = [0];\n  const t = [xs, 1] as const;\n  return () => {\n    t[0].push(1);\n    return t[0].length;\n  };\n};`],
 ["kept fn reads t[0]", `const a = () => {\n  const xs = [0];\n  const t = [xs, 1] as const;\n  xs.push(2);\n  return () => t[0].length;\n};`],
 ["record {t: xs} kept fn writes", `const a = () => {\n  const xs = [0];\n  const r = { t: xs };\n  return () => {\n    r.t.push(1);\n    return r.t.length;\n  };\n};`],
 ["cell value holds kept writer; caller cell", `const a = () => {\n  const xs = [0];\n  const t = [xs, 1] as const;\n  return () => t[0].push(1);\n};\nconst b = (a: () => number) => a() + a();`],
 ["union annotation write", `const a = () => {\n  const xs: number[] | null = [1];\n  if (xs !== null) xs.push(2);\n  return 1;\n};`],
 ["ReadonlyArray annotation push", `const a = () => {\n  const xs: ReadonlyArray<number> = [1];\n  return xs.length;\n};`],
 ["Readonly<{n}> write", `const a = () => {\n  const r: Readonly<{ n: number }> = { n: 1 };\n  return r.n;\n};`],
 ["ReadonlyMap capture", `const a = () => {\n  const m: ReadonlyMap<string, number> = new Map();\n  return () => m.size;\n};`],
 ["readonly T[] capture fresh", `const a = () => {\n  const c: readonly number[] = [1];\n  return () => c.length;\n};`],
 ["partial readonly literal write", `const a = () => {\n  const r: { readonly n: number; m: number } = { n: 1, m: 2 };\n  r.m = 3;\n  return r.m;\n};`],
 ["Array<number> annotated capture", `const a = () => {\n  const m: Array<number> = [];\n  return () => m.length;\n};`],
 ["typeof in param", `const a = () => {\n  const m = [1];\n  const f = (x: typeof m) => x.length;\n  return f(m);\n};`],
 ["typeof whole local", `const a = () => {\n  const m = [1];\n  const n: typeof m = m;\n  return n.length;\n};`],
 ["memo then write via alias", `const f = () => {\n  const sq = memo((xs: readonly number[]) => xs.length);\n  const m = [1];\n  const k = m;\n  sq(k);\n  m.push(2);\n  return 1;\n};`],
 ["memo arg inside array", `const f = () => {\n  const sq = memo((xs: readonly (readonly number[])[]) => xs.length);\n  const m = [1];\n  sq([m]);\n  m.push(2);\n  return 1;\n};`],
 ["memo write before call ok", `const f = () => {\n  const sq = memo((xs: readonly number[]) => xs.length);\n  const m = [1];\n  m.push(2);\n  return sq(m);\n};`],
 ["memo let memo binding", `const f = () => {\n  let sq = memo((xs: readonly number[]) => xs.length);\n  const m = [1];\n  sq(m);\n  m.push(2);\n  return 1;\n};`],
 ["S4.9 fn-type param result alias", `type M = Mut<number[]>;\nconst a = () => {\n  const f = (g: () => M) => 1;\n  return 1;\n};`],
];
for (const [n, s] of P) {
  const r = checkSources({ cells: s, tsx: false });
  const rules = [...r.module, ...r.cells.flatMap((x: any) => x.errors)].map((e: any) => e.rule);
  console.log(n.padEnd(45), rules.length ? JSON.stringify(rules) : "OK " + r.cells.map((c: any) => c.name + ":" + c.status).join(","));
}

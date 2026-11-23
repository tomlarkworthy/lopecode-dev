// n1: root N, a kept function capturing a local whose INFERRED type holds a Mut below its own type (S5.8), by
// inference route x keep form. Each kept function writes through the local and reads it back (an increment), so a
// later call gives a new answer if the write lands. Names: n1-<route>-<keeper>.
import { C } from "../freeze-attack3/harness.ts";
// [setup statements, write statement, read expression]
const routes: Record<string, [string, string, string]> = {
  tuple: ["const xs = [0]; const t = [xs, 1] as const;", "t[0].push(1);", "t[0].length"],
  tuple1: ["const xs = [0]; const t = [xs] as const;", "t[0].push(1);", "t[0].length"],
  tuple2: ["const xs = [0]; const t = [xs, xs] as const;", "t[1].push(1);", "t[0].length"],
  tern: ["const xs = [0]; const t = xs.length > 0 ? xs : null;", "if (t) t.push(1);", "(t ? t.length : -1)"],
  ternrec: ["const xs = [0]; const t = xs.length > 0 ? ([xs] as const) : null;", "if (t) t[0].push(1);", "(t ? t[0].length : -1)"],
  box: ["const box = <T,>(v: T) => ({ v }); const xs = [0]; const t = box(xs);", "t.v.push(1);", "t.v.length"],
  pairg: ["const pr = <T,>(v: T) => [v, 0] as const; const xs = [0]; const t = pr(xs);", "t[0].push(1);", "t[0].length"],
  idg: ["const id = <T,>(v: T): T => v; const xs = [0]; const t = id(xs);", "t.push(1);", "t.length"],
  fnres: ["const xs = [0]; const g = () => xs;", "g().push(1);", "g().length"],
  fnres2: ["const xs = [0]; const g = () => [xs] as const;", "g()[0].push(1);", "g()[0].length"],
  iife: ["const xs = [0]; const t = (() => [xs] as const)();", "t[0].push(1);", "t[0].length"],
  alias2: ["const xs = [0]; const t0 = [xs] as const; const t = t0;", "t[0].push(1);", "t[0].length"],
  destr: ["const xs = [0]; const [t] = [xs] as const;", "t.push(1);", "t.length"],
  destrobj: ["const xs = [0]; const { t } = { t: xs };", "t.push(1);", "t.length"],
  spread: ["const xs = [0]; const t = { ...{ v: xs } };", "t.v.push(1);", "t.v.length"],
  rec: ["const xs = [0]; const t = { v: xs };", "t.v.push(1);", "t.v.length"],
  entries: ["const xs = [0]; const t = Object.entries({ k: xs });", "t[0]?.[1].push(1);", "(t[0]?.[1].length ?? -1)"],
  values: ["const xs = [0]; const t = Object.values({ k: xs });", "t[0]?.push(1);", "(t[0]?.length ?? -1)"],
  mapnew: ["const xs = [0]; const t = new Map([[\"k\", xs]]);", "t.get(\"k\")?.push(1);", "(t.get(\"k\")?.length ?? -1)"],
  setnew: ["const xs = [0]; const t = new Set([xs]);", "for (const y of t) y.push(1);", "[...t].length"],
  arrmap: ["const xs = [0]; const t = ([xs] as const).map((y) => y);", "t[0]?.push(1);", "(t[0]?.length ?? -1)"],
  arrfilter: ["const xs = [0]; const t = ([xs] as const).filter(() => true);", "t[0]?.push(1);", "(t[0]?.length ?? -1)"],
  arrslice: ["const xs = [0]; const t = ([xs] as const).slice();", "t[0]?.push(1);", "(t[0]?.length ?? -1)"],
  arrconcat: ["const xs = [0]; const t = ([] as number[][]).concat([xs]);", "t[0]?.push(1);", "(t[0]?.length ?? -1)"],
  nested: ["const xs = [0]; const t = [[xs] as const, 1] as const;", "t[0][0].push(1);", "t[0][0].length"],
  findres: ["const xs = [0]; const t = ([xs] as const).find(() => true);", "t?.push(1);", "(t?.length ?? -1)"],
  atres: ["const xs = [0]; const t = ([xs] as const)[0];", "t.push(1);", "t.length"],
  typedtup: ["const u = new Uint8Array(2); const t = [u] as const;", "t[0][0] = (t[0][0] ?? 0) + 1;", "(t[0][0] ?? -1)"],
  maptup: ["const m = new Map<string, number>(); const t = [m] as const;", "t[0].set(String(t[0].size), 1);", "t[0].size"],
  urltup: ["const u = new URL(\"https://x.test/a\"); const t = [u] as const;", "t[0].pathname = t[0].pathname + \"b\";", "t[0].href"],
  rectup: ["const o = { n: 0 }; const t = [o] as const;", "t[0].n++;", "t[0].n"],
  errtup: ["const e = new Error(\"x\"); const t = [e] as const;", "t[0].message = t[0].message + \"y\";", "t[0].message"],
};
// keep forms: [name, cell source given setup S, write w, read r]
const keepers: [string, (s: string, w: string, r: string) => string][] = [
  ["ret", (s, w, r) => `const a = () => { ${s} return () => { ${w} return ${r}; }; };`],
  ["rec", (s, w, r) => `const a = () => { ${s} return { f: () => { ${w} return ${r}; } }; };`],
  ["method", (s, w, r) => `const a = () => { ${s} return { m() { ${w} return ${r}; } }; };`],
  ["decl", (s, w, r) => `const a = () => { ${s} function f() { ${w} return ${r}; } return f; };`],
  ["gen", (s, w, r) => `const a = function* () { ${s} yield () => { ${w} return ${r}; }; };`],
  ["two", (s, w, r) => `const a = () => { ${s} return { w: () => { ${w} return 0; }, r: () => ${r} }; };`],
];
export const cands = Object.entries(routes).flatMap(([rn, [s, w, r]]) => keepers.map(([kn, k]) => C(`n1-${rn}-${kn}`, k(s, w, r))));

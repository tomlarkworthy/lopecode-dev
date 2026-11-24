// freeze-attack11 (c): checkSources time against program size for shapes that reach ix-hides' all-optional walk.
// bun selfhost/freeze-attack11/timing.ts ; stops a family once one size takes over 20 s.
import { checkSources } from "../../lite/core.ts";
const fams: Record<string, (n: number) => string> = {
  // a chain of generic all-optional aliases, each taking the next as an argument
  "generic-optional-chain": (n) => Array.from({ length: n }, (_, i) => `type T${i}<A> = { readonly a?: A; readonly k?: T${i + 1 < n ? i + 1 : 0}<A>; readonly z${i}?: number };`).join("\n") + `\nconst g = () => { const v: T0<number> = {}; const w: {} = v; const u: T${n - 1}<number> = {}; return 1; };`,
  // n pairs of distinct recursive aliases that are structurally equal, assigned to each other
  "equal-recursive-pairs": (n) => Array.from({ length: n }, (_, i) => `type A${i} = { readonly x?: A${i}; readonly y?: B${i}; readonly n: number };\ntype B${i} = { readonly x?: B${i}; readonly y?: A${i}; readonly n: number };`).join("\n") + `\nconst g = () => { ${Array.from({ length: n }, (_, i) => `const a${i}: A${i} = { n: 1 }; const b${i}: B${i} = a${i}; const c${i}: {} = b${i};`).join(" ")} return 1; };`,
  // a wide union of all-optional records, a union value given a union type and {}
  "wide-optional-union": (n) => `type U = ${Array.from({ length: n }, (_, i) => `{ readonly k${i}?: U; readonly m${i}?: readonly U[] }`).join(" | ")};\ntype V = ${Array.from({ length: n }, (_, i) => `{ readonly k${i}?: V; readonly m${i}?: readonly V[] }`).join(" | ")};\nconst g = () => { const u: U = {}; const v: V = u; const w: {} = v; const xs: readonly {}[] = [u, v]; return xs.length; };`,
  // nested record value given {} (the hidden-member walk over a source)
  "deep-record-to-empty": (n) => `const g = () => { const v = ${"{ a: ".repeat(n)}1${" }".repeat(n)}; const w: {} = v; const o: { readonly a?: {} } = v; return 1; };`,
  // a generic function over T extends {} called on wide records
  "generic-extends-empty": (n) => `const g = () => { const id = <T extends {},>(x: T): T => x; ${Array.from({ length: n }, (_, i) => `const r${i} = id({ ${Array.from({ length: n }, (_, j) => `f${j}: ${j}`).join(", ")} });`).join(" ")} return 1; };`,
};
for (const [name, mk] of Object.entries(fams)) {
  const line: string[] = [];
  for (const n of [5, 10, 20, 40, 80]) {
    const src = mk(n);
    const t0 = performance.now();
    let verdict = "";
    try { const r: any = checkSources({ cells: src, tsx: true, outside: [], foreign: null } as never); const bad = r.cells.filter((c: any) => c.status !== "ok" || c.errors.length || c.unsupported.length); verdict = bad.length || r.module.length ? `REJECT ${[...r.module.map((m: any) => m.rule), ...bad.flatMap((c: any) => [...c.errors.map((e: any) => e.rule), ...(c.unsupported.length ? ["unsupported"] : [])])].slice(0, 3).join(",")}` : "ACCEPT"; } catch (x) { verdict = `CRASH ${(x as Error).message.slice(0, 50)}`; }
    const ms = performance.now() - t0;
    line.push(`n=${n} ${ms.toFixed(0)}ms ${verdict}`);
    if (ms > 20000) break;
  }
  console.log(`${name}: ${line.join(" | ")}`);
}

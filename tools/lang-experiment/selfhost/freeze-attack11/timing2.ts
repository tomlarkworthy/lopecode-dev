// freeze-attack11 (c), wide-optional-union ablated: which part grows. bun selfhost/freeze-attack11/timing2.ts
import { checkSources } from "../../lite/core.ts";
const U = (nm: string, n: number, opt: string) => `type ${nm} = ${Array.from({ length: n }, (_, i) => `{ readonly k${i}${opt}: ${nm}; readonly m${i}${opt}: readonly ${nm}[] }`).join(" | ")};`;
const fams: Record<string, (n: number) => string> = {
  "U-to-V-only": (n) => `${U("U", n, "?")}\n${U("V", n, "?")}\nconst g = () => { const u: U = {}; const v: V = u; return 1; };`,
  "U-to-empty-only": (n) => `${U("U", n, "?")}\nconst g = () => { const u: U = {}; const w: {} = u; return 1; };`,
  "U-declared-only": (n) => `${U("U", n, "?")}\nconst g = () => { const u: U = {}; return 1; };`,
  "U-to-V-required": (n) => `type U = ${Array.from({ length: n }, (_, i) => `{ readonly t: ${i}; readonly k${i}: U | null }`).join(" | ")};\ntype V = ${Array.from({ length: n }, (_, i) => `{ readonly t: ${i}; readonly k${i}: V | null }`).join(" | ")};\nconst g = () => { const u: U = { t: 0, k0: null }; const v: V = u; return 1; };`,
  "U-nonrecursive-to-V": (n) => `type U = ${Array.from({ length: n }, (_, i) => `{ readonly k${i}?: number }`).join(" | ")};\ntype V = ${Array.from({ length: n }, (_, i) => `{ readonly k${i}?: number }`).join(" | ")};\nconst g = () => { const u: U = {}; const v: V = u; return 1; };`,
};
for (const [name, mk] of Object.entries(fams).filter(([k]) => !process.argv[3] || k === process.argv[3])) {
  const line: string[] = [];
  for (const n of (process.argv[2] ?? "20,40,80").split(",").map(Number)) {
    const t0 = performance.now();
    let verdict = "";
    try { const r: any = checkSources({ cells: mk(n), tsx: true, outside: [], foreign: null } as never); const bad = r.cells.filter((c: any) => c.status !== "ok" || c.errors.length || c.unsupported.length); verdict = bad.length || r.module.length ? "REJECT" : "ACCEPT"; } catch (x) { verdict = `CRASH ${(x as Error).message.slice(0, 50)}`; }
    const ms = performance.now() - t0;
    line.push(`n=${n} ${ms.toFixed(0)}ms ${verdict}`);
    if (ms > 20000) break;
  }
  console.log(`${name}: ${line.join(" | ")}`);
}

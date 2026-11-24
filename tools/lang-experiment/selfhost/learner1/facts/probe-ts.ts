// bun probe-ts.ts <file exporting srcs>: probe.ts's verdict and diagnostics with tsx OFF (a .ts source)
import { checkSources } from "../../../lite/core.ts";
const { srcs } = await import(new URL(process.argv[2]!, `file://${process.cwd()}/`).pathname);
for (const [n, s] of srcs as [string, string][]) {
  let r: any;
  try { r = checkSources({ cells: s, tsx: false, outside: [], foreign: null } as any); } catch (x) { console.log(`${n}: CRASH ${(x as Error).message}`); continue; }
  const bad = r.cells.filter((c: any) => c.status !== "ok");
  const head = bad.length || r.module.length ? `REJECT ${[...r.module.map((m: any) => `module[${m.rule}]`), ...bad.map((c: any) => `${c.name}:${c.status}${c.errors.map((e: any) => `[${e.rule}]`).join("")}`)].join(" ")}` : r.cells.length ? "ACCEPT" : "NO CELLS";
  const d = [...r.module.map((m: any) => `module[${m.rule}] ${m.msg}`), ...r.cells.flatMap((c: any) => [...c.errors.map((e: any) => `${c.name}[${e.rule}] ${e.msg}`), ...c.unsupported.map((e: any) => `${c.name}{unsupported ${e.msg}}`)])].join(" || ");
  console.log(`${n} (.ts): ${head}${d ? "\n    " + d.slice(0, 600) : ""}`);
}

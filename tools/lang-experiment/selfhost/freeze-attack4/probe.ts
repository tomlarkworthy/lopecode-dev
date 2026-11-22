// bun probe.ts <file.ts exporting srcs: [name, src][]>: the checker's verdict (run-sets verdictOf, rules on) and every diagnostic
import { verdictOf } from "../../lite/infer/attack/run-sets.ts";
import { checkSources } from "../../lite/core.ts";
const { srcs } = await import(new URL(process.argv[2]!, `file://${process.cwd()}/`).pathname);
for (const [n, s] of srcs as [string, string][]) {
  const v = verdictOf(s, null, false);
  let d = "";
  if (!v.ok) try { const r: any = checkSources({ cells: s, tsx: true, outside: [], foreign: null } as any); d = [...r.module.map((m: any) => `module[${m.rule}] ${m.msg}`), ...r.cells.flatMap((c: any) => [...c.errors.map((e: any) => `${c.name}[${e.rule}] ${e.msg}`), ...c.unsupported.map((e: any) => `${c.name}{unsupported ${e.msg}}`)])].join(" || "); } catch {}
  console.log(`${n}: ${v.text.slice(0, 200)}${d ? "\n    " + d.slice(0, 600) : ""}`);
}

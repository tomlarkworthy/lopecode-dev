// bun selfhost/freeze-attack9/before-probe.ts <srcs file>: the verdict of each [name, src] under the checker of the tree
// before e1 (lite/soundscript/.scratch/e1/before/...), read only. Same verdict text as run-sets verdictOf (rules on).
import { checkSources } from "../../lite/soundscript/.scratch/e1/before/tools/lang-experiment/lite/core.ts";
const { srcs } = await import(new URL(process.argv[2]!, `file://${process.cwd()}/`).pathname);
for (const [n, s] of srcs as [string, string][]) {
  let text: string;
  try {
    const r: any = checkSources({ cells: s, tsx: true, outside: [], foreign: null } as any);
    const bad = r.cells.filter((c: any) => c.status !== "ok");
    text = bad.length || r.module.length ? `REJECT ${[...r.module.map((m: any) => `module[${m.rule}]`), ...bad.map((c: any) => `${c.name}:${c.status}${c.errors.map((e: any) => `[${e.rule}]`).join("")}`)].join(" ")}` : "ACCEPT";
    if (bad.length) text += "\n    " + bad.flatMap((c: any) => [...c.errors.map((e: any) => `${c.name}[${e.rule}] ${e.msg}`), ...c.unsupported.map((e: any) => `${c.name}{unsupported ${e.msg}}`)]).join(" || ").slice(0, 400);
  } catch (x) { text = `CRASH ${(x as Error).message}`; }
  console.log(`${n}: ${text}`);
}

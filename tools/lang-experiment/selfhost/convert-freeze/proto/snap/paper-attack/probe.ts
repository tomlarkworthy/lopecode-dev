// bun probe.ts <file.ts> [--only s]: each {name, src} in the file's `progs` through the live checker; prints verdict and diagnostics.
import { checkSources } from "../../../lite/core.ts";
const file = process.argv[2]!, only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const { progs } = await import(new URL(file, `file://${process.cwd()}/`).href);
for (const p of progs as { name: string; src: string }[]) {
  if (only && !p.name.includes(only)) continue;
  let line: string;
  try {
    const r = checkSources({ cells: p.src, tsx: true, outside: [], foreign: null } as any);
    const errs = [...r.module.map((e: any) => `module[${e.rule}] ${e.msg ?? e.message ?? ""}`),
      ...r.cells.flatMap((c: any) => [...c.errors.map((e: any) => `${c.name}[${e.rule}] ${e.msg ?? e.message ?? ""}`), ...(c.unsupported ?? []).map((u: any) => `${c.name}[unsupported] ${typeof u === "string" ? u : JSON.stringify(u)}`), ...(c.status !== "ok" && !c.errors.length ? [`${c.name}:${c.status} ${JSON.stringify(c.blockedBy ?? "")}`] : [])])];
    line = errs.length ? "REJECT\n    " + errs.join("\n    ") : "ACCEPT";
  } catch (x) { line = "CRASH " + (x as Error).message; }
  console.log(`${p.name}: ${line}`);
}

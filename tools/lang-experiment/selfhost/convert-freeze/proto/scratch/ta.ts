import { readFileSync } from "node:fs";
import { runCells, PROTO_LOG } from "../tree/lite/browser/run.ts";
import { conversionSites } from "../tree/lite/proto-sites.ts";
process.on("unhandledRejection", () => {});
for (const f of ["lite/notebook/examples/03-mut.ts", "lite/soundscript/spec-4.ts"]) {
  const src = readFileSync(new URL("../tree/" + f, import.meta.url), "utf8");
  const { sites, result } = conversionSites(src, true);
  console.log(f, "cells", result.cells.map((c: any) => `${c.name}:${c.status}`).join(" "));
  console.log("  sites", sites.map((s) => `${s.kind}@${src.slice(s.start, s.end).slice(0, 30)}`).join(" | "));
  const p = runCells(src, { tsx: true }); await p.settle(800);
  for (const r of p.recs.values()) if (r.status === "rejected") console.log("  error", r.name, String((r.error as Error).message).slice(0, 120));
  p.dispose();
}
process.exit(0);

// The inputs the checker's own tests check: every spec_rejects case (lite/soundscript/spec-cases.ts; tsx, with its
// outside cells, as verify.ts checks them), every fixtures/**/cells.ts(x), and the shipped lite/*.ss.ts.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { specRejects } from "../../lite/soundscript/spec-cases.ts";

const ROOT = join(import.meta.dir, "../..");
export type Input = { id: string; src: string; tsx: boolean; outside?: { name: string; view?: boolean }[]; shell?: string };

export function corpus(): Input[] {
  const out: Input[] = [];
  specRejects().forEach((c, i) => out.push({ id: `spec#${i} ${c.statement} ${c.rule}`, src: c.source, tsx: true, outside: c.outside, shell: c.shell }));
  const walk = (d: string) => {
    for (const f of readdirSync(d).sort()) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f === "cells.ts" || f === "cells.tsx") out.push({ id: p.slice(ROOT.length + 1), src: readFileSync(p, "utf8"), tsx: f.endsWith("x") });
    }
  };
  walk(join(ROOT, "fixtures"));
  for (const f of readdirSync(join(ROOT, "lite")).filter((f) => f.endsWith(".ss.ts")).sort()) out.push({ id: `lite/${f}`, src: readFileSync(join(ROOT, "lite", f), "utf8"), tsx: false });
  return out;
}

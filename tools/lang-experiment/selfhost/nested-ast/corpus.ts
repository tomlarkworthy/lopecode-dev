// The flat prototype's corpus (selfhost/flat-ast/corpus.ts), read from the snapshot in orig/ instead of lite/: every
// spec_rejects case (tsx, with its outside and shell cells), every fixtures/**/cells.ts(x), every orig/lite/*.ss.ts.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { specRejects } from "./orig/lite/soundscript/spec-cases.ts";

const ROOT = join(import.meta.dir, "../.."), ORIG = join(import.meta.dir, "orig/lite");
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
  for (const f of readdirSync(ORIG).filter((f) => f.endsWith(".ss.ts")).sort()) out.push({ id: `lite/${f}`, src: readFileSync(join(ORIG, f), "utf8"), tsx: false });
  return out;
}
if (import.meta.main) {
  const c = corpus();
  const h = new Bun.CryptoHasher("sha256");
  for (const x of c) h.update(x.id + "\0" + x.src + "\0");
  console.log(`${c.length} inputs, ${c.reduce((s, x) => s + x.src.length, 0)} chars, corpus hash ${h.digest("hex").slice(0, 12)}`);
}

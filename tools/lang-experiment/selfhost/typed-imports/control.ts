// bun selfhost/typed-imports/control.ts: with no imports, the ti entry gives what the shipped checkSources gives,
// over the corpus lite/infer/diff.ts checks (ports, fixtures, horde, examples, spec and tutorial files, the .ss.ts
// sections split into cells, the spec's reject rows with their outside and shell): every cell record, the module's
// errors and the facts. Each source twice: tiCheckSources alone, and as a program of one module (no foreign or shell).
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { checkSources, type Sources } from "../../lite/core.ts";
import { splitCells } from "../../lite/toolchain/ss-toolchain.ts";
import { specRejects } from "../../lite/soundscript/spec-cases.ts";
import { parse } from "../../lite/parse.ts";
import { programGlue, checkProgram, toLite } from "./ti-link.ts";
const ROOT = join(import.meta.dir, "../..");
const jobs: { key: string; src: Sources }[] = [];
const read = (d: string, f: string) => (existsSync(join(d, f)) ? readFileSync(join(d, f), "utf8") : null);
const dirs = new Set<string>();
for (const g of ["ports/*/cells.ts*", "fixtures/*/cells.ts*", "fixtures/*/*/cells.ts*", "port-editor5/*/cells.ts*", "horde/*/cells.ts*", "horde/cells.ts", "lite/browser/cells.ts"])
  for (const f of new Glob(g).scanSync(ROOT)) dirs.add(join(ROOT, f, ".."));
for (const d of [...dirs].sort()) {
  const tsx = !existsSync(join(d, "cells.ts")) && existsSync(join(d, "cells.tsx"));
  jobs.push({ key: `port:${d.slice(ROOT.length + 1)}`, src: { cells: read(d, tsx ? "cells.tsx" : "cells.ts") ?? "", tsx, foreign: read(d, "foreign.d.ts"), shell: read(d, "shell.ts"), name: d } });
}
for (const g of ["lite/notebook/examples/*.ts*", "lite/soundscript/spec-[0-9]*.ts*", "lite/soundscript/core-example.ts", "lite/soundscript/tutorial-*.tsx"])
  for (const f of [...new Glob(g).scanSync(ROOT)].sort()) jobs.push({ key: `file:${f}`, src: { cells: readFileSync(join(ROOT, f), "utf8"), tsx: f.endsWith(".tsx"), name: f } });
const headerEnd = (src: string) => { let at = 0; for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; } return at; };
for (const g of ["lite/*.ss.ts", "lite/acorn/*.ss.ts", "lite/infer/*.ss.ts", "selfhost/*.ss.ts", "selfhost/rt/*.ss.ts"]) for (const f of [...new Glob(g).scanSync(ROOT)].sort()) {
  const text = readFileSync(join(ROOT, f), "utf8");
  for (const tsx of [false, true]) { try { jobs.push({ key: `ss${tsx ? "x" : ""}:${f}`, src: { cells: splitCells(text.slice(headerEnd(text)).trimStart(), tsx).join("\n\n"), tsx } }); } catch {} }
}
for (const [i, c] of specRejects().entries()) jobs.push({ key: `reject:${c.statement}#${i}`, src: { cells: c.source, tsx: true, shell: c.shell ?? null, outside: c.outside ?? null, name: "r" } });

const view = (r: any) => JSON.stringify({ ok: r.ok, module: r.module, cells: r.cells, facts: [...(r.facts?.values() ?? [])] });
let same = 0, diff = 0, both = 0, prog = 0, progSame = 0;
const shown: string[] = [];
const G = programGlue();
for (const j of jobs) {
  let a: string, b: string;
  try { a = view(checkSources(j.src)); } catch (e) { a = `throw ${(e as Error).message}`; }
  const S = { cells: j.src.cells, tsx: !!j.src.tsx, foreign: j.src.foreign ?? null, shell: j.src.shell ?? null, name: j.src.name ?? null, outside: (j.src.outside ?? []).map((o) => ({ name: o.name, view: !!o.view })), probe: null, seeds: [], types: [], extra: [] };
  try { b = view(toLite(G.checkOne(S).result)); } catch (e) { b = `throw ${(e as Error).message}`; }
  if (a.startsWith("throw") && b.startsWith("throw")) both++;
  if (a === b) same++; else { diff++; if (shown.length < 5) shown.push(`${j.key}\n  shipped ${a.slice(0, 300)}\n  ti      ${b.slice(0, 300)}`); }
  // as a program of one module: the program always checks as tsx with no foreign or shell
  if (!j.src.foreign && !j.src.shell && j.src.tsx) {
    prog++;
    let c: string;
    try { c = view(toLite(checkProgram([{ name: j.src.name ?? "m", cells: j.src.cells, outside: S.outside, imports: [] }]).modules.get(j.src.name ?? "m")!.result)); } catch (e) { c = `throw ${(e as Error).message}`; }
    if (c === a) progSame++; else if (shown.length < 8) shown.push(`program ${j.key}\n  shipped ${a.slice(0, 300)}\n  program ${c.slice(0, 300)}`);
  }
}
console.log(`sources ${jobs.length}: same ${same} (both threw ${both}), different ${diff}; as a one-module program: ${progSame} of ${prog} same`);
for (const s of shown) console.log(s);

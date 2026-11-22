// bun selfhost/no-mut/run.ts [--module]: the census over late-code's corpus (diff.ts jobs(); --module: diff.ts's
// module-context supplement, plus module:rg, module:cp and module:tc, the checker's other cells in their module, which
// late-code's runs do not hold). Writes out/corpus.json or out/corpus-module.json, and checks the hooked checker's
// verdicts against plain checkSources on every cell.
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { jobs, moduleJobs, bucketOf, ROOT, type Job } from "../late-code/corpus.ts";
import { analyzeSource } from "./analyze.ts";
import { checkSources } from "../../lite/core.ts";
import { splitCells } from "../../lite/infer/frozen/ts/toolchain/ss-toolchain.ts";
import { parse } from "../../lite/infer/frozen/ts/parse.ts";
import { RG_FILES, CP_FILES } from "../../lite/infer-ss.ts";
import { TC_FILES } from "../../lite/toolchain/tc-index.ts";
const MODULE = process.argv.includes("--module");

function headerEnd(src: string): number {
  let at = 0;
  for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; }
  return at;
}
const ssTexts = (rel: string) => { const s = readFileSync(join(ROOT, "lite", rel), "utf8"); return splitCells(s.slice(headerEnd(s)).trimStart(), false); };
const INFER_WITH = ["types.ss.ts", "subtype.ss.ts", "walks.ss.ts", "island.ss.ts", "shape.ss.ts", "messages.ss.ts", "acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "acorn/syntax.ss.ts"];
function extraModules(): Job[] {
  const shell = readFileSync(join(ROOT, "lite/acorn/acorn-shell.ts"), "utf8");
  const mk = (key: string, files: string[]): Job => ({ key, src: { cells: files.flatMap(ssTexts).join("\n\n"), tsx: true, shell, name: key }, files: files.map((p) => join(ROOT, "lite", p)) });
  return [
    mk("module:rg", [...INFER_WITH, ...RG_FILES.map((f) => `infer/${f}`)]),
    mk("module:cp", [...INFER_WITH, ...CP_FILES.map((f) => `infer/${f}`)]),
    mk("module:tc", [...INFER_WITH, ...TC_FILES.map((f) => `toolchain/${f}`)]),
  ];
}

const fileCache = new Map<string, string[]>();
const linesOf = (f: string) => { let l = fileCache.get(f); if (!l) { l = readFileSync(f, "utf8").split("\n"); fileCache.set(f, l); } return l; };
// as late-code/run.ts: port/file jobs are the file; ss/sswith/module jobs, the one file holding lines n-1..n+1
function mapLine(job: Job, n: number): string {
  if (!job.src) return `?:${n}`;
  if (job.key.startsWith("port:") || job.key.startsWith("file:")) return `${job.files[0]!.slice(ROOT.length + 1)}:${n}`;
  if (!job.files.length) return `${job.key}:${n}`;
  const J = job.src.cells.split("\n");
  for (const w of [1, 0]) {
    const block = J.slice(Math.max(0, n - 1 - w), n + w).join("\n");
    if (block.trim().length < 8) continue;
    for (const f of job.files) {
      const text = linesOf(f).join("\n"), i = text.indexOf(block);
      if (i >= 0 && text.indexOf(block, i + 1) < 0) return `${f.slice(ROOT.length + 1)}:${text.slice(0, i).split("\n").length + Math.min(w, n - 1)}`;
    }
  }
  return `${job.key}:${n}(joined)`;
}

const out: any[] = [];
let mismatch = 0, threw = 0;
const t0 = performance.now();
const list = MODULE ? [...moduleJobs(), ...extraModules()] : jobs();
for (const job of list) {
  const bucket = MODULE ? job.key : bucketOf(job.key);
  if (!job.src) { out.push({ key: job.key, bucket, threw: job.err, cells: [] }); threw++; continue; }
  let rep;
  try { rep = analyzeSource(job.src); } catch (x) { out.push({ key: job.key, bucket, threw: (x as Error).message, cells: [] }); threw++; continue; }
  let plain: any = null;
  try { plain = checkSources(job.src); } catch (x) { plain = { cells: [], threw: (x as Error).message }; }
  const a = JSON.stringify(rep.cells.map((c) => [c.name, c.status, [...c.rules].sort()])), b = JSON.stringify(plain.cells.map((c: any) => [c.name, c.status, [...new Set(c.errors.map((e: any) => e.rule))].sort()]));
  if (a !== b) { mismatch++; console.log(`VERDICT MISMATCH ${job.key}`); }
  const ml = (n: number) => mapLine(job, n);
  out.push({
    key: job.key, bucket, aliasIs: rep.aliasIs, aliasHas: rep.aliasHas,
    outside: rep.outside.map((x) => ({ ...x, at: ml(x.line) })),
    cells: rep.cells.map((c) => ({
      ...c, at: ml(c.line),
      writes: c.writes.map((w) => ({ ...w, at: ml(w.line) })),
      passes: c.passes.map((p) => ({ ...p, at: ml(p.line) })),
      params: c.params.map((p) => ({ ...p, at: ml(p.line), fnAt: ml(p.fnLine) })),
      rets: c.rets.map((r) => ({ ...r, at: ml(r.line) })),
      explicit: c.explicit.map((x) => ({ ...x, at: ml(x.line) })),
    })),
  });
}
writeFileSync(join(import.meta.dir, MODULE ? "out/corpus-module.json" : "out/corpus.json"), JSON.stringify(out, null, 1));
const cells = out.reduce((s, j) => s + j.cells.length, 0);
console.log(`${out.length} sources, ${cells} cells, verdict mismatches ${mismatch}, sources that threw ${threw}, ${((performance.now() - t0) / 1000).toFixed(0)} s`);

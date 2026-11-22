// bun selfhost/late-code/run.ts: the census over diff.ts's corpus; writes out/corpus.json (every cell's report) and
// checks that the hooked checker's verdicts equal lite/core.ts checkSources' on every cell.
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { jobs, moduleJobs, bucketOf, ROOT } from "./corpus.ts";
const MODULE = process.argv.includes("--module");
import { analyzeSource } from "./analyze.ts";
import { checkSources } from "../../lite/core.ts";

const fileCache = new Map<string, string[]>();
const linesOf = (f: string) => { let l = fileCache.get(f); if (!l) { l = readFileSync(f, "utf8").split("\n"); fileCache.set(f, l); } return l; };
// a line of the joined text as file:line: port/file jobs are the file; ss jobs, the first file holding lines n-1..n+1
function mapLine(job: ReturnType<typeof jobs>[number], n: number): string {
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
let mismatch = 0, jobsThrew = 0;
const t0 = performance.now();
for (const job of MODULE ? moduleJobs() : jobs()) {
  if (!job.src) { out.push({ key: job.key, bucket: bucketOf(job.key), threw: job.err, cells: [] }); jobsThrew++; continue; }
  let rep;
  try { rep = analyzeSource(job.src); } catch (x) { out.push({ key: job.key, bucket: bucketOf(job.key), threw: (x as Error).message, cells: [] }); jobsThrew++; continue; }
  let plain: any = null;
  try { plain = checkSources(job.src); } catch (x) { plain = { cells: [], threw: (x as Error).message }; }
  const a = JSON.stringify(rep.cells.map((c) => [c.name, c.status, [...c.rules].sort()])), b = JSON.stringify(plain.cells.map((c: any) => [c.name, c.status, [...new Set(c.errors.map((e: any) => e.rule))].sort()]));
  if (a !== b) { mismatch++; console.log(`VERDICT MISMATCH ${job.key}`); }
  const ml = (n: number) => mapLine(job, n);
  out.push({
    key: job.key, bucket: MODULE ? job.key : bucketOf(job.key), module: rep.module,
    cells: rep.cells.map((c) => ({
      ...c, at: ml(c.line),
      fns: c.fns.map((f) => ({ ...f, at: ml(f.line) })),
      ya: c.ya.map((h) => ({ ...h, at: ml(h.fnLine), declAt: ml(h.declLine), uses: h.uses.map((u) => ({ ...u, at: ml(u.line) })) })),
      k: c.k.map((h) => ({ ...h, at: ml(h.fnLine) })),
      p: c.p.map((h) => ({ ...h, at: ml(h.fnLine) })),
    })),
  });
}
writeFileSync(join(import.meta.dir, MODULE ? "out/corpus-module.json" : "out/corpus.json"), JSON.stringify(out, null, 1));
const cells = out.reduce((s, j) => s + j.cells.length, 0);
console.log(`${out.length} sources, ${cells} cells, verdict mismatches ${mismatch}, sources that threw ${jobsThrew}, ${((performance.now() - t0) / 1000).toFixed(0)} s`);

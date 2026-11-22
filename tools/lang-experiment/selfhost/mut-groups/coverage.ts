// bun coverage.ts: through mtree/ (proto with a counter in owGroupEscapes), every MemberExpression the group rules see in
// the probes and the corpus, and how many have no recorded type (the rules skip those).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PROBES } from "./probes.ts";
const { checkSources } = await import(join(import.meta.dir, "mtree/lite/core.ts"));
const run = (label: string, xs: { src: any; opts: any }[]) => {
  const g = { members: 0, noType: 0, noObj: 0, noTypeOnMut: 0 };
  (globalThis as any).__cov = g;
  for (const x of xs) { try { checkSources(x.src, x.opts); } catch {} }
  console.log(`${label}: ${xs.length} jobs; member expressions ${g.members}, no type ${g.noType}, object has no type ${g.noObj}, no type on a Mut object ${g.noTypeOnMut}`);
};
run("probes", PROBES.map((p) => ({ src: { cells: p.src, tsx: true, shell: p.shell ?? null, outside: p.outside ?? null, name: p.id }, opts: undefined })));
const jobs = JSON.parse(readFileSync(join(import.meta.dir, "out/corpus.json"), "utf8")).filter((j: any) => j.src);
run("corpus", jobs);
// which corpus jobs have untyped member objects, and whether every cell of those jobs is ok
const hit: string[] = [];
for (const j of jobs) {
  const g = { members: 0, noType: 0, noObj: 0, noTypeOnMut: 0 }; (globalThis as any).__cov = g;
  let r: any = null; try { r = checkSources(j.src, j.opts); } catch {}
  if (g.noObj > 0) hit.push(`${j.key}: ${g.noObj} untyped; cells ${r ? r.cells.map((c: any) => c.status).join(",") : "crash"}`);
}
console.log(hit.join("\n"));

// bun corpus.ts: snapshot the differential corpus to out/corpus.json, once, so base and proto check the same text
// while other builders change the tree. The jobs are lite/infer/diff.ts jobs() (copied, 2026-11-22), with its
// --file probes (lite/infer/probes/*.ts*), its MODULE_PROBES, and infer.test.ts's self-check source (the WITH
// sections and every lite/infer cell, read from base/ so it is the copied checker checking itself).
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Glob } from "bun";
import * as acorn from "acorn";
import { parse } from "./base/lite/parse.ts";
import { splitCells } from "./base/lite/toolchain/ss-toolchain.ts";
import { specRejects } from "../../lite/soundscript/spec-cases.ts";
import { MODULE_PROBES } from "./base/lite/infer/probes/module.ts";

type Sources = { cells: string; tsx?: boolean; foreign?: string | null; shell?: string | null; name?: string; outside?: { name: string; view?: boolean }[] | null };
type Job = { key: string; src: Sources | null; err?: string; opts: { strictIndex?: boolean } };
const ROOT = resolve(import.meta.dir, "../..");
const HERE = import.meta.dir;
function headerEnd(src: string): number {
  let at = 0;
  for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; }
  return at;
}
const splitText = (s: string) => splitCells(s.slice(headerEnd(s)).trimStart(), false);
const ssTexts = (rel: string) => splitText(readFileSync(join(ROOT, "lite", rel), "utf8"));
const mk = (key: string, src: Sources, opts = {}): Job => ({ key, src, opts });
const ssJob = (key: string, text: string, tsx: boolean): Job => {
  try { return mk(key, { cells: splitCells(text, tsx).join("\n\n"), tsx }); } catch (x) { return { key, src: null, err: String(x), opts: {} }; }
};
const out: Job[] = [];
const read = (dir: string, f: string) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), "utf8") : null);
const dirs = new Set<string>();
for (const g of ["ports/*/cells.ts*", "fixtures/*/cells.ts*", "fixtures/*/*/cells.ts*", "port-editor5/*/cells.ts*", "horde/*/cells.ts*", "horde/cells.ts", "lite/browser/cells.ts"])
  for (const f of new Glob(g).scanSync(ROOT)) dirs.add(join(ROOT, f, ".."));
for (const d of [...dirs].sort()) {
  const tsx = !existsSync(join(d, "cells.ts")) && existsSync(join(d, "cells.tsx"));
  out.push(mk(`port:${d.slice(ROOT.length + 1)}`, { cells: read(d, tsx ? "cells.tsx" : "cells.ts") ?? "", tsx, foreign: read(d, "foreign.d.ts"), shell: read(d, "shell.ts"), name: d }));
}
for (const g of ["lite/notebook/examples/*.ts*", "lite/soundscript/spec-[0-9]*.ts*", "lite/soundscript/core-example.ts", "lite/soundscript/tutorial-*.tsx"])
  for (const f of [...new Glob(g).scanSync(ROOT)].sort()) out.push(mk(`file:${f}`, { cells: readFileSync(join(ROOT, f), "utf8"), tsx: f.endsWith(".tsx"), name: f }));
// selfhost/*.ss.ts is one level only: selfhost/mut-groups/** is not in it
for (const g of ["lite/*.ss.ts", "selfhost/*.ss.ts", "selfhost/rt/*.ss.ts", "lite/soundscript/.scratch/checker-port/probes/*.ss.ts"]) for (const f of [...new Glob(g).scanSync(ROOT)].sort()) {
  const text = readFileSync(join(ROOT, f), "utf8");
  for (const tsx of [false, true]) out.push(ssJob(`ss${tsx ? "x" : ""}:${f}`, text, tsx));
}
const ACORN_WITH: Record<string, string[]> = { "acorn/acorn-kids.ss.ts": ["acorn/acorn-types.ss.ts"], "acorn/acorn.ss.ts": ["acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts"], "acorn/syntax.ss.ts": ["acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "messages.ss.ts"] };
const ACORN_SHELL: Record<string, string> = { "acorn/acorn.ss.ts": "acorn/acorn-shell.ts", "acorn/syntax.ss.ts": "acorn/acorn-shell.ts" };
for (const f of [...new Glob("lite/acorn/*.ss.ts").scanSync(ROOT)].sort()) {
  const text = readFileSync(join(ROOT, f), "utf8");
  for (const tsx of [false, true]) out.push(ssJob(`ss${tsx ? "x" : ""}:${f}`, text, tsx));
  const rel = f.slice("lite/".length);
  const shell = ACORN_SHELL[rel] ? readFileSync(join(ROOT, "lite", ACORN_SHELL[rel]), "utf8") : null;
  out.push(mk(`sswith:${f}`, { cells: [...(ACORN_WITH[rel] ?? []), rel].flatMap(ssTexts).join("\n\n"), tsx: true, shell, name: rel }));
}
for (const [i, c] of specRejects().entries()) out.push(mk(`reject:${c.statement}#${i}`, { cells: c.source, tsx: true, shell: c.shell ?? null, outside: c.outside ?? null, name: "r" }));
for (const f of ["spec.ojs", "tutorial.ojs", "checker-tests.ojs", "runtime-tests.ojs", "core.ojs", ...readdirSync(join(ROOT, "lite/soundscript/sections")).map((x) => "sections/" + x)]) {
  const p = join(ROOT, "lite/soundscript", f);
  if (!existsSync(p) || !statSync(p).isFile()) continue;
  for (const cell of readFileSync(p, "utf8").split(/^\/\/ %%$/m)) {
    let ast: any;
    try { ast = acorn.parse(cell.replace(/^\s*viewof\s+/m, "").replace(/^\s*mutable\s+/m, ""), { ecmaVersion: "latest", sourceType: "module", allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true }); } catch { continue; }
    (function walk(n: any) {
      if (!n || typeof n.type !== "string") return;
      let s: string | null = null;
      if (n.type === "TemplateLiteral" && n.expressions.length === 0) s = n.quasis[0].value.cooked;
      if (n.type === "Literal" && typeof n.value === "string") s = n.value;
      if (s && /=>/.test(s) && /^\s*(const|type|interface|\/\/|function)/.test(s)) out.push(mk(`inline:${f}#${Bun.hash(s).toString(36)}`, { cells: s, tsx: true, name: "i" }));
      for (const key in n) { if (key === "loc") continue; const v = n[key]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") walk(v); }
    })(ast);
  }
}
// diff.ts --file: the infer probes
for (const f of [...new Glob("lite/infer/probes/*.ts*").scanSync(ROOT)].sort()) {
  if (f.endsWith("module.ts")) continue;
  out.push(mk(`extra:${f}`, { cells: readFileSync(join(ROOT, f), "utf8"), tsx: f.endsWith(".tsx"), name: f }));
}
for (const p of MODULE_PROBES) out.push(mk(`probe:${p.key}`, p.src as Sources, p.opts ?? {}));
// infer.test.ts's self-check, on the copied cells
const WITH = ["types.ss.ts", "subtype.ss.ts", "walks.ss.ts", "island.ss.ts", "shape.ss.ts", "messages.ss.ts", "acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "acorn/syntax.ss.ts"];
const INFER = [..."types core hides expr ops cond fn stmt flow lit call apply prelude jsx entry facts".split(" ").map((x) => `infer/ix-${x}.ss.ts`), ..."types tree capture pos place flow stmt loop action taint opaque entry".split(" ").map((x) => `infer/ow-${x}.ss.ts`), ..."types shape graph inject taint compile value run cell facts entry".split(" ").map((x) => `infer/md-${x}.ss.ts`)];
const baseTexts = (rel: string) => splitText(readFileSync(join(HERE, "base/lite", rel), "utf8"));
out.push(mk("self:infer", { cells: [...WITH, ...INFER].flatMap(baseTexts).join("\n\n"), tsx: true, shell: readFileSync(join(HERE, "base/lite/acorn/acorn-shell.ts"), "utf8"), name: "self" }));
writeFileSync(join(HERE, "out/corpus.json"), JSON.stringify(out));
console.log(`${out.length} jobs (${out.filter((j) => !j.src).length} that do not split); written ${new Date().toString()}`);

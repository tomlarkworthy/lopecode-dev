// The sources lite/infer/diff.ts checks: its jobs() copied (it is not exported, and diff.ts runs its passes on import).
// Each job carries what is needed to map a line back to a file: for ss/sswith jobs the joined cell texts, whose cell
// slices are verbatim slices of the files they came from (splitCells).
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { Glob } from "bun";
import * as acorn from "acorn";
import { parse } from "../../lite/infer/frozen/ts/parse.ts";
import { splitCells } from "../../lite/infer/frozen/ts/toolchain/ss-toolchain.ts";
import { specRejects } from "../../lite/soundscript/spec-cases.ts";
import type { Sources } from "../../lite/core.ts";

export const ROOT = resolve(import.meta.dir, "../..");
// texts: the files the cells came from, in order (ss jobs: one; sswith: the files before it, then it)
export type Job = { key: string; src: Sources | null; files: string[]; err?: string };
const mk = (key: string, src: Sources, files: string[] = []): Job => ({ key, src, files });
function headerEnd(src: string): number {
  let at = 0;
  for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; }
  return at;
}
const ssTexts = (rel: string) => { const s = readFileSync(join(ROOT, "lite", rel), "utf8"); return splitCells(s.slice(headerEnd(s)).trimStart(), false); };
const ssJob = (key: string, text: string, tsx: boolean, file: string): Job => {
  try { return mk(key, { cells: splitCells(text, tsx).join("\n\n"), tsx }, [file]); } catch (x) { return { key, src: null, files: [file], err: (x as Error).message }; }
};
export function jobs(): Job[] {
  const out: Job[] = [];
  const read = (dir: string, f: string) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), "utf8") : null);
  const dirs = new Set<string>();
  for (const g of ["ports/*/cells.ts*", "fixtures/*/cells.ts*", "fixtures/*/*/cells.ts*", "port-editor5/*/cells.ts*", "horde/*/cells.ts*", "horde/cells.ts", "lite/browser/cells.ts"])
    for (const f of new Glob(g).scanSync(ROOT)) dirs.add(join(ROOT, f, ".."));
  for (const d of [...dirs].sort()) {
    const tsx = !existsSync(join(d, "cells.ts")) && existsSync(join(d, "cells.tsx"));
    const file = join(d, tsx ? "cells.tsx" : "cells.ts");
    const src = { cells: read(d, tsx ? "cells.tsx" : "cells.ts") ?? "", tsx, foreign: read(d, "foreign.d.ts"), shell: read(d, "shell.ts"), name: d };
    out.push(mk(`port:${d.slice(ROOT.length + 1)}`, src, [file]));
  }
  for (const g of ["lite/notebook/examples/*.ts*", "lite/soundscript/spec-[0-9]*.ts*", "lite/soundscript/core-example.ts", "lite/soundscript/tutorial-*.tsx"])
    for (const f of [...new Glob(g).scanSync(ROOT)].sort()) {
      const cells = readFileSync(join(ROOT, f), "utf8"), tsx = f.endsWith(".tsx");
      out.push(mk(`file:${f}`, { cells, tsx, name: f }, [join(ROOT, f)]));
    }
  for (const g of ["lite/*.ss.ts", "selfhost/*.ss.ts", "selfhost/rt/*.ss.ts", "lite/soundscript/.scratch/checker-port/probes/*.ss.ts"]) for (const f of [...new Glob(g).scanSync(ROOT)].sort()) {
    const text = readFileSync(join(ROOT, f), "utf8");
    for (const tsx of [false, true]) out.push(ssJob(`ss${tsx ? "x" : ""}:${f}`, text, tsx, join(ROOT, f)));
  }
  const ACORN_WITH: Record<string, string[]> = { "acorn/acorn-kids.ss.ts": ["acorn/acorn-types.ss.ts"], "acorn/acorn.ss.ts": ["acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts"], "acorn/syntax.ss.ts": ["acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "messages.ss.ts"] };
  const ACORN_SHELL: Record<string, string> = { "acorn/acorn.ss.ts": "acorn/acorn-shell.ts", "acorn/syntax.ss.ts": "acorn/acorn-shell.ts" };
  for (const f of [...new Glob("lite/acorn/*.ss.ts").scanSync(ROOT)].sort()) {
    const text = readFileSync(join(ROOT, f), "utf8");
    for (const tsx of [false, true]) out.push(ssJob(`ss${tsx ? "x" : ""}:${f}`, text, tsx, join(ROOT, f)));
    const rel = f.slice("lite/".length);
    const shell = ACORN_SHELL[rel] ? readFileSync(join(ROOT, "lite", ACORN_SHELL[rel]), "utf8") : null;
    const parts = [...(ACORN_WITH[rel] ?? []), rel];
    out.push(mk(`sswith:${f}`, { cells: parts.flatMap(ssTexts).join("\n\n"), tsx: true, shell, name: rel }, parts.map((p) => join(ROOT, "lite", p))));
  }
  for (const [i, c] of specRejects().entries())
    out.push(mk(`reject:${c.statement}#${i}`, { cells: c.source, tsx: true, shell: c.shell ?? null, outside: c.outside ?? null, name: "r" }));
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
        if (s && /=>/.test(s) && /^\s*(const|type|interface|\/\/|function)/.test(s)) {
          const text = s;
          out.push(mk(`inline:${f}#${Bun.hash(text).toString(36)}`, { cells: text, tsx: true, name: "i" }));
        }
        for (const key in n) { if (key === "loc") continue; const v = n[key]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") walk(v); }
      })(ast);
    }
  }
  return out;
}
// the bucket a job's cells are reported under
export function bucketOf(key: string): string {
  if (key.startsWith("port:fixtures/")) return "fixtures";
  if (key.startsWith("port:")) return "ports";
  if (key.startsWith("reject:")) return "spec-rejects";
  if (key.includes(".scratch/checker-port/probes/")) return "probes";
  if (key.startsWith("file:") || key.startsWith("inline:")) return "tutorial/spec/examples";
  return "checker/toolchain";
}
// diff.ts moduleJobs' module-context sources, as a supplement outside the 3629: the sections checked with the sections
// they take (SS_WITH), the checker's own module (lite/infer with INFER_WITH in front) and the tutorial dump
const SS_WITH: Record<string, string[]> = { "shape.ss.ts": ["types.ss.ts"], "store.ss.ts": ["events.ss.ts"], "render.ss.ts": ["runtime.ss.ts"], "cross.ss.ts": ["runtime.ss.ts"], "subtype.ss.ts": ["types.ss.ts"], "walks.ss.ts": ["types.ss.ts", "subtype.ss.ts"] };
const INFER_WITH = ["types.ss.ts", "subtype.ss.ts", "walks.ss.ts", "island.ss.ts", "shape.ss.ts", "messages.ss.ts", "acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "acorn/syntax.ss.ts"];
export function moduleJobs(): Job[] {
  const out: Job[] = [];
  for (const [f, w] of Object.entries(SS_WITH)) out.push(mk(`sswith:lite/${f}`, { cells: [...w, f].flatMap(ssTexts).join("\n\n"), tsx: true, name: f }, [...w, f].map((p) => join(ROOT, "lite", p))));
  const { IX_FILES, OW_FILES, MD_FILES } = INFER_FILES;
  const infer = [...INFER_WITH, ...[...IX_FILES, ...OW_FILES, ...MD_FILES].map((f) => `infer/${f}`)];
  out.push(mk("module:lite/infer", { cells: infer.flatMap(ssTexts).join("\n\n"), tsx: true, shell: readFileSync(join(ROOT, "lite/acorn/acorn-shell.ts"), "utf8"), name: "infer" }, infer.map((p) => join(ROOT, "lite", p))));
  const tut = join(ROOT, "lite/soundscript/.scratch/switch-cost/tutorial.json");
  if (existsSync(tut)) { const j = JSON.parse(readFileSync(tut, "utf8")); out.push(mk("module:tutorial", { cells: j.texts.join("\n\n"), tsx: true, outside: j.outside }, [])); }
  return out;
}
import * as INFER_FILES from "../../lite/infer-ss.ts";

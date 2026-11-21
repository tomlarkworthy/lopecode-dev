// Inventory of @tomlarkworthy/soundscript-runtime: each generated cell, the TypeScript declaration(s) it comes
// from, the file and the declaration's line count (from the parse). Writes out/runtime-inventory.json.
// Run: bun selfhost/port-rest/runtime-inventory.ts (copy of selfhost/runtime-inventory.ts, output to port-rest/out)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compiler } from "../../../spec-notebook.ts";
import { generate, ENTRY } from "../../lite/soundscript/ts-cells.ts";
import { parse, type Node } from "../../lite/parse.ts";
import * as acorn from "acorn";

const LITE = join(import.meta.dir, "../../lite");
const FILES = ["../prelude.runtime.ts", "types.ss.ts", "boundary.ts", "jsx/h.ts", "jsx/render.ts", "browser/cells.ts", "browser/workers.ts", "stdlib/runtime.ts"];
type Decl = { file: string; name: string; lines: number; kind: string; start: number; end: number };
const decls = new Map<string, Decl>();
for (const f of FILES) {
  const src = readFileSync(join(LITE, f), "utf8");
  const P = parse(src);
  for (const s of P.program.body as Node[]) {
    const d: Node = s.type === "ExportNamedDeclaration" && s.declaration ? s.declaration : s;
    const names: string[] = [];
    if (d.type === "FunctionDeclaration" || d.type === "ClassDeclaration") names.push(d.id.name);
    else if (d.type === "VariableDeclaration") for (const x of d.declarations) { if (x.id.type === "Identifier") names.push(x.id.name); }
    else continue;
    const lines = P.line(s.end) - P.line(s.start) + 1;
    for (const n of names) decls.set(n, { file: f, name: n, lines: d.type === "VariableDeclaration" && d.declarations.length > 1 ? 1 : lines, kind: d.type === "VariableDeclaration" ? d.kind : d.type, start: s.start, end: s.end });
  }
}
// the names a group cell's body declares at its top level, from the parse of its definition
function declaredIn(def: string): string[] {
  const fn: any = (acorn.parse(`(${def})`, { ecmaVersion: "latest" }) as any).body[0].expression;
  const out: string[] = [];
  for (const s of fn.body.body) {
    if ((s.type === "FunctionDeclaration" || s.type === "ClassDeclaration") && s.id) out.push(s.id.name);
    else if (s.type === "VariableDeclaration") for (const x of s.declarations) if (x.id.type === "Identifier") out.push(x.id.name);
  }
  return out;
}
const { compile, dispose } = await compiler();
const ssKeys = Object.keys(await import(ENTRY)).filter((k) => k !== "default").sort();
const g = generate(compile, ssKeys);
dispose();
const grouped = new Set<string>();
for (const src of g.runtime) for (const v of compile(src)) if (v._name?.endsWith("_cells")) declaredIn(String(v._definition)).forEach((n) => grouped.add(n));
const rows: { cell: string; inputs: string[]; decls: string[]; file: string; lines: number; kind: string }[] = [];
for (const src of g.runtime) {
  for (const v of compile(src)) {
    const name = v._name ?? null;
    if (!name) continue;
    const def = String(v._definition);
    // a group cell X_cells holds several declarations; its projections are one line each
    // a projection X = X_cells.X has no lines of its own
    const own = name.endsWith("_cells") ? declaredIn(def).filter((n) => decls.has(n)) : decls.has(name) && !grouped.has(name) ? [name] : [];
    const ds = own.map((n) => decls.get(n)!);
    rows.push({ cell: name, inputs: v._inputs ?? [], decls: own, file: ds[0]?.file ?? (grouped.has(name) ? decls.get(name)!.file : "(generated)"), lines: ds.reduce((a, d) => a + d.lines, 0), kind: ds.map((d) => d.kind).join(",") });
  }
}
writeFileSync(join(import.meta.dir, "out/runtime-inventory.json"), JSON.stringify(rows, null, 1));
const byFile = new Map<string, { cells: number; lines: number }>();
for (const r of rows) { const b = byFile.get(r.file) ?? { cells: 0, lines: 0 }; b.cells++; b.lines += r.lines; byFile.set(r.file, b); }
for (const r of rows) console.log(`${r.cell}\t${r.file}\t${r.lines}\t${r.kind}\t${r.decls.length > 1 ? r.decls.join(",") : ""}\t[${r.inputs.join(",")}]`);
console.log(`${rows.length} named cells`);
for (const [f, b] of byFile) console.log(`${f}: ${b.cells} cells, ${b.lines} lines`);

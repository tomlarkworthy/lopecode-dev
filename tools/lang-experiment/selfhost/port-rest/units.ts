// The remaining unchecked runtime files split into units on the AST (lite/parse.ts): each top-level statement,
// and for a function of more than 20 lines its top-level inner declarations too. Each unit's class comes from
// verdicts.ts (a: decision over plain data, could be a checked cell; b: inherently shell; c: blocked by a checker
// limit; t: a type declaration; i: import/re-export; m: mixed, see verdicts.ts). Prints one row per unit and the totals.
// Run: bun selfhost/port-rest/units.ts [--dump]   (--dump: units with no verdict marked "?")
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, type Node } from "../../lite/parse.ts";
import { VERDICTS, kindVerdict } from "./verdicts.ts";

const ROOT = join(import.meta.dir, "../..");
export const FILES = ["lite/boundary.ts", "lite/jsx/h.ts", "lite/browser/workers.ts", "lite/stdlib/runtime.ts", "lite/browser/cells.ts", "prelude.runtime.ts", "lite/jsx/render.ts"];
export type Unit = { file: string; name: string; kind: string; lines: number; inner: boolean };

const namesOf = (s: Node): string[] => {
  const d: Node = (s.type === "ExportNamedDeclaration" || s.type === "ExportDefaultDeclaration") && s.declaration ? s.declaration : s;
  if (d.type === "FunctionDeclaration" || d.type === "ClassDeclaration") return [d.id.name];
  if (d.type === "VariableDeclaration") return d.declarations.map((x: Node) => (x.id.type === "Identifier" ? x.id.name : "(pattern)"));
  if (d.type === "TSTypeAliasDeclaration" || d.type === "TSInterfaceDeclaration") return [`type ${d.id.name}`];
  if (s.type === "ImportDeclaration") return [`import ${s.source.value}`];
  if (s.type === "ExportNamedDeclaration" || s.type === "ExportAllDeclaration") return [`export from ${s.source?.value ?? "(local)"}`];
  return [`(${s.type} L${s.loc.start.line})`];
};
const fnBody = (s: Node): Node | null => {
  const d: Node = s.type === "ExportNamedDeclaration" && s.declaration ? s.declaration : s;
  if (d.type === "FunctionDeclaration") return d.body;
  if (d.type === "VariableDeclaration" && d.declarations.length === 1) {
    const init = d.declarations[0].init;
    if (init && /Function/.test(init.type) && init.body.type === "BlockStatement") return init.body;
  }
  return null;
};

export function units(): Unit[] {
  const out: Unit[] = [];
  for (const file of FILES) {
    const P = parse(readFileSync(join(ROOT, file), "utf8"));
    for (const s of P.program.body as Node[]) {
      const lines = P.line(s.end) - P.line(s.start) + 1;
      const d: Node = s.type === "ExportNamedDeclaration" && s.declaration ? s.declaration : s;
      const kind = d.type === "VariableDeclaration" ? d.kind : d.type;
      const names = namesOf(s);
      names.forEach((name) => out.push({ file, name, kind, lines: names.length > 1 ? (name === names[0] ? lines : 0) : lines, inner: false }));
      const body = lines > 20 ? fnBody(s) : null;
      if (body) for (const x of body.body as Node[]) {
        const n = namesOf(x)[0];
        if (n.startsWith("(")) continue;
        out.push({ file, name: `${names[0]}.${n}`, kind: x.type === "VariableDeclaration" ? x.kind : x.type, lines: P.line(x.end) - P.line(x.start) + 1, inner: true });
      }
    }
  }
  return out;
}

if (import.meta.main) {
  const dump = process.argv.includes("--dump");
  const us = units();
  const tot = new Map<string, { n: number; lines: number }>();
  const add = (k: string, l: number) => { const t = tot.get(k) ?? { n: 0, lines: 0 }; t.n++; t.lines += l; tot.set(k, t); };
  for (const u of us) {
    const v = VERDICTS[`${u.file}:${u.name}`] ?? kindVerdict(u.kind);
    const cls = v?.cls ?? "?";
    if (!dump && !v) continue;
    console.log(`${u.file}\t${u.name}\t${u.kind}\t${u.lines}\t${cls}\t${v?.why ?? ""}`);
    if (!u.inner) { add(`${u.file} ${cls}`, u.lines); add(`ALL ${cls}`, u.lines); }
  }
  console.log("\ntotals (top-level units only; inner units are part of their function's lines)");
  for (const [k, t] of [...tot].sort()) console.log(`${k}\t${t.n} units\t${t.lines} lines`);
}

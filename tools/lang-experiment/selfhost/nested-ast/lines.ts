// Code lines (lines holding a non-comment token, as checker-survey/inventory.ts and ../flat-ast/lines.ts count) of each
// original (orig/ snapshot) and its nested port, located on the AST; each port cell's size; the generated files.
// Run: bun lines.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "./orig/lite/parse.ts";

const HERE = import.meta.dir, L = join(HERE, "orig/lite");
export function codeLines(file: string, from = 0, to = Infinity): number {
  const src = readFileSync(file, "utf8"), P = parse(src);
  const inComment = new Uint8Array(src.length);
  for (const c of P.comments) inComment.fill(1, c.start, c.end);
  const lines = new Set<number>();
  for (let i = Math.max(0, from); i < Math.min(src.length, to); i++) if (!inComment[i] && src[i]!.trim() !== "") lines.add(P.line(i));
  return lines.size;
}
const top = (file: string) => parse(readFileSync(file, "utf8"));
const declName = (s: any) => { const d = s.type === "ExportNamedDeclaration" && s.declaration ? s.declaration : s; return d.id?.name ?? d.declarations?.[0]?.id?.name ?? null; };
export function linesOf(file: string, names: string[]): number {
  const P = top(file);
  const found = P.program.body.filter((s: any) => names.includes(declName(s)));
  if (found.length !== names.length) throw new Error(`${file}: found ${found.map(declName)} of ${names}`);
  return found.reduce((n: number, s: any) => n + codeLines(file, s.start, s.end), 0);
}
export function cellsOf(file: string) {
  return top(file).program.body.filter((s: any) => s.type === "ExportNamedDeclaration" && s.declaration?.type === "VariableDeclaration").map((s: any) => ({ name: declName(s), lines: codeLines(file, s.start, s.end) }));
}
// checkSources' module-shape statements, as ../flat-ast/lines.ts shapeLoopLines counts them
function shapeLoopLines(): number {
  const file = join(L, "core.ts"), P = top(file);
  const cs = P.program.body.map((s: any) => (s.type === "ExportNamedDeclaration" ? s.declaration : s)).find((d: any) => d?.type === "FunctionDeclaration" && d.id.name === "checkSources");
  const body = cs.body.body;
  const from = body.findIndex((s: any) => s.type === "VariableDeclaration" && s.declarations[0].id.name === "cells");
  const seenAt = body.findIndex((s: any) => s.type === "VariableDeclaration" && s.declarations[0].id.name === "seen");
  return body.slice(from, seenAt + 2).reduce((n: number, s: any) => n + codeLines(file, s.start, s.end), 0);
}
export const GROUPS: [string, () => number, string[]][] = [
  ["module shape", shapeLoopLines, ["kindOf", "FnNode", "ModErr", "CellDef", "Found", "declOf", "typeClash", "isTypeStatement", "declaratorCell", "moduleLevelRule", "statementCells", "moduleShape"]],
  ["syntax pass", () => linesOf(join(L, "core.ts"), ["syntaxPass", "SYNTAX", "TYPE_POSITIONS"]), ["Diag", "SYNTAX", "TYPE_POSITIONS", "namedByParent", "argumentsAsName", "isAsConst", "bansAt", "syntaxPass"]],
  ["captures", () => linesOf(join(L, "capture.ts"), ["isActionCall", "refs", "bound", "declaredIn", "captures"]), ["Capture", "isActionCall", "kids", "readsBinding", "refs", "bound", "declaredIn", "Local", "localsOf", "spreadTaint", "actionUses", "captures"]],
];
if (import.meta.main) {
  const N = join(HERE, "visit-n.ss.ts");
  let o = 0, p = 0;
  for (const [name, orig, port] of GROUPS) { const a = orig(), b = linesOf(N, port); o += a; p += b; console.log(`${name}: original ${a} code lines; nested port ${b}`); }
  console.log(`total: original ${o}; nested port ${p} (×${(p / o).toFixed(2)}); flat port A 215 against 134 (../flat-ast/out/lines.txt)`);
  console.log(`line + leading: nested port ${linesOf(N, ["lineOf", "leading"])}; parsed (the outside cell) ${linesOf(N, ["parsed"])}`);
  const cs = cellsOf(N);
  console.log(`visit-n.ss.ts: ${cs.length} cells, ${codeLines(N)} code lines; largest ${cs.toSorted((a, b) => b.lines - a.lines).slice(0, 5).map((c) => `${c.name} ${c.lines}`).join(", ")}`);
  for (const f of ["kids-n.ss.ts", "ast-n.ss.ts", "adapter.ts", "gen.ts"]) console.log(`${f}: ${codeLines(join(HERE, f))} code lines`);
  for (const f of ["visit-own.ss.ts"]) { try { const c = cellsOf(join(HERE, f)); console.log(`${f}: ${c.length} cells, ${codeLines(join(HERE, f))} code lines; largest ${c.toSorted((a, b) => b.lines - a.lines).slice(0, 4).map((x) => `${x.name} ${x.lines}`).join(", ")}`); } catch {} }
}
// where the port's lines go: per group, type declarations, cell header and closing lines (2 per multi-line cell), and
// the rest (bodies); the original's function headers and closers are counted the same way (2 per multi-line function)
if (import.meta.main) {
  const N = join(HERE, "visit-n.ss.ts"), P = top(N);
  const node = (name: string) => P.program.body.find((s: any) => declName(s) === name);
  for (const [name, , port] of GROUPS) {
    let types = 0, frame = 0, body = 0, cells = 0, multi = 0;
    for (const n of port) {
      const s = node(n), k = codeLines(N, s.start, s.end);
      if (s.declaration?.type === "TSTypeAliasDeclaration") { types += k; continue; }
      cells++;
      if (k > 1) { multi++; frame += 2; body += k - 2; } else body += k;
    }
    console.log(`  ${name}: ${cells} cells (${multi} multi-line), type declarations ${types}, cell header+closer ${frame}, bodies ${body}`);
  }
  const fnFrames = (file: string, names: string[]) => { const Q = top(file); let f = 0, b = 0; for (const s of Q.program.body.filter((s: any) => names.includes(declName(s)))) { const k = codeLines(file, s.start, s.end); if (k > 1 && (s.type === "FunctionDeclaration" || s.declaration?.type === "FunctionDeclaration")) { f += 2; b += k - 2; } else b += k; } return `function header+closer ${f}, bodies ${b}`; };
  console.log(`  original syntax pass: ${fnFrames(join(L, "core.ts"), ["syntaxPass", "SYNTAX", "TYPE_POSITIONS"])}; original captures: ${fnFrames(join(L, "capture.ts"), ["isActionCall", "refs", "bound", "declaredIn", "captures"])}`);
}
if (import.meta.main) {
  const O = join(HERE, "visit-own.ss.ts");
  const cs = cellsOf(O), all = top(O).program.body.map(declName);
  console.log(`identity visitor: capture.ts opaqueCaptures ${linesOf(join(L, "capture.ts"), ["opaqueCaptures"])} code lines; port (visit-own.ss.ts, all ${all.length} declarations) ${codeLines(O)}; ${cs.length} cells, largest ${cs.toSorted((a, b) => b.lines - a.lines).slice(0, 3).map((c) => `${c.name} ${c.lines}`).join(", ")}`);
  console.log(`  own.ts actionEscapes ${linesOf(join(L, "own.ts"), ["actionEscapes"])} code lines, ownership ${linesOf(join(L, "own.ts"), ["ownership"])} (not ported)`);
}

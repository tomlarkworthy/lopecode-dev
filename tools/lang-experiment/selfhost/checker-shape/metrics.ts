// Sizes from the parse (lite/parse.ts): per shape, its cells and their code lines (lines holding a token outside a
// comment, as selfhost/checker-survey/inventory.ts counts them); for shape A also its local functions; and the
// original Checker members the slice ports, from inventory(). Writes out/metrics.txt.
// Run: bun selfhost/checker-shape/metrics.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, kids, type Node } from "../../lite/parse.ts";
import { inventory, sha } from "../checker-survey/inventory.ts";

const HERE = import.meta.dir;
type Unit = { name: string; code: number; chars: number; widest: number };
function units(file: string, dir = HERE): { cells: Unit[]; locals: Unit[]; span: (name: string, s: number, e: number) => Unit } {
  const src = readFileSync(join(dir, file), "utf8");
  const P = parse(src);
  const commentChars = new Uint8Array(src.length);
  for (const c of P.comments) commentChars.fill(1, c.start, c.end);
  const code = (s: number, e: number) => { const set = new Set<number>(); for (let i = s; i < e; i++) if (!commentChars[i] && src[i]!.trim() !== "") set.add(P.line(i)); return set.size; };
  const cells: Unit[] = [], locals: Unit[] = [];
  // chars: non-blank characters outside comments; widest: the longest physical line of the span
  const chars = (s: number, e: number) => { let c = 0; for (let i = s; i < e; i++) if (!commentChars[i] && src[i]!.trim() !== "") c++; return c; };
  const widest = (s: number, e: number) => Math.max(...src.slice(s, e).split("\n").map((l) => l.length));
  const unit = (name: string, s: number, e: number): Unit => ({ name, code: code(s, e), chars: chars(s, e), widest: widest(s, e) });
  const walk = (n: Node) => { if (n.type === "FunctionDeclaration") locals.push(unit(n.id.name, n.start, n.end)); for (const k of kids(n)) walk(k); };
  for (const s of P.program.body as Node[]) {
    if (dir !== HERE) break;
    const d = s.type === "ExportNamedDeclaration" ? s.declaration : null;
    if (d?.type !== "VariableDeclaration") continue;
    for (const x of d.declarations) { cells.push(unit(x.id.name, s.start, s.end)); walk(x.init); }
  }
  return { cells, locals, span: unit };
}
const stats = (us: Unit[]) => {
  const xs = us.map((u) => u.code).sort((a, b) => a - b);
  const max = us.reduce((a, b) => (b.code > a.code ? b : a), us[0]!);
  const cs = us.map((u) => u.chars ?? 0).sort((a, b) => a - b), w = Math.max(...us.map((u) => u.widest ?? 0));
  return `${us.length} units, total ${xs.reduce((a, b) => a + b, 0)}, largest ${max.code} (${max.name}), median ${xs[Math.floor((xs.length - 1) / 2)]}; chars total ${cs.reduce((a, b) => a + b, 0)}, median ${cs[Math.floor((cs.length - 1) / 2)]}; widest line ${w}`;
};
const out: string[] = [`lite/infer.ts@${sha("lite/infer.ts")} lite/registry.ts@${sha("lite/registry.ts")} lite/types.ss.ts@${sha("lite/types.ss.ts")}`];
const common = units("common.ss.ts");
out.push(`common.ss.ts (shared by every shape; regView stand-in included): cells ${stats(common.cells)}`);
for (const [shape, files] of [["A", ["shapeA.ss.ts"]], ["B", ["tablesB.ss.ts", "shapeB.ss.ts"]], ["B2", ["tablesB2.ss.ts", "shapeB.ss.ts"]], ["C", ["shapeC.ss.ts"]]] as const) {
  const u = files.map((f) => units(f));
  const cells = u.flatMap((x) => x.cells), locals = u.flatMap((x) => x.locals);
  out.push(`shape ${shape} (${files.join(" + ")}): cells ${stats(cells)}`);
  if (locals.length) out.push(`  local functions: ${stats(locals)}`);
  out.push(`  cells: ${cells.map((c) => `${c.name} ${c.code}`).join(", ")}`);
}
// the original members of the slice: stateful (the cycle) and the pure ones common.ss.ts holds
const STATEFUL = ["err", "unsupported", "rec", "declare", "pathKey", "memberMissing", "expect", "check", "check1", "infer", "infer1", "ident", "member", "call", "apply", "conditional", "cond", "numeric", "binary", "unary", "stmts", "block", "stmt", "varDecl", "returned"];
const PURE = ["um", "filter", "truthy", "falsy", "nonNullish", "nonUndef", "typeTag", "narrowTypeof", "narrowEq", "narrowByProp", "join", "logicalType", "intrinsicName", "noOverlap", "awaited", "settled", "ctxOnly", "collapseArrays"];
const inv = inventory().filter((d) => d.file === "lite/infer.ts");
const orig = units("lite/infer.ts", join(HERE, "../.."));
const at = (full: string, name: string): Unit => { const d = inv.find((x) => x.name === full); return d ? { ...orig.span(name, d.start, d.end), code: d.code } : { name, code: NaN, chars: NaN, widest: NaN }; };
const pick = (names: string[]) => names.map((n) => at(`Checker.${n}`, n));
const stateful = [...pick(STATEFUL), at("Scope.get", "Scope.get")];
out.push(`original stateful members (whole bodies, before the cuts): ${stats(stateful)}`);
out.push(`  ${stateful.map((u) => `${u.name} ${u.code}`).join(", ")}`);
out.push(`original pure members: ${stats(pick(PURE))}`);
const text = out.join("\n") + "\n";
writeFileSync(join(HERE, "out/metrics.txt"), text);
console.log(text);

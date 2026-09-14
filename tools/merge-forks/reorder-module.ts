// Reorders one module's cells by a layout that names every cell once, inserts new cells, and rewrites whole
// cell consts. Existing $def lines (pid, name, deps) are kept byte for byte; module and import defines stay
// directly after the first cell, where the exporter writes them.
//
// run: bun tools/merge-forks/reorder-module.ts <layout.json> [--out <notebook.html>] [--dry-run]
//   layout.json: {notebook, module,
//                 order: [pid | {pid, name, deps, code}],   code is one `const <pid> = …`
//                 rewrite?: [{pid, code}]}                   code is one `const <the cell's const> = …`, deps unchanged
import { readFileSync } from "node:fs";
import * as acorn from "acorn";
import { blocks, blockContent, guardedWrite } from "../lib/notebook-blocks.ts";
import { analyse } from "./define-body.ts";

const args = process.argv.slice(2);
const opt = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const layout = JSON.parse(readFileSync(args[0], "utf8"));
const out = opt("--out") ?? layout.notebook;
const prev = readFileSync(layout.notebook, "utf8");
const src = blockContent(prev, layout.module);
if (src == null) throw new Error(`${layout.notebook} has no block ${layout.module}`);

const SEP = "  \n  ";
const parse = (text: string) => acorn.parse(text, { ecmaVersion: "latest", sourceType: "module" }) as any;
const constName = (code: string) => {
  const body = parse(code).body;
  if (body.length !== 1 || body[0].type !== "VariableDeclaration" || body[0].declarations.length !== 1) throw new Error(`not one const: ${code.slice(0, 60)}`);
  return body[0].declarations[0].id.name as string;
};

const a = analyse(src);
const ast = parse(src);
const define = ast.body.find((n: any) => n.type === "ExportDefaultDeclaration");
const constNodes = ast.body.filter((n: any) => n.type === "VariableDeclaration");
if (constNodes.some((n: any) => n.start > define.start)) throw new Error("a top-level const follows the define function");
const cells = a.stmts.filter((s) => s.kind === "cell");
const byPid = new Map(cells.map((c) => [c.pid!, c]));
const fnOf = (c: (typeof cells)[number]) => (c as any).fn ?? c.pid!;

const rewrites = new Map<string, string>();
for (const { pid, code } of layout.rewrite ?? []) {
  const c = byPid.get(pid);
  if (!c) throw new Error(`rewrite ${pid}: not a cell`);
  if (constName(code) !== fnOf(c)) throw new Error(`rewrite ${pid}: code must be \`const ${fnOf(c)} = …\``);
  rewrites.set(pid, code);
}

const placed = new Set<string>();
const consts: string[] = [], defs: string[] = [];
for (const entry of layout.order) {
  if (typeof entry === "string") {
    const c = byPid.get(entry);
    if (!c) throw new Error(`order: ${entry} is not a cell of ${layout.module}`);
    if (placed.has(entry)) throw new Error(`order: ${entry} is placed twice`);
    placed.add(entry);
    consts.push(rewrites.get(entry) ?? a.consts.get(fnOf(c))!.text);
    defs.push(c.text);
  } else {
    const { pid, name = null, deps, code } = entry;
    if (byPid.has(pid) || placed.has(pid)) throw new Error(`order: new cell ${pid} collides with a pid`);
    if (constName(code) !== pid) throw new Error(`order: code for ${pid} must be \`const ${pid} = …\``);
    placed.add(pid);
    consts.push(code);
    defs.push(`$def(${JSON.stringify(pid)}, ${JSON.stringify(name)}, ${JSON.stringify(deps)}, ${pid});`);
  }
}
const unplaced = cells.filter((c) => !placed.has(c.pid!)).map((c) => c.pid);
if (unplaced.length) throw new Error(`order leaves out ${unplaced.join(", ")}`);
const owned = new Set(cells.map(fnOf));
const stray = [...a.consts.keys()].filter((k) => !owned.has(k));
if (stray.length) throw new Error(`top-level consts that belong to no cell: ${stray.join(", ")}`);

const first = cells[0], last = cells.at(-1)!;
const between = a.stmts.filter((s) => s.start > first.start && s.end <= last.end && s.kind !== "cell");
const odd = between.filter((s) => s.kind !== "module" && s.kind !== "import");
if (odd.length) throw new Error(`statements between cells that are not module or import defines: ${odd.map((s) => s.text.slice(0, 40)).join(" | ")}`);
if (layout.order[0] !== first.pid) throw new Error(`order must start with the first cell, ${first.pid}, which the module and import defines follow`);

const body = src.slice(define.start, first.start) + [defs[0], ...between.map((s) => s.text), ...defs.slice(1)].join(SEP) + src.slice(last.end);
const merged = src.slice(0, constNodes[0].start) + consts.join("\n") + src.slice(constNodes.at(-1).end, define.start) + body;

// read back: same statements as before plus the new cells, every const owned, no duplicate pid
const final = analyse(merged);
const before = new Set(a.stmts.map((s) => s.text)), after = new Set(final.stmts.map((s) => s.text));
const lost = [...before].filter((t) => !after.has(t));
if (lost.length) throw new Error(`statements lost: ${lost.map((t) => t.slice(0, 60)).join(" | ")}`);
const pids = final.stmts.filter((s) => s.kind === "cell").map((s) => s.pid!);
if (new Set(pids).size !== pids.length) throw new Error("duplicate pids");
const noConst = final.stmts.filter((s) => s.kind === "cell" && !final.consts.get((s as any).fn ?? s.pid!)).map((s) => s.pid);
if (noConst.length) throw new Error(`$def without a const: ${noConst}`);
console.log(`${cells.length} cells reordered, ${pids.length - cells.length} added, ${rewrites.size} rewritten`);

if (args.includes("--dry-run")) process.exit(0);
const block = blocks(prev).find((b) => b.id === layout.module)!;
const raw = prev.slice(block.start, block.end);
const html = prev.slice(0, block.start) + raw.slice(0, raw.indexOf(">") + 1) + "\n" + merged + "\n</script>" + prev.slice(block.end);
guardedWrite(out, prev, html, "", "reorder-module");
console.log(`wrote ${out}`);

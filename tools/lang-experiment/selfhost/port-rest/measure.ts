// Line counts for the ranking: the statements of the original that a prototype replaces, the prototype's shell
// statements and its cells, each from the parse (P.line(end) - P.line(start) + 1, comments between statements not
// counted). Run: bun selfhost/port-rest/measure.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, type Node } from "../../lite/parse.ts";

const ROOT = join(import.meta.dir, "../..");
// lines of the named top-level statements of a file (every one, when names is null), and the largest
function lines(file: string, names: string[] | null): { total: number; n: number; largest: number } {
  const P = parse(readFileSync(join(ROOT, file), "utf8"));
  let total = 0, n = 0, largest = 0;
  for (const s of P.program.body as Node[]) {
    const d: Node = s.type === "ExportNamedDeclaration" && s.declaration ? s.declaration : s;
    const name = d.id?.name ?? d.declarations?.[0]?.id?.name;
    if (names ? !names.includes(name) : d.type.startsWith("TS") || s.type === "ImportDeclaration") continue;
    const l = P.line(s.end) - P.line(s.start) + 1;
    total += l; n++; largest = Math.max(largest, l);
  }
  return { total, n, largest };
}
const rows: [string, [string, string[] | null][], [string, string[] | null][], [string, string[] | null][], string][] = [
  ["worker pool", [["lite/browser/workers.ts", ["makePool", "superseded"]]], [["selfhost/port-rest/pool-shell.ts", ["makePool", "superseded", "linkPool"]]], [["selfhost/port-rest/pool.ss.ts", null]], ""],
  ["checkCells stand-ins", [["lite/stdlib/runtime.ts", ["checkCells"]]], [["selfhost/port-rest/small-shell.ts", ["checkCellsProto"]]], [["selfhost/port-rest/small.ss.ts", ["standIns"]]], ""],
  ["check key + LRU", [["lite/stdlib/runtime.ts", ["check", "checks", "checked"]]], [["selfhost/port-rest/small-shell.ts", ["makeCheck"]]], [["selfhost/port-rest/small.ss.ts", ["checkKey", "lruTouch"]]], "makeCheck folds checks/checked into a closure; checksRun not rewritten"],
  ["shapeOf", [["lite/boundary.ts", ["shapeOf"]]], [], [["selfhost/port-rest/shape.ss.ts", null]], "shell adapter not written: the untag line of shape.test.ts, about 2 lines"],
  ["hash + makeRandom", [["prelude.runtime.ts", ["hash", "makeRandom"]]], [], [["selfhost/port-rest/small.ss.ts", ["imul", "hash", "randomStep"]]], "shell not written: makeRandom over hash/randomStep, about 4 lines"],
];
for (const [name, orig, shell, cells, note] of rows) {
  const sum = (xs: [string, string[] | null][]) => xs.map(([f, ns]) => lines(f, ns)).reduce((a, x) => ({ total: a.total + x.total, n: a.n + x.n, largest: Math.max(a.largest, x.largest) }), { total: 0, n: 0, largest: 0 });
  const o = sum(orig), s = sum(shell), c = sum(cells);
  console.log(`${name}: original ${o.total} unchecked lines; prototype shell ${s.total} unchecked lines; ${c.n} cells, ${c.total} checked lines (largest ${c.largest})${note ? ` (${note})` : ""}`);
}

// Which generated module holds each named declaration, from generate()'s output (runtime, checker, workers), a
// group cell's members included; "dropped" is generate()'s stats.dropped. Run: bun selfhost/port-rest/where.ts
import * as acorn from "acorn";
import { compiler } from "../../../spec-notebook.ts";
import { generate, ENTRY } from "../../lite/soundscript/ts-cells.ts";

const NAMES = ["shapeOf", "check", "checkCells", "compiler", "joinCells", "hash", "makeRandom", "makeClock", "makeLog", "makePool", "pagePool", "describe", "copy", "equals", "snapshot", "asText", "keyOf", "h", "viewRef"];
const { compile, dispose } = await compiler();
const ssKeys = Object.keys(await import(ENTRY)).filter((k) => k !== "default").sort();
const g = generate(compile, ssKeys);
dispose();
const where = new Map<string, string[]>();
const note = (n: string, m: string) => where.set(n, [...(where.get(n) ?? []), m]);
for (const m of ["runtime", "checker", "workers"] as const) for (const src of g[m]) for (const v of compile(src)) {
  if (!v._name) continue;
  // an import of another module's cell is not a home
  if (String(v._definition).includes("_.import")) continue;
  note(v._name, m);
  if (v._name.endsWith("_cells")) {
    const fn: any = (acorn.parse(`(${v._definition})`, { ecmaVersion: "latest" }) as any).body[0].expression;
    for (const s of fn.body.body) {
      if ((s.type === "FunctionDeclaration") && s.id) note(s.id.name, `${m} (in ${v._name})`);
      else if (s.type === "VariableDeclaration") for (const x of s.declarations) if (x.id.type === "Identifier") note(x.id.name, `${m} (in ${v._name})`);
    }
  }
}
const dropped = new Set(g.stats.dropped as string[]);
for (const n of NAMES) console.log(`${n}\t${(where.get(n) ?? []).join(", ") || "none"}${dropped.has(n) ? "\tdropped" : ""}`);

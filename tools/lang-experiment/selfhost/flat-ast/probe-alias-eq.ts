// Runs probe-alias-eq.ss.ts alone and probe-alias-eq-fnode.ss.ts after ast-a.ss.ts (kindFromJs as an outside cell).
// Run: bun selfhost/flat-ast/probe-alias-eq.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../../lite/core.ts";
import { report } from "./q1.ts";
const H = import.meta.dir, read = (f: string) => readFileSync(join(H, f), "utf8");
console.log(report(checkSources({ cells: read("probe-alias-eq.ss.ts"), tsx: false })));
const r = checkSources({ cells: read("ast-a.ss.ts") + "\n" + read("probe-alias-eq-fnode.ss.ts"), tsx: false, outside: [{ name: "kindFromJs" }] });
console.log(report(r, new Set(["sameRowKind", "rowIsKind", "outsideKind", "sameIndex"])));

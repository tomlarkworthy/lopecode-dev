// Writes classify-fnsrc.ts: a copy of classify.ts whose dependency loop also records, per cell, which
// dependency raised FN/FNH (dep, blocker, kind, source). classify.ts itself is not touched.
import { readFileSync, writeFileSync } from "node:fs";
let s = readFileSync(new URL("./classify.ts", import.meta.url), "utf8");
const a = s.indexOf("    // dependencies from another language"), b = s.indexOf("    for (const m of f.methodCalls) if (UNSUPPORTED");
if (a < 0 || b < 0) throw new Error("anchors");
let loop = s.slice(a, b);
loop = loop.replace("const k = depKind(d);", "const k = depKind(d); const addF = (x: string) => { B.add(x); if (x === \"FN\" || x === \"FNH\") T.push({ dep: d, b: x, kind: k.kind, source: k.source }); };");
loop = loop.replace(/B\.add\(/g, "addF(").replace("const addF = (x: string) => { addF(x);", "const addF = (x: string) => { B.add(x);");
s = s.slice(0, a) + "    const T: any[] = [];\n" + loop + s.slice(b);
s = s.replace("return { ...base, verdict, blockers, primary: nB[0] ?? hB[0] ?? null };", "return { ...base, verdict, blockers, primary: nB[0] ?? hB[0] ?? null, triggers: T } as any;");
s = s.replace("if (import.meta.main) {", "if (false) {");
s = s.replace("\nfunction facts(", "\nexport function facts(");
writeFileSync(new URL("./classify-fnsrc.ts", import.meta.url), s);

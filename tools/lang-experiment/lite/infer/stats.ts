// bun lite/infer/stats.ts: the Checker's methods and their lines, and the ix cells' sizes, read from the parse.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../parse.ts";
import { IX_FILES, OW_FILES } from "./index.ts";
const LITE = join(import.meta.dir, "..");
const P = parse(readFileSync(join(LITE, "infer.ts"), "utf8"));
const cls = P.program.body.map((s: any) => (s.type === "ExportNamedDeclaration" ? s.declaration : s)).find((d: any) => d?.type === "ClassDeclaration" && d.id.name === "Checker");
const meth = cls.body.body.filter((m: any) => m.type === "MethodDefinition").map((m: any) => ({ name: m.key.name, lines: P.line(m.end) - P.line(m.start) + 1 }));
console.log("methods", meth.length, "lines", meth.reduce((s: number, m: any) => s + m.lines, 0));
console.log(meth.map((m: any) => `${m.name}:${m.lines}`).join(" "));
const OW = process.argv.includes("ow");
// the top-level functions of own.ts and capture.ts and their lines, for the ow cells
for (const f of OW ? ["own.ts", "capture.ts"] : []) {
  const Q = parse(readFileSync(join(LITE, f), "utf8"));
  const total = Q.line(Q.program.end);
  const fns = Q.program.body.map((s: any) => (s.type === "ExportNamedDeclaration" ? s.declaration : s)).filter((d: any) => d?.type === "FunctionDeclaration");
  console.log(f, "lines", total, "functions", fns.length, "function lines", fns.reduce((n: number, d: any) => n + Q.line(d.end) - Q.line(d.start) + 1, 0), fns.map((d: any) => `${d.id.name}:${Q.line(d.end) - Q.line(d.start) + 1}`).join(" "));
}
const files = (OW ? OW_FILES : IX_FILES).map((f) => `infer/${f}`);
const sizes: { name: string; lines: number; type: boolean }[] = [];
for (const f of files) {
  const Q = parse(readFileSync(join(LITE, f), "utf8"));
  for (const s of Q.program.body) {
    const d = s.type === "ExportNamedDeclaration" ? s.declaration : s;
    const type = d.type !== "VariableDeclaration";
    const name = type ? d.id.name : d.declarations[0].id.name;
    sizes.push({ name, lines: Q.line(s.end) - Q.line(s.start) + 1, type });
  }
}
const code = sizes.filter((s) => !s.type).sort((a, b) => a.lines - b.lines);
console.log("cells", sizes.length, "value cells", code.length, "type cells", sizes.length - code.length);
console.log("value cell lines: total", code.reduce((s, c) => s + c.lines, 0), "median", code[Math.floor(code.length / 2)].lines, "largest", code.slice(-5).map((c) => `${c.name}:${c.lines}`).join(" "));

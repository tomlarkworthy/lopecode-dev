// Inventory of the checker, linker and compiler sources, from the parse (lite/parse.ts), not regex.
// Per top-level declaration: file, name, kind, lines (P.line(end) - P.line(start) + 1), code lines (lines of the
// span holding a token that is not inside a comment), and AST features used later to extrapolate the sample.
// Run: bun selfhost/checker-survey/inventory.ts [--json]   (writes out/inventory.json)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parse, type Node } from "../../lite/parse.ts";

const ROOT = join(import.meta.dir, "../..");
export const FILES = [
  // checker
  "lite/parse.ts", "lite/infer/frozen/core.ts", "lite/infer/frozen/infer.ts", "lite/infer/frozen/own.ts", "lite/infer/frozen/capture.ts", "lite/registry.ts", "lite/intrinsics.ts",
  "lite/types.ts", "lite/types.ss.ts", "lite/facts.ts", "lite/island.ts", "lite/infer/frozen/complete.ts", "rules.ts",
  // linker
  "lite/link.ts",
  // compiler / toolchain
  "lite/toolchain/ss-toolchain.ts", "lite/toolchain/comment-types.ts", "lite/toolchain/module-js.ts", "lite/jsx/lower.ts", "lite/browser/erase.ts",
  // the checker's part of the boundary module (core.ts imports shapeOf); the rest is runtime, counted in NOTES-runtime-port.md
  "lite/boundary.ts",
];
// in the import closure of core.ts, complete.ts, ss-toolchain.ts, link.ts but listed apart (reason in RESULTS.md)
export const BORDERLINE = new Set(["rules.ts", "lite/toolchain/module-js.ts", "lite/browser/erase.ts", "lite/boundary.ts"]);
export const PORTED = new Set(["lite/types.ss.ts", "lite/types.ts"]);
// declaration text (intrinsic signatures as a TypeScript string) and data tables
export const TEXT = new Set(["lite/intrinsics.ts:INTRINSIC_DECLS", "lite/intrinsics.ts:PRELUDE_DECLS", "lite/intrinsics.ts:JSX_DECLS", "lite/intrinsics.ts:typedArray", "rules.ts:RULES"]);
const ONLY: Record<string, Set<string>> = { "lite/boundary.ts": new Set(["shapeOf"]) };
export const stratum = (d: Decl) => PORTED.has(d.file) ? "ported" : TEXT.has(`${d.file}:${d.name}`) ? "text" : BORDERLINE.has(d.file) ? "borderline" : "core";
export type Decl = {
  file: string; name: string; kind: string; lines: number; code: number; start: number; end: number;
  f: Record<string, number>;
};

const MUTATORS = new Set(["push", "pop", "shift", "unshift", "splice", "set", "add", "delete", "clear", "sort", "reverse", "fill"]);
function features(stmt: Node, moduleLets: Set<string>): Record<string, number> {
  const f: Record<string, number> = {};
  const inc = (k: string) => (f[k] = (f[k] ?? 0) + 1);
  const walk = (x: any, parent: any) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) { for (const y of x) walk(y, parent); return; }
    if (typeof x.type !== "string") return;
    switch (x.type) {
      case "ClassDeclaration": case "ClassExpression": inc("class"); break;
      case "ThisExpression": inc("this"); break;
      case "SwitchStatement": inc("switch"); break;
      case "ThrowStatement": inc("throw"); break;
      case "TryStatement": if (x.handler) inc("catch"); if (x.finalizer) inc("finally"); break;
      case "TSAnyKeyword": inc("any"); break;
      case "TSAsExpression": inc("cast"); break;
      case "TSNonNullExpression": inc("nonnull"); break;
      case "TSTypePredicate": inc("predicate"); break;
      case "Literal": if (x.regex) inc("regex"); break;
      case "BinaryExpression": if (x.operator === "instanceof") inc("instanceof"); break;
      case "LabeledStatement": inc("label"); break;
      case "NewExpression": inc("new:" + (x.callee.type === "Identifier" ? x.callee.name : "?")); break;
      case "AssignmentExpression": case "UpdateExpression": {
        const t = x.type === "AssignmentExpression" ? x.left : x.argument;
        if (t.type === "MemberExpression") inc(t.object.type === "ThisExpression" ? "thisWrite" : "memberWrite");
        else if (t.type === "Identifier" && moduleLets.has(t.name)) inc("moduleLetWrite");
        else inc("localAssign");
        break;
      }
      case "CallExpression": {
        const c = x.callee;
        if (c.type === "MemberExpression" && !c.computed && c.property.type === "Identifier" && MUTATORS.has(c.property.name)) inc("mutCall");
        break;
      }
      case "Identifier": if (moduleLets.has(x.name) && !(parent?.type === "MemberExpression" && parent.property === x && !parent.computed)) inc("moduleLetRef"); break;
      case "TSTypeReference": if (x.typeName?.type === "Identifier" && x.typeName.name === "Node") inc("NodeType"); break;
      case "MemberExpression": if (x.computed) inc("computedMember"); break;
    }
    for (const k in x) if (k !== "loc") walk(x[k], x);
  };
  walk(stmt, null);
  return f;
}

export const sha = (file: string) => new Bun.CryptoHasher("sha256").update(readFileSync(join(ROOT, file))).digest("hex").slice(0, 12);
export function inventory(): Decl[] {
  const out: Decl[] = [];
  for (const file of FILES) {
    const src = readFileSync(join(ROOT, file), "utf8");
    const P = parse(src);
    // lines covered by a comment, to subtract from code lines
    const commentChars = new Uint8Array(src.length);
    for (const c of P.comments) commentChars.fill(1, c.start, c.end);
    const codeLines = (s: number, e: number) => {
      const set = new Set<number>();
      for (let i = s; i < e; i++) if (!commentChars[i] && !/\s/.test(src[i]!)) set.add(P.line(i));
      return set.size;
    };
    const moduleLets = new Set<string>();
    for (const s0 of P.program.body as Node[]) {
      const s = s0.type === "ExportNamedDeclaration" && s0.declaration ? s0.declaration : s0;
      if (s.type === "VariableDeclaration" && s.kind === "let") for (const d of s.declarations) if (d.id.type === "Identifier") moduleLets.add(d.id.name);
    }
    for (const s0 of P.program.body as Node[]) {
      const s: Node = s0.type === "ExportNamedDeclaration" && s0.declaration ? s0.declaration : s0;
      const lines = P.line(s0.end - 1) - P.line(s0.start) + 1, code = codeLines(s0.start, s0.end);
      const base = { file, lines, code, start: s0.start, end: s0.end };
      if (s.type === "ImportDeclaration" || (s0.type === "ExportNamedDeclaration" && !s0.declaration) || s.type === "ExportAllDeclaration") {
        out.push({ ...base, name: "(import/export)", kind: "import", f: {} });
        continue;
      }
      if (s.type === "TSTypeAliasDeclaration" || s.type === "TSInterfaceDeclaration") { out.push({ ...base, name: s.id.name, kind: "type", f: features(s, moduleLets) }); continue; }
      if (s.type === "FunctionDeclaration") { out.push({ ...base, name: s.id.name, kind: "function", f: features(s, moduleLets) }); continue; }
      if (s.type === "ClassDeclaration") {
        // a class is counted member by member (unit of account); the class shell itself is one more unit of 1 line
        for (const m of s.body.body as Node[]) {
          const nm = m.key?.name ?? m.key?.value ?? "(computed)";
          const kind = m.type === "MethodDefinition" ? (m.kind === "constructor" ? "ctor" : "method") : "field";
          out.push({ file, name: `${s.id.name}.${nm}`, kind, lines: P.line(m.end - 1) - P.line(m.start) + 1, code: codeLines(m.start, m.end), start: m.start, end: m.end, f: features(m, moduleLets) });
        }
        continue;
      }
      if (s.type === "VariableDeclaration") {
        const n = s.declarations.length;
        for (const d of s.declarations) {
          const init = d.init;
          const isFn = init && /^(ArrowFunctionExpression|FunctionExpression)$/.test(init.type);
          const kind = s.kind === "let" ? "let" : isFn ? "const-fn" : "const-value";
          const dl = n > 1 ? P.line(d.end - 1) - P.line(d.start) + 1 : lines;
          const dc = n > 1 ? codeLines(d.start, d.end) : code;
          out.push({ file, name: d.id.type === "Identifier" ? d.id.name : "(pattern)", kind, lines: dl, code: dc, start: d.start, end: d.end, f: features(d, moduleLets) });
        }
        continue;
      }
      out.push({ ...base, name: "(" + s.type + ")", kind: "statement", f: features(s, moduleLets) });
    }
  }
  return out.filter((d) => !ONLY[d.file] || ONLY[d.file]!.has(d.name));
}

if (import.meta.main) {
  const ds = inventory();
  mkdirSync(join(import.meta.dir, "out"), { recursive: true });
  writeFileSync(join(import.meta.dir, "out/inventory.json"), JSON.stringify(ds, null, 1));
  const byFile = new Map<string, Record<string, number>>();
  for (const f of FILES) console.log(`sha ${f} ${sha(f)}`);
  for (const d of ds) {
    const r = byFile.get(d.file) ?? { decls: 0, lines: 0, code: 0, function: 0, "const-fn": 0, "const-value": 0, let: 0, type: 0, method: 0, field: 0, ctor: 0, statement: 0, import: 0, fileCode: 0 };
    r.fileCode += d.code;
    if (d.kind !== "import") { r.decls++; r.lines += d.lines; r.code += d.code; }
    r[d.kind] = (r[d.kind] ?? 0) + 1;
    byFile.set(d.file, r);
  }
  const cols = ["decls", "lines", "code", "function", "const-fn", "const-value", "let", "type", "method", "field", "ctor", "statement"];
  console.log(["file", ...cols].join("\t"));
  const tot: Record<string, number> = {};
  for (const [f, r] of byFile) { console.log([f, ...cols.map((c) => r[c] ?? 0)].join("\t")); for (const c of cols) tot[c] = (tot[c] ?? 0) + (r[c] ?? 0); }
  console.log(["TOTAL", ...cols.map((c) => tot[c])].join("\t"));
  const byS = new Map<string, number[]>();
  for (const d of ds) if (d.kind !== "import") { const s = stratum(d); const r = byS.get(s) ?? [0, 0]; r[0]++; r[1] += d.code; byS.set(s, r); }
  for (const [s, [n, c]] of byS) console.log(`stratum ${s}\tdecls ${n}\tcode ${c}`);
  if (process.argv.includes("--list")) for (const d of ds) if (d.kind !== "import") console.log(`${stratum(d)}\t${d.file}\t${d.name}\t${d.kind}\t${d.code}\t${Object.entries(d.f).map(([k, v]) => `${k}=${v}`).join(" ")}`);
}

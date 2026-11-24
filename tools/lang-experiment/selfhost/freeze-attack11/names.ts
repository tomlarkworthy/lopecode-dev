// freeze-attack11 target 4: bun selfhost/freeze-attack11/names.ts [--json out.json]
// (i) every name a compiled cell takes from outside: each variable's inputs, and each free identifier of its definition
//     (acorn AST, block-scoped walk), over the accepted programs of the standing attack sets and freeze-attack4..11;
// (ii) every global the checker has an intrinsic for (ALLOWED_GLOBALS, CAPABILITIES, PRELUDE_FNS);
// (iii) the names the checker rejects as a cell name: `const NAME = () => 1;\nconst g = () => 2;` checked, the NAME cell's errors.
import * as acorn from "acorn";
import { readdirSync, writeFileSync } from "node:fs";
import * as T from "../../lite/toolchain/ss-toolchain.ts";
import { checkSources } from "../../lite/core.ts";
import { ALLOWED_GLOBALS, CAPABILITIES, PRELUDE_FNS } from "../../lite/intrinsics.ts";
const here = new URL("./", import.meta.url).pathname, attack = new URL("../../lite/infer/attack/", import.meta.url).pathname;
import { readFileSync } from "node:fs";
const files: string[] = [];
// only files that declare candidates and do not run anything on import (no argv, exit or console output)
const quiet = (f: string) => { const t = readFileSync(f, "utf8"); return /export const (cands|attacks|srcs)\b/.test(t) && !/process\.(argv|exit)|console\.log/.test(t); };
for (const d of [attack, ...["freeze-attack4", "freeze-attack5", "freeze-attack6", "freeze-attack7", "freeze-attack8", "freeze-attack9", "freeze-attack10", "freeze-attack11"].map((d) => new URL(`../${d}/`, import.meta.url).pathname)]) {
  try { for (const f of readdirSync(d)) if (f.endsWith(".ts") && quiet(d + f)) files.push(d + f); } catch {}
}
const srcs = new Set<string>();
for (const f of files) {
  try {
    const m = await import(f);
    for (const k of ["attacks", "cands", "srcs", "rows"]) for (const a of (Array.isArray(m[k]) ? m[k] : [])) { const s = Array.isArray(a) ? a[1] : a?.src; if (typeof s === "string") srcs.add(s); }
  } catch {}
}
// free identifiers of a JS function expression, block-scoped
type Scope = { names: Set<string>; up: Scope | null; fn: boolean };
export const refs: { name: string; pos: number; decl: number }[] = [];
const declAt = new WeakMap<Scope, Map<string, number>>();
const free = (code: string): Set<string> => {
  const out = new Set<string>();
  const ast = acorn.parse(`(${code})`, { ecmaVersion: "latest", sourceType: "module", allowAwaitOutsideFunction: true }) as any;
  const declPat = (p: any, s: Scope) => {
    if (!p) return;
    if (p.type === "Identifier") { s.names.add(p.name); if (!declAt.has(s)) declAt.set(s, new Map()); declAt.get(s)!.set(p.name, p.start); }
    else if (p.type === "ObjectPattern") for (const q of p.properties) declPat(q.type === "RestElement" ? q.argument : q.value, s);
    else if (p.type === "ArrayPattern") for (const q of p.elements) declPat(q, s);
    else if (p.type === "RestElement") declPat(p.argument, s);
    else if (p.type === "AssignmentPattern") declPat(p.left, s);
  };
  const fnScope = (s: Scope) => { let x: Scope = s; while (!x.fn && x.up) x = x.up; return x; };
  // hoist declarations of a block/function body into s (var and function to the function scope)
  const hoist = (body: any[], s: Scope) => {
    const walkVar = (n: any) => {
      if (!n || typeof n !== "object") return;
      if (n.type === "VariableDeclaration" && n.kind === "var") for (const d of n.declarations) declPat(d.id, fnScope(s));
      if (/Function/.test(n.type)) return;
      for (const k of Object.keys(n)) if (k !== "type" && n[k] && typeof n[k] === "object") { if (Array.isArray(n[k])) n[k].forEach(walkVar); else if (n[k].type) walkVar(n[k]); }
    };
    for (const st of body) {
      if (st.type === "VariableDeclaration" && st.kind !== "var") for (const d of st.declarations) declPat(d.id, s);
      if (st.type === "FunctionDeclaration" && st.id) s.names.add(st.id.name);
      if (st.type === "ClassDeclaration" && st.id) s.names.add(st.id.name);
      walkVar(st);
    }
  };
  const bound = (n: string, s: Scope | null): boolean => { for (let x = s; x; x = x.up) if (x.names.has(n)) return true; return false; };
  const visit = (n: any, s: Scope, parent: any = null, key = ""): void => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach((c) => visit(c, s, parent, key)); return; }
    switch (n.type) {
      case "Identifier": {
        if (parent && ((parent.type === "MemberExpression" && key === "property" && !parent.computed) || ((parent.type === "Property" || parent.type === "MethodDefinition" || parent.type === "PropertyDefinition") && key === "key" && !parent.computed) || parent.type === "LabeledStatement" || parent.type === "BreakStatement" || parent.type === "ContinueStatement" || (parent.type === "MetaProperty"))) return;
        if (!bound(n.name, s)) out.add(n.name);
        { let d = -1; for (let x: Scope | null = s; x; x = x.up) if (x.names.has(n.name)) { d = declAt.get(x)?.get(n.name) ?? -2; break; } refs.push({ name: n.name, pos: n.start, decl: d }); }
        return;
      }
      case "FunctionDeclaration": case "FunctionExpression": case "ArrowFunctionExpression": {
        const f: Scope = { names: new Set(), up: s, fn: true };
        if (n.type === "FunctionExpression" && n.id) f.names.add(n.id.name);
        if (n.type !== "ArrowFunctionExpression") f.names.add("arguments");
        for (const p of n.params) declPat(p, f);
        for (const p of n.params) visitPat(p, f);
        if (n.body.type === "BlockStatement") { hoist(n.body.body, f); visit(n.body.body, f, n.body, "body"); } else visit(n.body, f, n, "body");
        return;
      }
      case "BlockStatement": case "StaticBlock": { const b: Scope = { names: new Set(), up: s, fn: false }; hoist(n.body, b); visit(n.body, b, n, "body"); return; }
      case "Program": { hoist(n.body, s); visit(n.body, s, n, "body"); return; }
      case "ForStatement": case "ForInStatement": case "ForOfStatement": {
        const b: Scope = { names: new Set(), up: s, fn: false };
        const init = n.init ?? n.left;
        if (init?.type === "VariableDeclaration" && init.kind !== "var") for (const d of init.declarations) declPat(d.id, b);
        for (const k of ["init", "left", "right", "test", "update", "body"]) if (n[k]) visit(n[k], b, n, k);
        return;
      }
      case "CatchClause": { const b: Scope = { names: new Set(), up: s, fn: false }; declPat(n.param, b); if (n.param) visitPat(n.param, b); visit(n.body, b, n, "body"); return; }
      case "VariableDeclarator": { visitPat(n.id, s); visit(n.init, s, n, "init"); return; }
      case "ClassDeclaration": case "ClassExpression": { const b: Scope = { names: new Set(), up: s, fn: false }; if (n.id) b.names.add(n.id.name); visit(n.superClass, b, n, "superClass"); visit(n.body, b, n, "body"); return; }
    }
    for (const k of Object.keys(n)) if (k !== "type" && k !== "start" && k !== "end" && n[k] && typeof n[k] === "object") visit(n[k], s, n, k);
  };
  // a pattern's default values and computed keys are expressions
  const visitPat = (p: any, s: Scope): void => {
    if (!p) return;
    if (p.type === "AssignmentPattern") { visitPat(p.left, s); visit(p.right, s, p, "right"); }
    else if (p.type === "ObjectPattern") for (const q of p.properties) { if (q.type === "RestElement") visitPat(q.argument, s); else { if (q.computed) visit(q.key, s, q, "key"); visitPat(q.value, s); } }
    else if (p.type === "ArrayPattern") for (const q of p.elements) visitPat(q, s);
    else if (p.type === "RestElement") visitPat(p.argument, s);
    else if (p.type === "MemberExpression") visit(p, s, null, "");
  };
  visit(ast, { names: new Set(), up: null, fn: true });
  return out;
};
const inputs = new Map<string, number>(), bodyFree = new Map<string, number>(), inserted = new Map<string, number>(), userHits: string[] = [], perProgOutside = new Map<string, number>();
let progs = 0, accepted = 0, cellsCompiled = 0, compileFail = 0, parseFail = 0;
for (const src of srcs) {
  progs++;
  let r: any;
  try { r = checkSources({ cells: src, tsx: true, outside: [], foreign: null } as never); } catch { continue; }
  const bad = r.cells.filter((x: any) => x.status !== "ok" || x.errors.length || x.unsupported.length);
  if (bad.length || r.module.length || !r.cells.length) continue;
  accepted++;
  const ctx = T.contextFromCheck({ cells: r.cells, facts: r.facts } as never);
  let texts: string[] = [];
  try { texts = [...T.splitCells(src, true)]; } catch { compileFail++; }
  for (const t of texts) {
    let ds: T.Variable[];
    try { ds = T.compileCell(t, true, ctx, T.declaredName(t)); } catch { compileFail++; continue; }
    cellsCompiled++;
    for (const d of ds) {
      for (const i of d.inputs) { inputs.set(i, (inputs.get(i) ?? 0) + 1); const own = r.cells.some((c: any) => c.name === i.replace(/^viewof /, "")); if (!own) perProgOutside.set(i, (perProgOutside.get(i) ?? 0) + 1); }
      refs.length = 0;
      try { for (const n of free(d.definition)) bodyFree.set(n, (bodyFree.get(n) ?? 0) + 1); } catch { parseFail++; }
      // inserted regions of the definition (offset +1 for the wrapping paren): /*ss+*/../*ss-*/ and /*ss<..*/../*ss>*/
      const regs: [number, number][] = [];
      for (const [a, b] of [["/*ss+*/", "/*ss-*/"], ["/*ss<", "/*ss>*/"]] as const) { let i = 0; while ((i = d.definition.indexOf(a, i)) >= 0) { const j = d.definition.indexOf(b, i); if (j < 0) break; regs.push([i + 1, j + 1]); i = j; } }
      const userStart = d.definition.indexOf("/*ss^") + 1;
      for (const r of refs) if (regs.some(([a, b]) => r.pos >= a && r.pos < b)) {
        const where = r.decl === -1 ? "free" : regs.some(([a, b]) => r.decl >= a && r.decl < b) ? "inserted" : userStart > 0 && r.decl > userStart ? "USER" : "header";
        const k = `${r.name}:${where}`; inserted.set(k, (inserted.get(k) ?? 0) + 1);
        // a captured variable in a closure thunk (ss_i => ... : x) is meant to be the user's; any other inserted name bound by the user, and any free one, is shown
        const thunk = /ss_i < 0 \? \d+ : /.test(d.definition.slice(Math.max(0, r.pos - 40), r.pos)) || /ss_i === \d+ \? $/.test(d.definition.slice(Math.max(0, r.pos - 20), r.pos - 1));
        const jsxTag = /h\($/.test(d.definition.slice(Math.max(0, r.pos - 3), r.pos - 1));
        if (((where === "USER" && !thunk && !jsxTag) || where === "free") && userHits.length < 40) userHits.push(`${d.name}: ${r.name} (${where}) at ...${d.definition.slice(Math.max(0, r.pos - 120), r.pos + 60).replace(/\n/g, " ")}`);
      }
    }
  }
}
const cellNames = new Set<string>();
for (const src of srcs) try { for (const t of T.splitCells(src, true)) { const n = T.declaredName(t); if (n) cellNames.add(n); } } catch {}
// names a module's own cells give (a program's cells), apart from the outside ones
const outsideInputs = [...perProgOutside.keys()];
const ii = new Set([...ALLOWED_GLOBALS, ...Object.keys(CAPABILITIES), ...PRELUDE_FNS]);
const OBS = ["invalidation", "width", "now", "md", "html", "svg", "Inputs", "Plot", "d3", "require", "FileAttachment", "Generators", "Promises", "DOM", "Files", "Mutable", "visibility", "htl", "tex", "dot", "mermaid", "_", "aq", "Arrow", "DuckDBClient", "SQLite", "SQLiteDatabaseClient", "vl", "topojson", "L", "XLSX", "ZipArchive", "self", "window", "globalThis", "this", "Reflect", "Proxy", "WeakMap", "WeakSet", "WeakRef", "Date", "console", "Function", "eval", "Intl", "Atomics", "SharedArrayBuffer", "queueMicrotask", "setTimeout", "performance", "crypto", "fetch", "Response", "Request", "Headers", "Blob", "File", "FormData", "AbortController", "Event", "EventTarget", "document", "navigator", "location", "Worker", "Iterator", "AggregateError", "EvalError", "SyntaxError", "ReferenceError", "URIError", "Float16Array", "BigInt64Array", "BigUint64Array", "escape", "unescape", "SsMap", "SsSet", "SsURL"];
const candidates = new Set<string>([...outsideInputs.map((n) => n.replace(/^viewof /, "")), ...bodyFree.keys(), ...ii, ...OBS, ...T.RUNTIME_CELLS]);
const verdictOfName = (n: string): string => {
  if (!/^[A-Za-z_$][\w$]*$/.test(n)) return "not-an-identifier";
  try {
    const r: any = checkSources({ cells: `const ${n} = () => 1;\nconst g = () => 2;`, tsx: true, outside: [], foreign: null } as never);
    const c = r.cells.find((x: any) => x.name === n);
    if (!c) return `NO-CELL (cells: ${r.cells.map((x: any) => x.name).join(",")})`;
    const rules = [...r.module.map((m: any) => m.rule), ...(c?.errors ?? []).map((e: any) => e.rule), ...((c?.unsupported ?? []).length ? ["unsupported"] : [])];
    return rules.length ? `REJECT ${[...new Set(rules)].join(",")}` : "ACCEPT";
  } catch (x) { return `CRASH ${(x as Error).message.slice(0, 60)}`; }
};
const rows = [...candidates].sort().map((n) => ({ name: n, input: perProgOutside.get(n) ?? 0, body: bodyFree.get(n) ?? 0, intrinsic: ii.has(n), obs: OBS.includes(n), runtimeCell: T.RUNTIME_CELLS.includes(n), verdict: verdictOfName(n) }));
console.log(`files ${files.length}, programs ${progs}, accepted ${accepted}, cells compiled ${cellsCompiled}, compile failures ${compileFail}, parse failures ${parseFail}`);
console.log(`(i) inputs from outside: ${outsideInputs.sort().join(" ")}`);
console.log(`(i) free identifiers of definitions: ${[...bodyFree].sort().map(([n, k]) => `${n}(${k})`).join(" ")}`);
console.log(`inserted references (name:binding, count): ${[...inserted].sort().map(([k, v]) => `${k}(${v})`).join(" ")}`);
for (const u of userHits) console.log(`  USER-BOUND ${u}`);
console.log(`(ii) intrinsics: ${[...ii].sort().join(" ")}`);
const acceptedNames = rows.filter((r) => r.verdict === "ACCEPT");
console.log(`\nnames in (i) or (ii) the checker ACCEPTS as a cell name:`);
for (const r of acceptedNames.filter((r) => r.input || r.body || r.intrinsic)) console.log(`  ${r.name}  input=${r.input} body=${r.body} intrinsic=${r.intrinsic}`);
console.log(`\nObservable/JS names accepted as a cell name (not in (i)/(ii)): ${acceptedNames.filter((r) => !r.input && !r.body && !r.intrinsic).map((r) => r.name).join(" ")}`);
console.log(`\nverdicts:`);
for (const r of rows) console.log(`  ${r.name.padEnd(22)} ${r.verdict}${r.input ? ` input:${r.input}` : ""}${r.body ? ` body:${r.body}` : ""}${r.intrinsic ? " intrinsic" : ""}${r.obs ? " obs/js" : ""}${r.runtimeCell ? " runtime-cell" : ""}`);
const j = process.argv.indexOf("--json");
if (j > 0) writeFileSync(process.argv[j + 1]!, JSON.stringify(rows, null, 1));

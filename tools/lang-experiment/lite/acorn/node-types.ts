// The node types acorn 8 and @sveltejs/acorn-typescript can produce, read from the AST of their dist files: the type
// argument of every this.finishNode(node, T) / finishNodeAt(node, T, …) call, and every `x.type = "T"` assignment.
// A non-literal argument is listed with its source text; where it is a conditional of literals, or an identifier bound
// to a literal in the same function, its values are taken and the site marked resolved.
// nodeTypes() gives the sorted type names; run as a script it prints the sites. Read by gen.ts. Run: bun lite/acorn/node-types.ts
import * as acorn from "acorn";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const NM = join(import.meta.dir, "../node_modules");
const FILES = { acorn: join(NM, "acorn/dist/acorn.mjs"), ts: join(NM, "@sveltejs/acorn-typescript/index.js") };

function walk(n: any, f: (n: any, anc: any[]) => void, anc: any[] = []) {
  if (!n || typeof n.type !== "string") return;
  f(n, anc);
  anc.push(n);
  for (const k in n) {
    const v = n[k];
    if (Array.isArray(v)) for (const x of v) walk(x, f, anc);
    else if (v && typeof v === "object" && typeof v.type === "string") walk(v, f, anc);
  }
  anc.pop();
}
// per file: the enclosing function of each node, functions and methods by name, and calls by method name
type Ctx = { scopeOf: Map<any, any>; nameOf: Map<any, string>; fnsByName: Map<string, any[]>; callsByName: Map<string, { call: any; scope: any }[]> };
function context(ast: any): Ctx {
  const c: Ctx = { scopeOf: new Map(), nameOf: new Map(), fnsByName: new Map(), callsByName: new Map() };
  const push = <T,>(m: Map<string, T[]>, k: string, v: T) => { if (!m.has(k)) m.set(k, []); m.get(k)!.push(v); };
  walk(ast, (n, anc) => {
    const scope = [...anc].reverse().find((a) => /Function/.test(a.type));
    c.scopeOf.set(n, scope);
    const p = anc[anc.length - 1];
    if (/Function/.test(n.type)) {
      const name = n.id?.name ?? (p?.type === "MethodDefinition" || p?.type === "Property" ? p.key.name : p?.type === "AssignmentExpression" && p.left.type === "MemberExpression" ? p.left.property.name : p?.type === "VariableDeclarator" ? p.id.name : null);
      if (name) { c.nameOf.set(n, name); push(c.fnsByName, name, n); }
    }
    if (n.type === "CallExpression") {
      const name = n.callee.type === "MemberExpression" && !n.callee.computed ? n.callee.property.name : n.callee.type === "Identifier" ? n.callee.name : null;
      if (name) push(c.callsByName, name, { call: n, scope });
    }
  });
  return c;
}
// the string values an expression can have ([] for void 0), or null when one is not known
function values(e: any, scope: any, c: Ctx, depth = 0): string[] | null {
  if (depth > 6) return null;
  const v = (x: any, sc = scope) => values(x, sc, c, depth + 1);
  if (e.type === "Literal" && typeof e.value === "string") return [e.value];
  if (e.type === "UnaryExpression" && e.operator === "void") return [];
  if (e.type === "ConditionalExpression" || e.type === "LogicalExpression") {
    const a = v(e.type === "LogicalExpression" ? e.left : e.consequent), b = v(e.type === "LogicalExpression" ? e.right : e.alternate);
    return a && b ? [...a, ...b] : null;
  }
  if (e.type === "BinaryExpression" && e.operator === "+") { const a = v(e.left), b = v(e.right); return a && b ? a.flatMap((x) => b.map((y) => x + y)) : null; }
  if (e.type === "CallExpression" && e.callee.type === "Identifier") {
    // a function of the file: the values of its returns
    const fs = c.fnsByName.get(e.callee.name) ?? [];
    if (fs.length !== 1) return null;
    const out: string[] = [];
    let ok = true;
    walk(fs[0].body, (m) => { if (m.type === "ReturnStatement" && c.scopeOf.get(m) === fs[0]) { const r = m.argument ? v(m.argument, fs[0]) : []; if (r) out.push(...r); else ok = false; } });
    return ok ? out : null;
  }
  if (e.type === "Identifier" && scope) {
    const out: string[] = [];
    let ok = true, found = false;
    walk(scope, (m) => {
      if (c.scopeOf.get(m) !== scope && m !== scope) return;
      if (m.type === "VariableDeclarator" && m.id.type === "Identifier" && m.id.name === e.name && m.init) { found = true; const r = v(m.init); if (r) out.push(...r); else ok = false; }
      if (m.type === "AssignmentExpression" && m.left.type === "Identifier" && m.left.name === e.name) { found = true; const r = v(m.right); if (r) out.push(...r); else ok = false; }
    });
    if (found) return ok ? out : null;
    // a parameter: the argument at its index at every call of the function's name
    const i = scope.params.findIndex((p: any) => p.type === "Identifier" && p.name === e.name);
    const name = c.nameOf.get(scope);
    if (i < 0 || !name) return null;
    const calls = c.callsByName.get(name) ?? [];
    if (!calls.length) return null;
    for (const { call, scope: sc } of calls) { const a = call.arguments[i]; const r = a ? v(a, sc) : null; if (r) out.push(...r); else return null; }
    return out;
  }
  return null;
}
// finishNode's own definitions pass their parameter on: not a site
const isDefinition = (scope: any, c: Ctx) => ["finishNode", "finishNodeAt"].includes(c.nameOf.get(scope) ?? "");
export function scan() {
const types = new Map<string, string[]>();
const unresolved: { file: string; line: number; text: string }[] = [];
const resolvedSites: { file: string; line: number; text: string; values: string[] }[] = [];
const add = (t: string, site: string) => { if (!types.has(t)) types.set(t, []); types.get(t)!.push(site); };
for (const [file, path] of Object.entries(FILES)) {
  const src = readFileSync(path, "utf8");
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module", locations: true });
  const c = context(ast);
  walk(ast, (n, anc) => {
    const fnScope = c.scopeOf.get(n);
    const site = `${file}:${n.loc.start.line}`;
    let arg: any = null;
    if (n.type === "CallExpression" && n.callee.type === "MemberExpression" && !n.callee.computed && ["finishNode", "finishNodeAt"].includes(n.callee.property.name)) arg = n.arguments[1];
    if (n.type === "AssignmentExpression" && n.left.type === "MemberExpression" && !n.left.computed && n.left.property.name === "type") arg = n.right;
    if (!arg) return;
    // a token's type (this.type = …, a token type object) is not a node's
    if (n.type === "AssignmentExpression" && n.left.object.type === "ThisExpression") return;
    if (fnScope && isDefinition(fnScope, c)) return;
    const v = values(arg, fnScope, c);
    const text = src.slice(arg.start, arg.end).slice(0, 120);
    if (v) { for (const t of v) add(t, site); if (arg.type !== "Literal") resolvedSites.push({ file, line: n.loc.start.line, text, values: v }); }
    else unresolved.push({ file, line: n.loc.start.line, text: `${src.slice(n.start, n.end).slice(0, 140)}` });
  });
}
// token types (tt.name etc.) also flow through `.type =` on tokens, not nodes: keep only names that look like node types
const nodeTypes = [...types.keys()].filter((t) => /^[A-Z]/.test(t)).sort();
return { nodeTypes, types, resolvedSites, unresolved };
}
export const nodeTypes = (): string[] => scan().nodeTypes;
if (import.meta.main) {
const { nodeTypes, types, resolvedSites, unresolved } = scan();
console.log(`${nodeTypes.length} node types (acorn ${nodeTypes.filter((t) => types.get(t)!.some((s) => s.startsWith("acorn"))).length}, ts plugin ${nodeTypes.filter((t) => types.get(t)!.some((s) => s.startsWith("ts"))).length}); lowercase dropped: ${[...types.keys()].filter((t) => !/^[A-Z]/.test(t)).join(", ") || "none"}`);
console.log(`non-literal sites resolved: ${resolvedSites.length}`);
for (const r of resolvedSites) console.log(`  ${r.file}:${r.line} ${r.text} -> ${r.values.join(", ")}`);
console.log(`unresolved: ${unresolved.length}`);
for (const u of unresolved) console.log(`  ${u.file}:${u.line} ${u.text}`);
}

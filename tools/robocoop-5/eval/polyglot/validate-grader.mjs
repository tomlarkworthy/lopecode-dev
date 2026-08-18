// Grader self-check: every problem's reference solution must pass its own spec (expect 49/49).
//   node validate-grader.mjs [--slug X] [--mode esm|module|both] [--emit slug]
//
// esm    — grades problems.json's reference solutions as written. This is the BASELINE arm's grading
//          path (esmToCJS + the spec harness); it says nothing about the agent arm's path.
// module — grades a MECHANICAL conversion of each reference solution into robocoop-5's compiled
//          /src module shape, i.e. the AGENT arm's path (synthesizeCJS: exports are CELL VALUES).
//          Two conversion schemes, tried in order:
//            split  — every top-level declaration becomes its own cell; its dep list is the other
//                     top-level names its source references. A real multi-cell dependency graph, so
//                     this is what exercises dep resolution, diamonds and shared state. Export
//                     plumbing (`export`, `module.exports = X`) is dropped, since the cell NAME is
//                     the export; mutually recursive declarations — a genuine cycle in dataflow —
//                     share one group cell, with an alias cell per member.
//            bundle — the whole solution body in ONE cell that returns an object of its export
//                     bindings, plus a one-line cell per export reading it. Used when the solution
//                     has top-level statements that are NOT declarations (side effects, mutable
//                     module-level primitives): dataflow cannot express those as separate cells,
//                     because a `let` rebound from one cell is invisible to another.
//            script — grep only. It is a CLI exercise: the module carries the program TEXT in a
//                     `script` cell, exactly as run-agent.mjs grades it (computeCellString → esm).
//          Conversion is source-level and uses @babel/parser from harness/node_modules (the same
//          toolchain the exercises ship with); no model is involved.
//
// Result 2026-08-17: esm 49/49, module 48/49. The one exception is parallel-letter-frequency, and it
// is not a grader defect: its reference solution is CommonJS that requires node:worker_threads,
// assigns its export inside an `if (isMainThread)` branch, and spawns `new Worker(__filename)` — the
// solution file re-executes ITSELF as a worker. A cell has no file to re-execute and no branch-time
// export binding, so no mechanical conversion exists. (The agent arm never faces this: it is asked
// for cells, and a cell solution would use a different parallelism strategy or none.)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { gradeSolution, computeCellString } from "./grade.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parser = createRequire(join(here, "harness", "package.json"))("@babel/parser");

const PARSE_OPTS = {
  sourceType: "unambiguous",
  plugins: ["classProperties", "classPrivateProperties", "classPrivateMethods", "objectRestSpread"],
};

// Every identifier the node references, minus non-computed property/key names (which are not
// bindings). Over-approximates (a shadowing local reads as a reference) — a spurious dep only adds
// an unused parameter, which is harmless unless it closes a cycle (reported as an exception).
function collectIdents(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const n of node) collectIdents(n, out); return; }
  if (typeof node.type !== "string") return;
  if (node.type === "Identifier") { out.add(node.name); return; }
  const skipKey =
    node.type === "MemberExpression" || node.type === "OptionalMemberExpression" ? "property" :
    /^(ObjectProperty|ObjectMethod|ClassMethod|ClassProperty|ClassPrivateProperty)$/.test(node.type) ? "key" : null;
  for (const [k, v] of Object.entries(node)) {
    if (k === "loc" || k === "leadingComments" || k === "trailingComments" || k === "innerComments") continue;
    if (k === skipKey && node.computed === false) continue;
    collectIdents(v, out);
  }
}

const DECL = /^(FunctionDeclaration|ClassDeclaration|VariableDeclaration)$/;

// `module.exports = X` / `module.exports.Y = X` / `exports.Y = X` — several reference solutions are
// CommonJS. As long as X is a top-level declaration the statement is pure export plumbing: drop it
// and record the mapping, exactly as an `export` keyword would be dropped.
function cjsExport(stmt) {
  if (stmt.type !== "ExpressionStatement") return null;
  const e = stmt.expression;
  if (e.type !== "AssignmentExpression" || e.operator !== "=" || e.right.type !== "Identifier") return null;
  const l = e.left;
  if (l.type !== "MemberExpression" || l.computed || l.property.type !== "Identifier") return null;
  const o = l.object;
  if (o.type === "Identifier" && o.name === "module" && l.property.name === "exports") return { to: null, from: e.right.name };
  const viaModule = o.type === "MemberExpression" && !o.computed && o.object.type === "Identifier" &&
    o.object.name === "module" && o.property.name === "exports";
  const viaExports = o.type === "Identifier" && o.name === "exports";
  return viaModule || viaExports ? { to: l.property.name, from: e.right.name } : null;
}

// Strongly connected components of the cell dependency graph (Tarjan). Mutually recursive
// declarations are a genuine cycle in dataflow, so each SCC of size > 1 has to live in ONE cell.
function stronglyConnected(names, depsOf) {
  const index = new Map(), low = new Map(), onStack = new Set(), stack = [], out = [];
  let next = 0;
  const strongconnect = (v) => {
    index.set(v, next); low.set(v, next); next++;
    stack.push(v); onStack.add(v);
    for (const w of depsOf(v)) {
      if (!index.has(w)) { strongconnect(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
    }
    if (low.get(v) === index.get(v)) {
      const comp = [];
      for (;;) { const w = stack.pop(); onStack.delete(w); comp.push(w); if (w === v) break; }
      out.push(comp);
    }
  };
  for (const n of names) if (!index.has(n)) strongconnect(n);
  return out;
}

// The declaration inside an export wrapper (or the statement itself), plus the export bindings it
// creates. Returns null for anything that is not a single-name declaration.
function declInfo(stmt, defaultExportName) {
  let node = stmt, exported = [], isDefault = false;
  if (stmt.type === "ExportNamedDeclaration") {
    if (!stmt.declaration) return null;
    node = stmt.declaration;
  } else if (stmt.type === "ExportDefaultDeclaration") {
    node = stmt.declaration;
    isDefault = true;
  }
  if (!DECL.test(node.type)) return null;
  let name;
  if (node.type === "VariableDeclaration") {
    if (node.declarations.length !== 1 || node.declarations[0].id.type !== "Identifier") return null;
    name = node.declarations[0].id.name;
  } else {
    name = node.id ? node.id.name : null;
  }
  if (!name && isDefault) name = defaultExportName || "__default"; // `export default class {}`
  if (!name) return null;
  if (stmt.type === "ExportNamedDeclaration") exported = [name];
  return { node, name, isDefault, exported, anonymousDefault: !node.id && isDefault };
}

const MODULE_TAIL = (defs) =>
  "export default function define(runtime, observer) {\n" +
  "  const main = runtime.module();\n" +
  "  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n" +
  defs.map((d) => `  $def(${JSON.stringify("_" + d.pid)}, ${JSON.stringify(d.name)}, ${JSON.stringify(d.deps)}, _${d.pid});\n`).join("") +
  "  return main;\n}\n";

// scheme "split": one cell per top-level declaration.
function splitScheme(src, ast, problem) {
  const wanted = new Set([...(problem.exports || []), ...(problem.defaultExport ? [problem.defaultExport] : [])]);
  const decls = [];
  const aliases = []; // export { a as b }
  for (const stmt of ast.program.body) {
    const cjs = cjsExport(stmt);
    if (cjs) { aliases.push({ from: cjs.from, to: cjs.to ?? problem.defaultExport }); continue; }
    if (stmt.type === "ExportNamedDeclaration" && !stmt.declaration) {
      for (const s of stmt.specifiers) {
        if (s.type !== "ExportSpecifier" || s.local.type !== "Identifier") return { ok: false, reason: "unsupported export specifier" };
        aliases.push({ from: s.local.name, to: s.exported.name ?? s.exported.value });
      }
      continue;
    }
    if (stmt.type === "ExportDefaultDeclaration" && !DECL.test(stmt.declaration.type)) {
      if (stmt.declaration.type === "Identifier" && problem.defaultExport) {
        aliases.push({ from: stmt.declaration.name, to: problem.defaultExport });
        continue;
      }
      return { ok: false, reason: "default export is an expression, not a declaration" };
    }
    const info = declInfo(stmt, problem.defaultExport);
    if (!info) return { ok: false, reason: `top-level ${stmt.type} is not a single-name declaration` };
    decls.push(info);
  }
  const names = new Set(decls.map((d) => d.name));
  for (const a of aliases) if (!names.has(a.from)) return { ok: false, reason: `alias ${a.from} is not a top-level declaration` };
  for (const w of wanted) if (!names.has(w) && !aliases.some((a) => a.to === w)) return { ok: false, reason: `export ${w} has no top-level declaration` };

  const byName = new Map(decls.map((d) => [d.name, d]));
  const depsOf = new Map();
  for (const d of decls) {
    const refs = new Set();
    collectIdents(d.node, refs);
    depsOf.set(d.name, [...names].filter((n) => n !== d.name && refs.has(n)));
  }

  const bodies = [];
  const defs = [];
  const text = (d) => src.slice(d.node.start, d.node.end);
  // Mutually recursive declarations share one cell (a group), with an alias cell per member reading
  // its binding back out; everything else is one cell per declaration.
  const comps = stronglyConnected([...names], (n) => depsOf.get(n) || []);
  let gi = 0;
  comps.forEach((comp) => {
    if (comp.length === 1) {
      const d = byName.get(comp[0]);
      const deps = depsOf.get(d.name);
      const i = defs.length;
      bodies.push(`const _c${i} = function (${deps.join(", ")}) {\n${text(d)}\nreturn ${d.name};\n};`);
      defs.push({ pid: `c${i}`, name: d.name, deps });
      return;
    }
    const members = decls.filter((d) => comp.includes(d.name)); // source order (hoisting-safe)
    const inner = new Set(comp);
    const deps = [...new Set(members.flatMap((d) => depsOf.get(d.name)))].filter((n) => !inner.has(n));
    const group = `__grp${gi++}`;
    bodies.push(
      `const _${group} = function (${deps.join(", ")}) {\n${members.map(text).join("\n")}\n` +
      `return { ${members.map((d) => d.name).join(", ")} };\n};`,
    );
    defs.push({ pid: group, name: group, deps });
    members.forEach((d) => {
      const i = defs.length;
      bodies.push(`const _c${i} = function (${group}) { return ${group}[${JSON.stringify(d.name)}]; };`);
      defs.push({ pid: `c${i}`, name: d.name, deps: [group] });
    });
  });
  aliases.forEach((a, i) => {
    if (a.to === a.from || !a.to) return; // `module.exports = X` where X already is the export name
    bodies.push(`const _a${i} = function (${a.from}) { return ${a.from}; };`);
    defs.push({ pid: `a${i}`, name: a.to, deps: [a.from] });
  });
  return { ok: true, scheme: "split", module: bodies.join("\n") + "\n" + MODULE_TAIL(defs), cells: defs.length };
}

// scheme "bundle": the whole body in one cell; one cell per export reads its binding out.
function bundleScheme(src, ast, problem) {
  const cuts = []; // [start, end) of `export ` / `export default ` keywords to delete
  const bindings = new Map(); // exported name -> local binding
  let defaultLocal = null;
  for (const stmt of ast.program.body) {
    if (stmt.type === "ExportNamedDeclaration") {
      if (stmt.declaration) {
        cuts.push([stmt.start, stmt.declaration.start]);
        const d = stmt.declaration;
        if (d.type === "VariableDeclaration") for (const dec of d.declarations) { if (dec.id.type === "Identifier") bindings.set(dec.id.name, dec.id.name); }
        else if (d.id) bindings.set(d.id.name, d.id.name);
      } else {
        cuts.push([stmt.start, stmt.end]);
        for (const s of stmt.specifiers) {
          if (s.type !== "ExportSpecifier") return { ok: false, reason: "unsupported export specifier" };
          bindings.set(s.exported.name ?? s.exported.value, s.local.name);
        }
      }
    } else if (stmt.type === "ExportDefaultDeclaration") {
      const d = stmt.declaration;
      if (DECL.test(d.type) && d.id) { cuts.push([stmt.start, d.start]); defaultLocal = d.id.name; }
      else { cuts.push([stmt.start, d.start]); defaultLocal = "__default"; }
    } else if (stmt.type === "ImportDeclaration") {
      return { ok: false, reason: "solution has ES imports (not expressible as cells)" };
    }
  }
  // `export default <expr>` needs a binding to return.
  let body = "";
  let last = 0;
  const sorted = cuts.slice().sort((a, b) => a[0] - b[0]);
  for (const [s, e] of sorted) { body += src.slice(last, s); last = e; }
  body += src.slice(last);
  const defaultStmt = ast.program.body.find((s) => s.type === "ExportDefaultDeclaration");
  if (defaultLocal === "__default" && defaultStmt) body = body.replace(src.slice(defaultStmt.declaration.start, defaultStmt.declaration.end), (m) => `const __default = ${m}`);

  const wantDefault = problem.defaultExport || null;
  const names = [...(problem.exports || [])];
  for (const n of names) if (!bindings.has(n)) return { ok: false, reason: `export ${n} has no ESM export binding (CommonJS solution?)` };
  if (wantDefault && !defaultLocal && !bindings.has(wantDefault)) return { ok: false, reason: `default export has no binding` };

  const entries = names.map((n) => `${JSON.stringify(n)}: ${bindings.get(n)}`);
  if (wantDefault) entries.push(`${JSON.stringify(wantDefault)}: ${defaultLocal || bindings.get(wantDefault)}`);
  const bodies = [`const _all = function () {\n${body}\nreturn { ${entries.join(", ")} };\n};`];
  const defs = [{ pid: "all", name: "__all", deps: [] }];
  [...names, ...(wantDefault ? [wantDefault] : [])].forEach((n, i) => {
    bodies.push(`const _e${i} = function (__all) { return __all[${JSON.stringify(n)}]; };`);
    defs.push({ pid: `e${i}`, name: n, deps: ["__all"] });
  });
  return { ok: true, scheme: "bundle", module: bodies.join("\n") + "\n" + MODULE_TAIL(defs), cells: defs.length };
}

// grep: the module's `script` cell holds the CLI program source as a STRING.
function scriptScheme(src) {
  const bodies = [`const _s0 = function () { return ${JSON.stringify(src)}; };`];
  return { ok: true, scheme: "script", module: bodies.join("\n") + "\n" + MODULE_TAIL([{ pid: "s0", name: "script", deps: [] }]), cells: 1 };
}

// Mechanical ESM-solution → compiled-/src-module conversion. Exported for tests.
export function esmToCells(src, problem) {
  if (problem.slug === "grep") return scriptScheme(src);
  let ast;
  try { ast = parser.parse(src, PARSE_OPTS); }
  catch (e) { return { ok: false, reason: "parse failed: " + e.message }; }
  const split = splitScheme(src, ast, problem);
  if (split.ok) return split;
  const bundle = bundleScheme(src, ast, problem);
  if (bundle.ok) return { ...bundle, fallbackFrom: split.reason };
  return { ok: false, reason: `split: ${split.reason}; bundle: ${bundle.reason}` };
}

// Reference solutions with no mechanical cell form (see the header). Reported, not counted as gate
// failures — the grader is not at fault and there is nothing to fix.
export const MODULE_MODE_EXCEPTIONS = {
  "parallel-letter-frequency": "CommonJS worker_threads solution: export assigned inside an " +
    "`if (isMainThread)` branch and `new Worker(__filename)` re-executes the file — no cell equivalent",
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  const only = flag("--slug", null);
  const mode = flag("--mode", "esm");
  const emit = flag("--emit", null);
  const all = JSON.parse(readFileSync(join(here, "problems.json"), "utf8"));
  const problems = only ? all.filter((p) => p.slug === only) : all;

  if (emit) {
    const p = all.find((x) => x.slug === emit);
    const c = esmToCells(p.proof, p);
    console.log(c.ok ? c.module : "NOT CONVERTIBLE: " + c.reason);
    process.exit(0);
  }

  let failed = 0;
  for (const which of mode === "both" ? ["esm", "module"] : [mode]) {
    let pass = 0, excused = 0;
    const rows = [];
    for (const p of problems) {
      let g, scheme = "esm", note = "";
      if (which === "esm") {
        g = gradeSolution(p, p.proof, { mode: "esm" });
      } else {
        const conv = esmToCells(p.proof, p);
        if (!conv.ok) { g = { pass: false, output: "CONVERSION: " + conv.reason, dir: null }; scheme = "none"; note = conv.reason; }
        else {
          scheme = conv.scheme;
          if (conv.fallbackFrom) note = "split→bundle: " + conv.fallbackFrom;
          if (p.slug === "grep") {
            const script = computeCellString(conv.module, "script");
            g = script == null ? { pass: false, output: "could not compute `script` cell", dir: null } : gradeSolution(p, script, { mode: "esm" });
          } else {
            g = gradeSolution(p, conv.module, { mode: "module" });
          }
        }
      }
      const first = (g.output || "").split("\n").find((l) => l.trim()) || "(no output)";
      if (g.pass) pass++;
      else if (which === "module" && MODULE_MODE_EXCEPTIONS[p.slug]) { excused++; note = MODULE_MODE_EXCEPTIONS[p.slug]; }
      rows.push({ slug: p.slug, pass: g.pass, scheme, note, first, dir: g.dir });
      console.log(`${g.pass ? "PASS" : "FAIL"} [${which}${which === "module" ? "/" + scheme : ""}] ${p.slug}${g.pass ? "" : "  " + first.slice(0, 120)}`);
    }
    console.log(`\n${which}: ${pass}/${problems.length} pass${excused ? ` (+${excused} documented exception${excused > 1 ? "s" : ""})` : ""}`);
    if (which === "module") {
      const byScheme = {};
      for (const r of rows) byScheme[r.scheme] = (byScheme[r.scheme] || 0) + 1;
      console.log("  schemes: " + Object.entries(byScheme).map(([k, v]) => `${k}=${v}`).join(" "));
      for (const r of rows.filter((x) => x.note || !x.pass)) console.log(`  ${r.slug} [${r.scheme}] ${r.note || r.first.slice(0, 120)}`);
    } else {
      for (const r of rows.filter((x) => !x.pass)) console.log(`  ${r.slug}: ${r.first}  [${r.dir}]`);
    }
    failed += problems.length - pass - excused;
  }
  process.exit(failed ? 1 : 0);
}

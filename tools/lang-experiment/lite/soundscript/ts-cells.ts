// The SoundScript runtime, checker and compiler as Observable cells, generated from their TypeScript
// sources (build.ts). A top-level declaration is one cell. Declarations that must share a cell (a
// top-level `let` and every declaration naming it; mutually recursive declarations; a const that
// names itself) are one block cell returning an object, with one projection cell per name used
// elsewhere. Types are erased with ../browser/erase.ts. Names are unique across the files, and
// imports between them are unaliased, so an import is dropped and the name is the cell. A declaration
// that neither the `soundscript` object nor a test cell reaches is left out. Each module ends with the
// test_* cells of runtime-tests.ojs or checker-tests.ojs. What WORKERS_ROOTS reach and neither module keeps is a
// third module, the worker pool add-on, which a module imports only to run compile's islands on workers.
// A SoundScript section (SS_FILES) is cells already: each of its cells is compiled by compileCellText, as the
// notebook compiles a SoundScript cell, and kept whole, type declarations included, so the notebook can check
// and edit it. The TypeScript files that link it for bun (BOOTSTRAP) give no cells.
import { readFileSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { syntaxStub } from "../toolchain/module-js.ts";
import * as acorn from "acorn";
import { parse, type Node } from "../parse.ts";
import { erase } from "../browser/erase.ts";
import { splitCells, compileCell, compileCellText, contextFromCheck, acceptedOf, inputsIn, INPUTS, RUNTIME_CELLS } from "../toolchain/ss-toolchain.ts";
import { checkSources } from "../core.ts";

type Compile = (src: string) => { _name?: string | null; _inputs?: string[]; _definition: unknown }[];
const LITE = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ENTRY = join(LITE, "soundscript/entry.ts");
export const RUNTIME = "@tomlarkworthy/soundscript-runtime";
export const CHECKER = "@tomlarkworthy/soundscript-checker";
export const WORKERS = "@tomlarkworthy/soundscript-workers";
// the add-on's roots: ss_pool = pagePool()
const WORKERS_ROOTS = ["pagePool"];
// the inputs compiled SoundScript cells take for runtime cells (ss_freeze ...), each to the runtime cell it imports
const RUNTIME_INPUTS = new Map(RUNTIME_CELLS.map((n) => [INPUTS[n], n]));
// in dependency order; where each declaration goes is decided in generate() ("module placement")
const RUNTIME_FILES = ["../prelude.runtime.ts", "runtime.ss.ts", "types.ss.ts", "boundary.ts", "jsx/h.ts", "jsx/render.ts", "browser/cells.ts", "browser/workers.ts"];
const SPLIT = "stdlib/runtime.ts";
// SoundScript sections, in the order of their modules in the notebook, and the files bun reaches that link them
// (types.ts imports types.ss.ts, runtime-ss.ts runtime.ss.ts, through link.ts)
export const SS_SOURCES = ["runtime.ss.ts", "types.ss.ts"];
const SS_FILES = new Set(SS_SOURCES);
// the module a section's cells go to when no cell of the other module reaches them (its type declarations)
const SS_HOME: Record<string, string> = { "runtime.ss.ts": RUNTIME, "types.ss.ts": CHECKER };
const BOOTSTRAP = ["types.ts", "runtime-ss.ts", "link.ts"];
const CHECKER_FILES = ["parse.ts", "intrinsics.ts", "registry.ts", "infer.ts", "own.ts", "capture.ts", "island.ts", "facts.ts", "core.ts", "complete.ts", "jsx/lower.ts", "browser/erase.ts", "toolchain/comment-types.ts", "toolchain/ss-toolchain.ts"];
// the third-party imports, and the cells of the checker module that provide them
const THIRD_PARTY: Record<string, { namespace?: string; names?: string[] }> = { acorn: { namespace: "acorn" }, "@sveltejs/acorn-typescript": { names: ["tsPlugin"] } };
export const PARSER_FILE = "acorn-typescript.js.gz";
export const PARSER_ENTRY = `export * as acorn from "acorn";\nexport { tsPlugin } from "@sveltejs/acorn-typescript";\n`;
const PARSER_CELLS = [
  `parser_lib = {
  // acorn and @sveltejs/acorn-typescript, the only code not generated from the TypeScript sources
  const stream = (await FileAttachment("${PARSER_FILE}").stream()).pipeThrough(new DecompressionStream("gzip"));
  const url = URL.createObjectURL(new Blob([await new Response(stream).text()], { type: "text/javascript" }));
  try {
    return await import(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}`,
  "acorn = parser_lib.acorn",
  "tsPlugin = parser_lib.tsPlugin",
];
// globals a generated cell may take as an input (the runtime resolves them: Generators is its builtin, the rest are on window)
const GLOBALS = new Set(["globalThis", "structuredClone", "Event", "EventTarget", "Generators"]);
// each section's heading and, per module it gives cells to, one sentence on what those cells do in the notebook
// (keyed by source file; a file that gives a module cells and has no sentence for it stops the build)
const SECTIONS: Record<string, { title: string; checkerTitle?: string; runtime?: string; checker?: string; workers?: string }> = {
  "../prelude.runtime.ts": { title: "State cells and actions", runtime: "The store behind each state cell and its handle, actions, the queue of top-level action calls, and the commit that applies their writes." },
  "runtime.ss.ts": { title: "Runtime cells in SoundScript", runtime: "Cells of the runtime written in SoundScript, compiled from lite/runtime.ss.ts: mismatch wording for the boundary, JSX children and event data, the order of listeners, and the bodies of a rejected cell and of compile." },
  "types.ss.ts": { title: "Types", checker: "How the checker represents a type, and union, substitution, widening and display over those types. These cells are SoundScript." },
  "boundary.ts": { title: "Values from other languages", checkerTitle: "Shapes for values from other languages", runtime: "`cross` and `checkShape` check a value from a cell in another language against a shape and return a deep-frozen copy.", checker: "`shapeOf` turns a parameter's type annotation into the shape the runtime checks." },
  "jsx/h.ts": { title: "Elements", runtime: "`h` makes the element values that compiled JSX evaluates to." },
  "jsx/render.ts": { title: "Rendering", runtime: "`create` and `patch` turn element values into DOM nodes, and patch a node in place when its tag is unchanged." },
  "browser/cells.ts": { title: "Events and listeners", runtime: "Events cells' handles and generators, the listeners `on` makes, delivery of each value to them, and `sweep`, which stops what no variable holds." },
  "browser/workers.ts": { title: "Worker pool", checkerTitle: "Running an island on the page", workers: "The pool of web workers that runs the islands `compile` makes.", checker: "`runHere` runs an island on the page when no pool is given." },
  "stdlib/runtime.ts": { title: "Running a compiled cell", checkerTitle: "Checking a module for the editor and compile", runtime: "What compiled state, events and listener cells call (`ref`, `events`, `listen`), with `viewRef` and `mount`.", checker: "`check` and `checkCells` check a module's cells and keep recent results; `compiler` checks and builds the island of a `compile(...)` call." },
  "parse.ts": { title: "Parser", checker: "Parses TypeScript and TSX with acorn and acorn-typescript, and keeps the comments." },
  "intrinsics.ts": { title: "Prelude declarations", checker: "The declaration text the checker reads for the prelude, the capabilities, JSX and the allowed globals, and the lists of prelude functions and capability names." },
  "registry.ts": { title: "Declarations and subtyping", checker: "Declarations by name, conversion of type syntax, expansion of aliases, member lookup, subtyping and unification." },
  "infer.ts": { title: "Type checking a cell", checker: "The type checker for one cell, and the facts it records for the ownership rules." },
  "own.ts": { title: "Ownership", checker: "The rules for `mut`, `freeze` and `borrow` over one checked cell." },
  "capture.ts": { title: "State inside actions", checker: "Reports an action body that uses a value depending on state." },
  "island.ts": { title: "Islands", checker: "The cells a `compile(...)` call runs: everything upstream of its outputs, stopping at its inputs and refs." },
  "facts.ts": { title: "Cell facts", checker: "What the compiler reads from a cell's function: its parameters, whether it returns `state(...)`, whether it is a generator, and its `compile(...)` calls." },
  "core.ts": { title: "Checking a module", checker: "`checkSources` checks every cell of a module and gives each one ok, rejected, unsupported or blocked." },
  "complete.ts": { title: "Completion", checker: "Editor completions for one cell from the checker's types, and the annotation a value from another language suggests." },
  "jsx/lower.ts": { title: "Lowering JSX", checker: "Replaces each JSX element with `h(...)` calls and leaves the rest of the text unchanged." },
  "browser/erase.ts": { title: "Erasing types", checker: "Removes type syntax from a cell's text, giving JavaScript." },
  "toolchain/comment-types.ts": { title: "Types as comments", checker: "Moves types into `/*ss:...*/` comments, so a compiled definition is runnable JavaScript that keeps its source, and moves them back." },
  "toolchain/ss-toolchain.ts": { title: "Compiling and decompiling a cell", checker: "`compileCell` turns one cell into runtime variables; `decompileVariable` recovers the cell's text from a variable's definition." },
};
const TESTS_LINE: Record<string, string> = {
  "@tomlarkworthy/soundscript-runtime": "These run the module's own functions: a write committed by an action, the order of queued action calls, and `cross` against wrong shapes and on a nested value.",
  "@tomlarkworthy/soundscript-checker": "These check, compile, run and decompile fixed sources through `soundscript`.",
};
// each module's test_* cells, Observable JavaScript separated by `// %%` lines; a runtime test takes only runtime cells
const RUNTIME_TESTS = join(LITE, "soundscript/runtime-tests.ojs");
const CHECKER_TESTS = join(LITE, "soundscript/checker-tests.ojs");
function testCells(file: string, compile: Compile) {
  const cells = readFileSync(file, "utf8").split(/^\/\/ %%.*$/m).map((x) => x.trim()).filter(Boolean);
  const vs = cells.flatMap((c) => compile(c));
  const names = vs.map((v) => v._name).filter((n): n is string => !!n);
  const bad = vs.filter((v) => !/^test_\w+$/.test(v._name ?? "") || syntaxStub(String(v._definition)) !== null);
  if (bad.length) throw new Error(`${file}: every cell is a test_* cell that compiles: ${bad.map((v) => v._name ?? String(v._definition).slice(0, 80)).join(", ")}`);
  return { cells, names, inputs: [...new Set(vs.flatMap((v) => v._inputs ?? []))] };
}

type Stmt = { file: string; names: string[]; isLet: boolean; kind: "function" | "class" | "const" | "ss"; text: string; comment: string; exported: boolean; inputs: string[] };
type Group = { file: string; stmts: Stmt[]; module?: string; deps: Set<Group>; name: string };

// the files bundled from entry.ts, by their relative imports
function reachable(): string[] {
  const tt = new Bun.Transpiler({ loader: "ts" });
  const seen = new Set<string>();
  const go = (f: string) => {
    if (seen.has(f)) return;
    seen.add(f);
    for (const i of tt.scanImports(readFileSync(f, "utf8"))) if (i.path.startsWith(".")) go(resolve(dirname(f), i.path));
  };
  go(ENTRY);
  seen.delete(ENTRY);
  return [...seen].map((f) => relative(LITE, f)).sort();
}

const isTs = (n: Node) => /^TS/.test(n.type) || (n.type === "ImportDeclaration");
// the end of the comments a file opens with: its header, about the source file; no cell takes them
function headerEnd(src: string): number {
  let at = 0;
  for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; }
  return at;
}
// A SoundScript section: one statement per cell (a type declaration too), its text the Observable cell
// compileCellText gives. Every cell must be accepted by the checker, or it would compile to a stub that throws.
// the cell texts of a SoundScript section, its header left out
export function ssCellTexts(file: string): string[] {
  const src = readFileSync(join(LITE, file), "utf8");
  return splitCells(src.slice(headerEnd(src)).trimStart(), false);
}
function ssStatements(file: string, compile: Compile): Stmt[] {
  const texts = ssCellTexts(file);
  const r = checkSources({ cells: texts.join("\n\n"), tsx: true });
  const accepted = acceptedOf(r);
  const bad = [...r.module.map((e) => `[${e.rule}] ${e.msg}`), ...r.cells.filter((c) => !accepted.has(c.name)).map((c) => `${c.name}: ${c.status} ${c.errors.map((e) => `[${e.rule}] ${e.msg}`).join("; ")}`)];
  if (bad.length) throw new Error(`${file}: the checker does not accept every cell: ${bad.join(" | ")}`);
  // a section of the runtime module takes the runtime cells as its own cells
  const ctx = { ...contextFromCheck(r), inputs: inputsIn(SS_HOME[file] === RUNTIME) };
  const shape = (vs: { name: string | null; inputs: string[]; definition: string }[]) => JSON.stringify(vs.map((v) => [v.name, v.inputs, v.definition]));
  return texts.map((t) => {
    const text = compileCellText(t, false, ctx);
    const vs = compile(text).map((v) => ({ name: v._name ?? null, inputs: v._inputs ?? [], definition: String(v._definition) }));
    if (shape(vs) !== shape(compileCell(t, false, ctx))) throw new Error(`${file}: the standard compile of ${t.slice(0, 60)} differs from compileCell`);
    if (vs.length !== 1 || !vs[0].name) throw new Error(`${file}: ${t.slice(0, 60)} is not one named variable`);
    return { file, names: [vs[0].name], isLet: false, kind: "ss", text, comment: "", exported: true, inputs: vs[0].inputs };
  });
}
function statements(file: string, compile: Compile): Stmt[] {
  if (SS_FILES.has(file)) return ssStatements(file, compile);
  const src = readFileSync(join(LITE, file), "utf8");
  const P = parse(src);
  const out: Stmt[] = [];
  const at = headerEnd(src);
  for (const s of P.program.body as Node[]) {
    if (s.type === "ImportDeclaration") {
      if (s.importKind === "type") continue;
      const from = s.source.value as string;
      for (const sp of s.specifiers) {
        if (sp.importKind === "type") continue;
        if (from.startsWith(".")) {
          if (sp.type !== "ImportSpecifier" || sp.imported.name !== sp.local.name) throw new Error(`${file}: import ${src.slice(sp.start, sp.end)} from ${from} is aliased or a namespace; cells need the plain name`);
        } else {
          const t = THIRD_PARTY[from];
          const ok = t && (sp.type === "ImportNamespaceSpecifier" ? sp.local.name === t.namespace : sp.type === "ImportSpecifier" && sp.imported.name === sp.local.name && t.names?.includes(sp.local.name));
          if (!ok) throw new Error(`${file}: import ${src.slice(sp.start, sp.end)} from ${from} is not provided by the parser cells`);
        }
      }
      continue;
    }
    if (s.type === "ExportAllDeclaration" || (s.type === "ExportNamedDeclaration" && !s.declaration)) continue;
    const exported = s.type === "ExportNamedDeclaration";
    const d: Node = exported ? s.declaration : s;
    if (isTs(d)) continue;
    let names: string[], kind: Stmt["kind"];
    if (d.type === "FunctionDeclaration") { names = [d.id.name]; kind = "function"; }
    else if (d.type === "ClassDeclaration") { names = [d.id.name]; kind = "class"; }
    else if (d.type === "VariableDeclaration") {
      kind = "const";
      names = [];
      const walk = (p: Node) => {
        if (p.type === "Identifier") names.push(p.name);
        else if (p.type === "ObjectPattern") p.properties.forEach((x: Node) => walk(x.type === "RestElement" ? x.argument : x.value));
        else if (p.type === "ArrayPattern") p.elements.forEach((x: Node | null) => x && walk(x.type === "RestElement" ? x.argument : x));
        else if (p.type === "AssignmentPattern") walk(p.left);
        else throw new Error(`${file}: pattern ${p.type}`);
      };
      d.declarations.forEach((x: Node) => walk(x.id));
    } else throw new Error(`${file}: top-level ${d.type} at line ${P.line(d.start)} is not a declaration`);
    // the comments directly above a declaration are its own; a blank line ends them, and a comment
    // separated from every declaration by a blank line is left out
    // a comment after code on its line belongs to that code
    const lead = P.leading(s).filter((c) => c.start >= at && !src.slice(src.lastIndexOf("\n", c.start - 1) + 1, c.start).trim());
    let k = lead.length;
    for (let next = s.start; k > 0 && !/\n[ \t]*\n/.test(src.slice(lead[k - 1].end, next)); next = lead[--k].start);
    const comment = lead.slice(k).map((c) => src.slice(c.start, c.end)).join("\n");
    // const a = 1, b = 2 is one cell per name
    const parts = d.type === "VariableDeclaration" && d.kind === "const" && d.declarations.length > 1 && d.declarations.every((x: Node) => x.id.type === "Identifier")
      ? d.declarations.map((x: Node) => ({ names: [x.id.name], ts: `const ${src.slice(x.start, x.end)};` }))
      : [{ names, ts: src.slice(d.start, d.end) }];
    parts.forEach((p: { names: string[]; ts: string }, i: number) => {
      const text = erase(p.ts);
      try { acorn.parse(text, { ecmaVersion: "latest", sourceType: "module" }); } catch (e) { throw new Error(`${file}: ${p.names.join(", ")} still has TypeScript after erase: ${(e as Error).message}`); }
      out.push({ file, names: p.names, isLet: d.type === "VariableDeclaration" && d.kind !== "const", kind, text, comment: i ? "" : comment, exported, inputs: freeNames(text, compile) });
    });
  }
  return out;
}

// the free names of a statement, as the Observable compiler finds them (names it declares are bound
// in a block). The compiler refuses an assignment to a free name; such a name is bound with a let and counted.
function freeNames(text: string, compile: Compile): string[] {
  const assigned: string[] = [];
  for (;;) {
    const v = compile(`_ = {\n${assigned.map((n) => `let ${n};\n`).join("")}${text}\nreturn null;\n}`)[0];
    const err = /Assignment to constant variable ([\w$]+)/.exec(String(v._definition));
    if (err) { assigned.push(err[1]); continue; }
    if (!v._name) throw new Error(`no free names for ${text.slice(0, 80)}: ${String(v._definition).slice(0, 200)}`);
    return [...(v._inputs ?? []), ...assigned];
  }
}

// text for an md template: backslash, backtick and ${ escaped, < as an entity
const mdText = (t: string) => t.replace(/[\\`]|\$\{/g, (x) => "\\" + x).replace(/</g, "&lt;");
const indent = (t: string) => t.split("\n").map((l) => (l ? "  " + l : l)).join("\n");
// a comment kept inside a definition: the Observable compiler copies the text of a body, not what precedes it
function withComment(text: string, comment: string): string {
  if (!comment) return text;
  const body = (acorn.parse(text, { ecmaVersion: "latest", sourceType: "module" }) as any).body[0].body.start;
  return text.slice(0, body + 1) + "\n" + indent(comment) + text.slice(body + 1);
}

export type Generated = { runtime: string[]; checker: string[]; workers: string[]; stats: Record<string, unknown> };

export function generate(compile: Compile, ssKeys: string[]): Generated {
  const files = [...RUNTIME_FILES, SPLIT, ...CHECKER_FILES];
  const want = reachable(), have = [...files, ...BOOTSTRAP].sort();
  if (JSON.stringify(want) !== JSON.stringify(have)) throw new Error(`entry.ts reaches ${JSON.stringify(want)}; ts-cells.ts lists ${JSON.stringify(have)}`);
  const stmts = files.flatMap((f) => statements(f, compile));
  const owner = new Map<string, Stmt>();
  for (const s of stmts) for (const n of s.names) {
    if (owner.has(n)) throw new Error(`${n} is declared in ${owner.get(n)!.file} and ${s.file}; names must be unique across the files`);
    owner.set(n, s);
  }
  for (const n of [...Object.values(THIRD_PARTY).flatMap((t) => [t.namespace, ...(t.names ?? [])]), "parser_lib", "soundscript"]) if (n && owner.has(n)) throw new Error(`${n} is a generated cell's name`);
  const depsOf = (s: Stmt) => s.inputs.filter((n) => owner.has(n)).map((n) => owner.get(n)!);
  // union: a let with every statement that names it
  const parent = new Map(stmts.map((s) => [s, s]));
  const find = (s: Stmt): Stmt => (parent.get(s) === s ? s : find(parent.get(s)!));
  const union = (a: Stmt, b: Stmt) => parent.set(find(a), find(b));
  for (const s of stmts) for (const d of depsOf(s)) if (d.isLet) union(s, d);
  // then strongly connected components (Tarjan) over the unions
  const unit = (s: Stmt) => find(s);
  const units = [...new Set(stmts.map(unit))];
  const members = new Map(units.map((u) => [u, stmts.filter((s) => unit(s) === u)]));
  const edges = new Map(units.map((u) => [u, new Set(members.get(u)!.flatMap(depsOf).map(unit))]));
  let idx = 0;
  const ix = new Map<Stmt, number>(), low = new Map<Stmt, number>(), stack: Stmt[] = [], on = new Set<Stmt>(), sccs: Stmt[][] = [];
  const sc = (v: Stmt) => {
    ix.set(v, idx); low.set(v, idx++); stack.push(v); on.add(v);
    for (const w of edges.get(v)!) {
      if (!ix.has(w)) { sc(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v)!, ix.get(w)!));
    }
    if (low.get(v) === ix.get(v)) { const c: Stmt[] = []; let w: Stmt; do { w = stack.pop()!; on.delete(w); c.push(w); } while (w !== v); sccs.push(c); }
  };
  units.forEach((u) => !ix.has(u) && sc(u));
  const groupOf = new Map<Stmt, Group>();
  const groups: Group[] = sccs.map((c) => {
    const ss = c.flatMap((u) => members.get(u)!).sort((a, b) => stmts.indexOf(a) - stmts.indexOf(b));
    const g: Group = { file: ss[0].file, stmts: ss, deps: new Set(), name: "" };
    ss.forEach((s) => groupOf.set(s, g));
    return g;
  }).sort((a, b) => stmts.indexOf(a.stmts[0]) - stmts.indexOf(b.stmts[0]));
  for (const g of groups) for (const s of g.stmts) for (const d of depsOf(s)) if (groupOf.get(d) !== g) g.deps.add(groupOf.get(d)!);
  // module placement. The test cells' inputs and the soundscript object's names are the roots; a
  // declaration neither reaches is left out. A declaration goes to the runtime module when a runtime test
  // or a name soundscript takes from the runtime's files reaches it, and to the checker otherwise.
  const reachesParser = new Map<Group, boolean>();
  const reaches = (g: Group): boolean => {
    if (!reachesParser.has(g)) { reachesParser.set(g, false); reachesParser.set(g, g.stmts.some((s) => s.inputs.some((n) => n === "acorn" || n === "tsPlugin")) || [...g.deps].some(reaches)); }
    return reachesParser.get(g)!;
  };
  const tests = { [RUNTIME]: testCells(RUNTIME_TESTS, compile), [CHECKER]: testCells(CHECKER_TESTS, compile) };
  const rootsOf = (names: string[]) => names.filter((n) => owner.has(n)).map((n) => groupOf.get(owner.get(n)!)!);
  const closure = (start: Group[]) => {
    const seen = new Set<Group>();
    const go = (g: Group) => { if (!seen.has(g)) { seen.add(g); g.deps.forEach(go); } };
    start.forEach(go);
    return seen;
  };
  const runtimeSide = (g: Group) => (RUNTIME_FILES.includes(g.file) || g.file === SPLIT) && !reaches(g);
  const inRuntime = closure([...rootsOf(ssKeys).filter(runtimeSide), ...rootsOf(tests[RUNTIME].inputs)]);
  // a SoundScript section is kept whole: the notebook checks its cells against its type declarations
  const kept = closure([...rootsOf(ssKeys), ...rootsOf(tests[CHECKER].inputs), ...inRuntime, ...groups.filter((g) => SS_FILES.has(g.file))]);
  for (const g of kept) g.module = inRuntime.has(g) || SS_HOME[g.file] === RUNTIME ? RUNTIME : CHECKER;
  for (const g of closure(rootsOf(WORKERS_ROOTS))) if (!kept.has(g)) { g.module = WORKERS; kept.add(g); }
  const dropped = groups.filter((g) => !kept.has(g));
  for (const g of kept) if (g.module === RUNTIME) {
    if (CHECKER_FILES.includes(g.file)) throw new Error(`runtime cell ${g.stmts[0].names[0]} is declared in the checker's ${g.file}`);
    if (reaches(g)) throw new Error(`runtime cell ${g.stmts[0].names[0]} reaches the parser`);
  }
  for (const g of kept) if (g.module === RUNTIME) for (const d of g.deps) if (d.module !== RUNTIME) throw new Error(`runtime cell ${g.stmts[0].names[0]} takes checker cell ${d.stmts[0].names[0]}`);
  // names other cells take, plus every exported name
  const cells = { [RUNTIME]: [] as string[], [CHECKER]: [] as string[], [WORKERS]: [] as string[] };
  const lineKey = (m: string) => (m === RUNTIME ? "runtime" : m === CHECKER ? "checker" : "workers");
  const shapes = { single: 0, block: 0, ss: 0, groups: [] as string[][] };
  let lastFile = "";
  const emit = (g: Group, src: string) => {
    const r = compile(src);
    if (!r.length || r.some((v) => syntaxStub(String(v._definition)) !== null)) throw new Error(`does not compile: ${String(r[0]?._definition).slice(0, 200)}`);
    cells[g.module!].push(src);
  };
  for (const g of groups) {
    if (!kept.has(g)) continue;
    if (g.file !== lastFile) {
      lastFile = g.file;
      for (const m of [RUNTIME, CHECKER, WORKERS]) {
        if (!groups.some((x) => x.file === g.file && x.module === m && kept.has(x))) continue;
        const sec = SECTIONS[g.file], line = sec?.[lineKey(m)];
        if (!sec || !line) throw new Error(`SECTIONS has no ${lineKey(m)} sentence for ${g.file}, which gives that module cells`);
        cells[m].push(`md\`## ${m === CHECKER ? sec.checkerTitle ?? sec.title : sec.title}\n\n${mdText(line)}\``);
      }
    }
    const names = g.stmts.flatMap((s) => s.names);
    const single = g.stmts.length === 1 && names.length === 1 ? g.stmts[0] : null;
    if (single?.kind === "ss") { emit(g, single.text); shapes.ss++; continue; }
    if (single) {
      const n = names[0];
      const decl: any = acorn.parse(single.text, { ecmaVersion: "latest", sourceType: "module" }).body[0];
      const x = decl.type === "VariableDeclaration" ? decl.declarations[0].init : null;
      const init = x ? single.text.slice(x.start, x.end) : single.text;
      // an object literal is parenthesised, or it reads as a block
      const plain = single.kind === "const" ? `${n} = ${init.startsWith("{") ? `(${init})` : init}` : withComment(single.text, single.comment);
      const selfRef = (compile(plain)[0]._inputs ?? []).includes(n);
      if (single.kind !== "const" && !selfRef) { emit(g, plain); shapes.single++; continue; }
      if (single.kind === "const" && !selfRef && !single.comment) { emit(g, plain); shapes.single++; continue; }
      emit(g, `${n} = {\n${indent([single.comment, single.text].filter(Boolean).join("\n"))}\n  return ${n};\n}`);
      shapes.block++;
      continue;
    }
    // one block cell, named after the first name it gives out
    // the names a cell outside the group takes, or that a file exports; a let is never one
    const out = names.filter((n) => ssKeys.includes(n) || g.stmts.find((s) => s.names.includes(n))!.exported || [...tests[RUNTIME].inputs, ...tests[CHECKER].inputs].includes(n) || stmts.some((s) => !g.stmts.includes(s) && kept.has(groupOf.get(s)!) && s.inputs.includes(n)));
    for (const n of out) if (g.stmts.find((s) => s.names.includes(n))!.isLet) throw new Error(`${n} is a let that a cell outside its group takes`);
    g.name = (out[0] ?? names[0]) + "_cells";
    if (owner.has(g.name)) throw new Error(`group name ${g.name} is taken`);
    const body = g.stmts.map((s) => [s.comment, s.text].filter(Boolean).join("\n")).join("\n");
    emit(g, `${g.name} = {\n${indent(body)}\n  return { ${out.join(", ")} };\n}`);
    for (const n of out) emit(g, `${n} = ${g.name}.${n}`);
    shapes.groups.push(names);
  }
  for (const m of [RUNTIME, CHECKER]) if (tests[m].cells.length) cells[m].push(`md\`## Tests\n\n${mdText(TESTS_LINE[m])}\``, ...tests[m].cells);
  // inputs that are neither cells nor the parser's: globals, listed
  const known = new Set([...owner.keys(), ...groups.map((g) => g.name).filter(Boolean), ...tests[RUNTIME].names, ...tests[CHECKER].names, "acorn", "tsPlugin", "parser_lib", "md", "FileAttachment", "soundscript", ...RUNTIME_INPUTS.keys()]);
  const strays = new Set<string>();
  for (const m of [RUNTIME, CHECKER, WORKERS]) for (const src of cells[m]) for (const v of compile(src)) for (const i of v._inputs ?? []) if (!known.has(i)) strays.add(i);
  const unexpected = [...strays].filter((n) => !GLOBALS.has(n));
  if (unexpected.length) throw new Error(`generated cells take ${unexpected.join(", ")}, which no cell defines and GLOBALS does not list`);
  // cross-module imports: the checker module takes runtime cells
  const runtimeNames = new Set<string>();
  for (const src of cells[RUNTIME]) for (const v of compile(src)) if (v._name) runtimeNames.add(v._name);
  const strayTest = tests[RUNTIME].inputs.filter((n) => !runtimeNames.has(n) && !GLOBALS.has(n));
  if (strayTest.length) throw new Error(`${RUNTIME_TESTS} takes ${strayTest.join(", ")}, which the runtime module does not define`);
  const takes = new Set<string>();
  for (const src of [...cells[CHECKER]]) for (const v of compile(src)) for (const i of v._inputs ?? []) if (runtimeNames.has(i)) takes.add(i);
  const missing = ssKeys.filter((k) => !runtimeNames.has(k) && !cells[CHECKER].some((src) => compile(src).some((v) => v._name === k)));
  if (missing.length) throw new Error(`entry.ts exports ${missing.join(", ")}, which no generated cell defines`);
  for (const k of ssKeys) if (runtimeNames.has(k)) takes.add(k);
  // the runtime cells the checker's compiled cells take, imported under their inputs' names (freeze as ss_freeze). It
  // hosts SoundScript cells (its SoundScript section), so it imports rejected as ss_rejected, which the editor reads
  // as the mark of a module that holds them
  const aliased = new Set(cells[CHECKER].flatMap((src) => compile(src).flatMap((v) => (v._inputs ?? []).filter((i) => RUNTIME_INPUTS.has(i)))));
  if (stmts.some((s) => s.kind === "ss" && SS_HOME[s.file] === CHECKER)) aliased.add(INPUTS.rejected);
  const checker = [
    `md\`# SoundScript checker and compiler\n\nThe SoundScript checker, the compiler from a checked cell to runtime variables, and the editor support. \\\`soundscript\\\` is this module's object: the checker, the compiler and the editor support, with the runtime's names too. Compiled cells take \\\`ss\\\` of \\\`@tomlarkworthy/soundscript-runtime\\\` instead, so they do not depend on this module. Examples are in \\\`@tomlarkworthy/soundscript-tutorial\\\`.\n\nThe build generates these cells from the TypeScript sources in \\\`tools/lang-experiment/lite/\\\`, so an edit made here is lost at the next build. The parser is the attachment \\\`acorn-typescript.js.gz\\\`.\``,
    ...PARSER_CELLS,
    `soundscript = ({ ${ssKeys.join(", ")} })`,
    ...cells[CHECKER],
    `import { ${[...[...takes].sort(), ...[...aliased].sort().map((i) => `${RUNTIME_INPUTS.get(i)} as ${i}`)].join(", ")} } from "${RUNTIME}"`,
  ];
  const runtime = [
    `md\`# SoundScript runtime\n\nWhat compiled SoundScript cells call: state cells, actions and the write queue, events and listeners, the JSX renderer, and the checks on values from cells in other languages. This module imports nothing. Examples are in \\\`@tomlarkworthy/soundscript-tutorial\\\`.\n\nThe build generates these cells from \\\`tools/lang-experiment/prelude.runtime.ts\\\` and the TypeScript sources in \\\`tools/lang-experiment/lite/\\\`, so an edit made here is lost at the next build.\``,
    ...cells[RUNTIME],
  ];
  // the add-on takes the cells it needs from the other two modules; nothing takes a cell of it but the module that imports ss_pool
  const namesOf = (m: string) => new Set(cells[m].flatMap((src) => compile(src).map((v) => v._name).filter((n): n is string => !!n)));
  const checkerNames = namesOf(CHECKER);
  const workersTakes = [...new Set(cells[WORKERS].flatMap((src) => compile(src).flatMap((v) => v._inputs ?? [])))].sort();
  const workersNames = namesOf(WORKERS);
  for (const m of [RUNTIME, CHECKER]) for (const src of cells[m]) for (const v of compile(src)) for (const i of v._inputs ?? []) if (workersNames.has(i)) throw new Error(`${m} cell ${v._name} takes the add-on's ${i}`);
  const fromModule = (names: Set<string>, m: string) => { const xs = workersTakes.filter((n) => names.has(n)); return xs.length ? [`import { ${xs.join(", ")} } from "${m}"`] : []; };
  const workers = [
    `md\`# SoundScript workers\n\nA worker pool for \\\`compile\\\`. A module whose cells take \\\`pool\\\` imports \\\`ss_pool\\\` from here; a notebook that does not import it starts no worker.\n\nThe build generates these cells from \\\`tools/lang-experiment/lite/browser/workers.ts\\\`, so an edit made here is lost at the next build.\``,
    "ss_pool = pagePool()",
    ...cells[WORKERS],
    ...fromModule(runtimeNames, RUNTIME), ...fromModule(checkerNames, CHECKER),
  ];
  return {
    runtime, checker, workers,
    stats: { statements: stmts.length, dropped: dropped.flatMap((g) => g.stmts.flatMap((s) => s.names)), tests: { runtime: tests[RUNTIME].names, checker: tests[CHECKER].names }, singleCells: shapes.single, blockCells: shapes.block, soundScriptCells: shapes.ss, groups: shapes.groups, globals: [...strays].sort(), runtimeCells: runtime.length, checkerCells: checker.length, workersCells: workers.length, workersImports: workersTakes.filter((n) => runtimeNames.has(n) || checkerNames.has(n)), imported: takes.size },
  };
}

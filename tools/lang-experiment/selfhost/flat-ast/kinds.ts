// The node types the checker names, and the fields it reads, from the AST of the checker sources (no text matching).
// A type is named when a string literal is compared (=== !== == !=) with a `.type` read, is a case of a switch on
// a `.type` read, is matched by a regex literal tested on a `.type` read (expanded against the universe below), is
// a key of an object literal / element of a Set, Map or array literal that is indexed by, `.has`-ed or
// `.includes`-ed with a `.type` read. Every other `.type` read is listed as uncovered, for inspection.
// The universe: every node type acorn + acorn-typescript produced on the corpus (corpus.ts) plus every string the
// first pass found. Fields read: every non-computed member property name and every destructured key in the files.
// Run: bun selfhost/flat-ast/kinds.ts   (writes out/kinds.json)
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse, type Node } from "../../lite/parse.ts";
import { corpus } from "./corpus.ts";

const ROOT = join(import.meta.dir, "../..");
export const CHECKER_FILES = readdirSync(join(ROOT, "lite")).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).sort().map((f) => `lite/${f}`);

const walk = (n: any, f: (x: Node, parent: Node | null) => void, parent: Node | null = null) => {
  if (!n || typeof n !== "object") return;
  if (Array.isArray(n)) { for (const x of n) walk(x, f, parent); return; }
  if (typeof n.type !== "string") return;
  f(n, parent);
  for (const k in n) if (k !== "loc") walk(n[k], f, n);
};
const unChain = (x: Node): Node => (x && x.type === "ChainExpression" ? x.expression : x);
const isTypeRead = (x: Node): boolean => { const y = unChain(x); return !!y && y.type === "MemberExpression" && !y.computed && y.property.type === "Identifier" && y.property.name === "type"; };
const strLit = (x: Node): string | null => (x && x.type === "Literal" && typeof x.value === "string" ? x.value : null);

// node types in the corpus parses
export function corpusTypes(): Set<string> {
  const out = new Set<string>();
  for (const c of corpus()) { try { walk(parse(c.src, { jsx: c.tsx }).program, (x) => out.add(x.type)); } catch {} }
  return out;
}

export function derive(files: string[] = CHECKER_FILES, universe0: Set<string> = corpusTypes()) {
  const named = new Map<string, Set<string>>(); // type -> files
  const regexes: { file: string; line: number; re: RegExp }[] = [];
  const uncovered: string[] = [];
  const fieldsRead = new Set<string>();
  const direct = new Set<string>();
  const add = (t: string, file: string, viaRe = false) => { if (!named.has(t)) named.set(t, new Set()); named.get(t)!.add(file); if (!viaRe) direct.add(t); };
  for (const file of files) {
    const src = readFileSync(join(ROOT, file), "utf8");
    const P = parse(src);
    // identifier -> initialiser, for tables indexed by .type
    const inits = new Map<string, Node>();
    walk(P.program, (x) => { if (x.type === "VariableDeclarator" && x.id.type === "Identifier" && x.init) inits.set(x.id.name, x.init); });
    const tableStrings = (obj: Node): string[] => {
      let o = unChain(obj);
      if (o?.type === "Identifier" && inits.has(o.name)) o = inits.get(o.name)!;
      if (!o) return [];
      if (o.type === "ObjectExpression") return o.properties.flatMap((p: Node) => (p.type === "Property" ? [p.key.type === "Identifier" ? p.key.name : strLit(p.key)].filter((s): s is string => !!s) : []));
      if (o.type === "NewExpression" && o.arguments[0]?.type === "ArrayExpression") return o.arguments[0].elements.flatMap((e: Node) => (e?.type === "ArrayExpression" ? [strLit(e.elements[0])] : [strLit(e)])).filter((s: string | null): s is string => !!s);
      if (o.type === "ArrayExpression") return o.elements.map(strLit).filter((s: string | null): s is string => !!s);
      return [];
    };
    const covered = new Set<Node>();
    walk(P.program, (x, parent) => {
      if (x.type === "MemberExpression" && !x.computed && x.property.type === "Identifier") fieldsRead.add(x.property.name);
      if (x.type === "ObjectPattern") for (const p of x.properties) if (p.type === "Property" && p.key.type === "Identifier") fieldsRead.add(p.key.name);
      if (x.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(x.operator)) {
        for (const [a, b] of [[x.left, x.right], [x.right, x.left]]) if (isTypeRead(a) && strLit(b) !== null) { add(strLit(b)!, file); covered.add(unChain(a)); }
      }
      if (x.type === "SwitchStatement" && isTypeRead(x.discriminant)) {
        covered.add(unChain(x.discriminant));
        for (const c of x.cases) if (strLit(c.test) !== null) add(strLit(c.test)!, file);
      }
      if (x.type === "CallExpression" && x.callee.type === "MemberExpression" && !x.callee.computed && x.arguments.length === 1 && isTypeRead(x.arguments[0])) {
        const m = x.callee.property.name, obj = x.callee.object;
        if (m === "test" && obj.type === "Literal" && obj.regex) { regexes.push({ file, line: P.line(x.start), re: new RegExp(obj.regex.pattern, obj.regex.flags) }); covered.add(unChain(x.arguments[0])); }
        if (m === "has" || m === "includes" || m === "get") { for (const s of tableStrings(obj)) add(s, file); covered.add(unChain(x.arguments[0])); }
      }
      if (x.type === "MemberExpression" && x.computed && isTypeRead(x.property)) { for (const s of tableStrings(x.object)) add(s, file); covered.add(unChain(x.property)); }
    });
    walk(P.program, (x) => { if (isTypeRead(x) && x.type === "MemberExpression" && !covered.has(x)) uncovered.push(`${file}:${P.line(x.start)} ${src.slice(x.start, Math.min(x.end + 20, src.indexOf("\n", x.start) < 0 ? src.length : src.indexOf("\n", x.start)))}`); });
  }
  const universe = new Set([...universe0, ...named.keys()]);
  const viaRegex = new Map<string, string[]>();
  for (const r of regexes) for (const t of universe) if (r.re.test(t)) { add(t, r.file, true); viaRegex.set(t, [...(viaRegex.get(t) ?? []), `${r.file}:${r.line}`]); }
  return { named, viaRegex, uncovered, fieldsRead, universe, direct };
}

// the `type:` literals of the survey's 84-record union (probes/ast.ss.ts), read off its AST
export function surveyUnion(): Set<string> {
  const P = parse(readFileSync(join(ROOT, "selfhost/checker-survey/probes/ast.ss.ts"), "utf8"));
  const out = new Set<string>();
  walk(P.program, (x) => {
    if (x.type !== "TSPropertySignature" || x.key.type !== "Identifier" || x.key.name !== "type") return;
    const lits = (t: Node): void => {
      if (!t) return;
      if (t.type === "TSLiteralType" && typeof t.literal.value === "string") out.add(t.literal.value);
      if (t.type === "TSUnionType") t.types.forEach(lits);
    };
    lits(x.typeAnnotation?.typeAnnotation);
  });
  return out;
}

if (import.meta.main) {
  const { census } = await import("./census.ts");
  const cen = census();
  const universe = new Set(Object.keys(cen));
  const { FILES: SURVEY_FILES } = await import("../checker-survey/inventory.ts");
  const d = derive(CHECKER_FILES, universe);
  const ds = derive(SURVEY_FILES, universe);
  const all = [...d.named.keys()].sort();
  const notInCensus = all.filter((t) => !universe.has(t));
  const censusNotNamed = [...universe].filter((t) => !d.named.has(t)).sort();
  const regexOnly = all.filter((t) => d.viaRegex.has(t) && [...d.named.get(t)!].every(() => true) && !directly(d, t));
  const su = surveyUnion();
  const surveyNamed = new Set(ds.named.keys());
  mkdirSync(join(import.meta.dir, "out"), { recursive: true });
  writeFileSync(join(import.meta.dir, "out/kinds.json"), JSON.stringify({ files: CHECKER_FILES, named: Object.fromEntries(all.map((t) => [t, [...d.named.get(t)!]])), viaRegex: Object.fromEntries(d.viaRegex), notInCensus, censusNotNamed, uncovered: d.uncovered, fieldsRead: [...d.fieldsRead].sort(), surveyFilesNamed: [...surveyNamed].sort(), surveyUnion: [...su].sort() }, null, 1));
  console.log(`checker files (lite/*.ts, no tests): ${CHECKER_FILES.length}`);
  console.log(`named node types: ${all.length}; through a regex only: ${regexOnly.length}: ${regexOnly.join(" ")}`);
  console.log(`  not in the census (acorn as parse.ts configures it never produced them): ${notInCensus.length}: ${notInCensus.join(" ")}`);
  console.log(`census node types: ${universe.size}; never named: ${censusNotNamed.length}: ${censusNotNamed.join(" ")}`);
  console.log(`survey file set (inventory.ts FILES, ${SURVEY_FILES.length} files) names ${surveyNamed.size}; not named by lite/*.ts: ${[...surveyNamed].filter((t) => !d.named.has(t)).sort().join(" ")}`);
  console.log(`  named by lite/*.ts, not by the survey files: ${all.filter((t) => !surveyNamed.has(t)).join(" ")}`);
  console.log(`survey union (probes/ast.ss.ts): ${su.size} type literals; not named by lite/*.ts: ${[...su].filter((t) => !d.named.has(t)).sort().join(" ")}`);
  console.log(`  of those, named by the survey files: ${[...su].filter((t) => !d.named.has(t) && surveyNamed.has(t)).sort().join(" ")}`);
  console.log(`.type reads not covered by a pattern: ${d.uncovered.length}`);
  for (const u of d.uncovered) console.log(`  ${u}`);
}
// named by a comparison, case or table, not only by a regex
function directly(d: ReturnType<typeof derive>, t: string): boolean { return d.direct.has(t); }

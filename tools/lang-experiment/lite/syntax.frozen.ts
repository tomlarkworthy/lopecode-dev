// core.ts's syntax pass and module-level loop as they were before core.ts called syntaxCheck (2026-11-21), frozen:
// the reference syntax.test.ts compares acorn/syntax.ss.ts against. Not used by the checker.
import { type Node, type Parsed } from "./infer/frozen/ts/parse.ts";
import { Registry } from "./infer/frozen/ts/registry.ts";
import { reservedName, viewofInputName, RESERVED_MSG, banMessage } from "./types.ts";

type LiteError = { rule: string; line: number; msg: string };
type CellDef = { name: string; fn: Node; stmt: Node };

const SYNTAX: Record<string, string> = {
  ThisExpression: "no-this", ClassDeclaration: "no-class", ClassExpression: "no-class", TSAnyKeyword: "no-any",
  TSNonNullExpression: "no-non-null", ImportExpression: "no-dynamic-import", TSEnumDeclaration: "no-enum",
  TSModuleDeclaration: "no-namespace", TSTypeAssertion: "no-cast",
};
export function syntaxPass(n: Node, report: (n: Node, rule: string, msg: string) => void, unsup: (n: Node, what: string) => void) {
  const walk = (x: any, parent: any, inType = false) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) { x.forEach((y) => walk(y, parent, inType)); return; }
    if (typeof x.type !== "string") return;
    const named = parent && !parent.computed && ((parent.type === "MemberExpression" && parent.property === x) || (parent.type === "Property" && parent.key === x && parent.value !== x));
    if (x.type === "Identifier" && !inType && reservedName(x.name) && !(named && !viewofInputName(x.name))) report(x, "reserved-name", RESERVED_MSG(x.name));
    const r = SYNTAX[x.type];
    // DELIBERATE CHANGE (2026-11-23, e1): x!'s message names what to write instead (banMessage, messages.ss.ts)
    if (r) report(x, r, banMessage(r, x.type));
    if (x.type === "TSAsExpression" && !(x.typeAnnotation.type === "TSTypeReference" && x.typeAnnotation.typeName?.name === "const")) report(x, "no-cast", "as cast");
    if (x.type === "TSSatisfiesExpression") unsup(x, "satisfies");
    if (x.type === "VariableDeclaration" && x.kind === "var") report(x, "no-var", "var");
    if (x.type === "Identifier" && x.name === "arguments" && !(parent?.type === "MemberExpression" && parent.property === x && !parent.computed) && !(parent?.type === "Property" && parent.key === x))
      report(x, "no-arguments", "arguments");
    // DELIBERATE CHANGE (2026-11-23, e1): a BigInt literal as a property key is unsupported
    if (x.type === "Literal" && typeof x.bigint === "string" && parent?.type === "Property" && !parent.computed && parent.key === x) unsup(x, "a BigInt literal as a property key");
    for (const k in x) if (k !== "loc") walk(x[k], x, inType || TYPE_POSITIONS.has(k));
  };
  walk(n, null);
}
const TYPE_POSITIONS = new Set(["typeAnnotation", "returnType", "typeParameters", "typeArguments"]);

export function moduleShape(P: Parsed, shellNames: Set<string>): { cells: CellDef[]; errors: LiteError[] } {
  const reg = new Registry();
  const moduleErrs: LiteError[] = [];
  const mod = (p: Parsed, n: Node, rule: string, msg: string) => moduleErrs.push({ rule, line: p.line(n.start), msg });
  // cells.ts module level
  const cells: CellDef[] = [];
  // a type or interface with a built-in type's name is not loaded: the cells read the built-in
  const builtin = reg.builtinTypeNames();
  const clash = new Set<Node>();
  for (const st of P.program.body as Node[]) {
    const d = st.type === "ExportNamedDeclaration" && st.declaration ? st.declaration : st;
    if ((d.type === "TSTypeAliasDeclaration" || d.type === "TSInterfaceDeclaration") && builtin.has(d.id.name)) {
      clash.add(d);
      mod(P, d, "builtin-type-name", `${d.id.name} is a built-in type; give this ${d.type === "TSInterfaceDeclaration" ? "interface" : "type"} another name`);
    }
  }
  // DELIBERATE CHANGE (2026-11-23, e1): a type alias that reaches itself through names, unions, intersections,
  // parentheses, Mut, Borrowed and generic aliases that give back an argument is [type-cycle] and is not loaded
  const aliasDecls = new Map<string, Node>();
  for (const st of P.program.body as Node[]) { const d = st.type === "ExportNamedDeclaration" && st.declaration ? st.declaration : st; if (d.type === "TSTypeAliasDeclaration") aliasDecls.set(d.id.name, d); }
  const heads = (n: Node, args: Map<string, string[]>, path: Set<string>): string[] => {
    if (n.type === "TSParenthesizedType") return heads(n.typeAnnotation, args, path);
    if (n.type === "TSUnionType" || n.type === "TSIntersectionType") return n.types.flatMap((x: Node) => heads(x, args, path));
    if (n.type !== "TSTypeReference" || n.typeName.type !== "Identifier") return [];
    const name: string = n.typeName.name, given = args.get(name), d = aliasDecls.get(name), ta = n.typeArguments;
    if (given) return given;
    if ((name === "Mut" || name === "Borrowed") && ta?.params[0]) return heads(ta.params[0], args, path);
    if (!d || !d.typeParameters || !ta || path.has(name)) return [name];
    const m = new Map<string, string[]>();
    d.typeParameters.params.forEach((p: Node, i: number) => m.set(p.name, ta.params[i] ? heads(ta.params[i], args, path) : []));
    return [name, ...heads(d.typeAnnotation, m, new Set([...path, name]))];
  };
  for (const [name, d] of aliasDecls) {
    const seen = new Set<string>(), todo = heads(d.typeAnnotation, new Map(), new Set([name]));
    for (let x = todo.pop(); x !== undefined; x = todo.pop()) {
      if (x === name) { clash.add(d); mod(P, d, "type-cycle", `type ${name} is defined by itself, with no object, array, tuple or function type between (as in type ${name} = ${name}); write out the type it stands for`); break; }
      const e = aliasDecls.get(x);
      if (seen.has(x) || !e) continue;
      seen.add(x);
      todo.push(...heads(e.typeAnnotation, new Map((e.typeParameters?.params ?? []).map((p: Node) => [p.name, []])), new Set([x])));
    }
  }
  const rest = reg.load(P, "user", true, clash);
  for (const st of rest) {
    // a cell is a top-level function or const/let, with or without `export` (2026-11-15: without is the form)
    const d = st.type === "ExportNamedDeclaration" && st.declaration ? st.declaration : st;
    if (d.type === "FunctionDeclaration") { cells.push({ name: d.id.name, fn: d, stmt: st }); continue; }
    if (d.type === "VariableDeclaration" && d.kind !== "var" && !d.declare) {
      for (const x of d.declarations) {
        if (x.id.type === "Identifier" && x.init && (x.init.type === "ArrowFunctionExpression" || x.init.type === "FunctionExpression")) cells.push({ name: x.id.name, fn: x.init, stmt: st });
        else mod(P, x, "cell-not-function", `${x.id.name ?? "?"} is not a function`);
      }
      continue;
    }
    if (st.type === "ImportDeclaration" && st.importKind === "type") continue;
    const rule = d.type === "TSEnumDeclaration" ? "no-enum" : d.type === "TSModuleDeclaration" ? "no-namespace" : d.type === "ClassDeclaration" ? "no-class"
      : d.type === "VariableDeclaration" && d.kind === "var" ? "no-var" : "module-level";
    mod(P, st, rule, `${d.type} at module level`);
  }
  const seen = new Set<string>();
  for (const c of cells) {
    if (seen.has(c.name) || shellNames.has(c.name)) mod(P, c.stmt, "duplicate-cell", `cell ${c.name} defined twice`);
    seen.add(c.name);
  }
  return { cells, errors: moduleErrs };
}

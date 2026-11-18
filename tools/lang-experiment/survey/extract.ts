// Split a lopecode module's source into source cells with acorn: every call in `define()` whose last
// argument is a top-level function binding or an inline function, with a string-array dep list.
// Plumbing variables (viewof value getters, mutable/generator getters, module refs) are dropped;
// import variables are returned with kind "import".
import * as acorn from "acorn";

export type RawCell = {
  name: string | null; // variable name, null for anonymous
  deps: string[];
  src: string; // the cell function's source
  params: string[]; // the function's own parameter names, positionally matching deps
  kind: "cell" | "import";
  importFrom?: string; // module id for an import
  importName?: string; // remote name for an import
  node?: any; // acorn node of the function
};
export type Extracted = { cells: RawCell[]; hasDefine: boolean; parseError?: string };

const isFn = (n: any) => n && (n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression" || n.type === "FunctionDeclaration");

export function extract(content: string): Extracted {
  let ast: any;
  try { ast = acorn.parse(content, { ecmaVersion: "latest", sourceType: "module", allowHashBang: true }); }
  catch (e) {
    try { ast = acorn.parse(content, { ecmaVersion: "latest", sourceType: "script" }); }
    catch (e2) { return { cells: [], hasDefine: /export default function define/.test(content), parseError: String(e2) }; }
  }
  const fns = new Map<string, any>();
  let define: any = null;
  for (const node of ast.body) {
    if (node.type === "VariableDeclaration")
      for (const d of node.declarations) { if (d.id?.type === "Identifier" && isFn(d.init)) fns.set(d.id.name, d.init); }
    else if (node.type === "FunctionDeclaration" && node.id) fns.set(node.id.name, node);
    else if (node.type === "ExportDefaultDeclaration" && isFn(node.declaration)) define = node.declaration;
  }
  if (!define) return { cells: [], hasDefine: false };
  const cells: RawCell[] = [];
  const strArr = (n: any) => n?.type === "ArrayExpression" && n.elements.every((e: any) => e?.type === "Literal" && typeof e.value === "string");
  const visit = (n: any) => {
    if (!n || typeof n.type !== "string") return;
    // hand-written: for (const n of ["a", "b"]) main.define(n, ["module @x/y", "@variable"], (_, v) => v.import(n, _))
    if (n.type === "ForOfStatement" && n.left.type === "VariableDeclaration" && strArr(n.right)) {
      const loopVar = n.left.declarations[0].id.name;
      const src = content.slice(n.body.start, n.body.end);
      const mod = /"module ([^"]+)"/.exec(src);
      if (mod && /\.import\(/.test(src) && new RegExp(`define\\(\\s*${loopVar}\\s*,`).test(src)) {
        for (const e of n.right.elements) cells.push({ name: e.value, deps: ["module " + mod[1], "@variable"], src, params: [], kind: "import", importFrom: mod[1], importName: e.value });
        return;
      }
    }
    if (n.type === "CallExpression" && n.arguments.length >= 2) {
      const args = n.arguments;
      const last = args[args.length - 1];
      const fn = last.type === "Identifier" ? fns.get(last.name) : isFn(last) ? last : null;
      const arrIdx = args.findIndex(strArr);
      // name: the string/null literal just before the dep array (or before the function when there is no array)
      const nameIdx = (arrIdx >= 0 ? arrIdx : args.length - 1) - 1;
      const nameNode = args[nameIdx];
      const isDefineLike = fn && nameNode && nameNode.type === "Literal" && (typeof nameNode.value === "string" || nameNode.value === null);
      if (isDefineLike) {
        const name = nameNode.value as string | null;
        const deps = arrIdx >= 0 ? args[arrIdx].elements.map((e: any) => e.value) : [];
        const src = content.slice(fn.start, fn.end);
        const params = fn.params.map((p: any) => (p.type === "Identifier" ? p.name : "?"));
        const imp = /\.import\(\s*"([^"]+)"/.exec(src);
        if (name?.startsWith("module ")) { /* module ref */ }
        else if (imp && deps.some((d: string) => d.startsWith("module "))) {
          cells.push({ name, deps, src, params, kind: "import", importFrom: deps.find((d: string) => d.startsWith("module "))!.slice(7), importName: imp[1] });
        } else if (isPlumbing(src, deps, name)) { /* derived variable */ }
        else cells.push({ name, deps, src, params, kind: "cell", node: fn });
        return; // do not descend into a registered function
      }
    }
    for (const k in n) {
      if (k === "loc" || k === "start" || k === "end") continue;
      const v = (n as any)[k];
      if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v.type === "string") visit(v);
    }
  };
  visit(define.body);
  return { cells, hasDefine: true };
}

// viewof/mutable plumbing the compiler writes inline: (G, _) => G.input(_), _ => _.generator, (M, _) => new M(_)
function isPlumbing(src: string, deps: string[], name: string | null): boolean {
  const s = src.replace(/\s+/g, "");
  if (/^\(G,_\)=>G\.input\(_\)$/.test(s)) return true;
  if (/^_=>_\.generator$/.test(s) || /^\(_\)=>_\.generator$/.test(s)) return true;
  if (/^\(M,_\)=>newM\(_\)$/.test(s)) return true;
  if (deps.length === 2 && deps[0] === "Generators" && /G\.input/.test(s)) return true;
  if (name && /^mutable /.test(name) && deps[0] === "Mutable") return true;
  return false;
}

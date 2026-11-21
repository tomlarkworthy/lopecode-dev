// Scripted source edits for the tests, each located on the parse of the file (lite/parse.ts), or, for a .ojs file,
// on the Observable compiler's reading of its blocks: no text search over source.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { splitSeed } from "../../spec-notebook.ts";
import { liteOf } from "./root.ts";

type Node = any;
const parserOf = async (root: string) => (await import(join(liteOf(root), "parse.ts"))).parse as (s: string, o?: { jsx?: boolean }) => { program: Node; comments: { start: number; end: number; value: string }[] };

function declOf(P: { program: Node }, cell: string): Node {
  for (const st of P.program.body) {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
    const name = d?.type === "FunctionDeclaration" ? d.id?.name : d?.type === "VariableDeclaration" ? d.declarations[0]?.id?.name : /^TS(TypeAlias|Interface)Declaration$/.test(d?.type ?? "") ? d.id.name : null;
    if (name === cell) return { st, d };
  }
  throw new Error(`no cell ${cell}`);
}
function walk(n: Node, f: (n: Node) => void) {
  if (!n || typeof n.type !== "string") return;
  f(n);
  for (const k of Object.keys(n)) {
    const v = n[k];
    if (Array.isArray(v)) v.forEach((x) => walk(x, f));
    else if (v && typeof v === "object" && typeof v.type === "string") walk(v, f);
  }
}
const splice = (file: string, src: string, start: number, end: number, text: string) => writeFileSync(file, src.slice(0, start) + text + src.slice(end));

export async function edits(root: string) {
  const parse = await parserOf(root);
  const read = (f: string) => { const src = readFileSync(f, "utf8"); return { src, P: parse(src, { jsx: f.endsWith("x") }) }; };
  return {
    // the n-th string literal with this value inside the cell, replaced
    literal(file: string, cell: string, from: string, to: string) {
      const { src, P } = read(file);
      const hits: Node[] = [];
      walk(declOf(P, cell).st, (n) => { if (n.type === "Literal" && n.value === from) hits.push(n); });
      if (!hits.length) throw new Error(`${cell} has no literal ${JSON.stringify(from)}`);
      splice(file, src, hits[0].start, hits[0].end, JSON.stringify(to));
    },
    // a block comment at the start of the cell's innermost function body (the cell's value function)
    comment(file: string, cell: string, note: string) {
      const { src, P } = read(file);
      const { d } = declOf(P, cell);
      let fn = d.type === "FunctionDeclaration" ? d : d.declarations[0].init;
      while (fn.body?.type && /Function/.test(fn.body.type)) fn = fn.body;
      const at = fn.body.type === "BlockStatement" ? fn.body.start + 1 : fn.body.start;
      splice(file, src, at, at, `/*${note}*/`);
    },
    uncomment(file: string, note: string) {
      const { src, P } = read(file);
      const c = P.comments.find((x) => x.value === note);
      if (!c) throw new Error(`no comment ${note}`);
      splice(file, src, c.start, c.end, "");
    },
    rename(file: string, cell: string, to: string) {
      const { src, P } = read(file);
      const { d } = declOf(P, cell);
      const id = d.type === "FunctionDeclaration" ? d.id : d.declarations[0].id;
      splice(file, src, id.start, id.end, to);
    },
    // every reference to a cell as a parameter of another cell of the file, renamed
    renameParam(file: string, cell: string, from: string, to: string) {
      const { src, P } = read(file);
      const { d } = declOf(P, cell);
      const params = (d.type === "FunctionDeclaration" ? d : d.declarations[0].init).params;
      const p = params.find((x: Node) => x.type === "Identifier" && x.name === from);
      if (!p) throw new Error(`${cell} takes no ${from}`);
      splice(file, src, p.start, p.start + from.length, to);
    },
    remove(file: string, cell: string) {
      const { src, P } = read(file);
      const { st } = declOf(P, cell);
      splice(file, src, st.start, st.end, "");
    },
    // a member added to a type alias's union
    typeUnion(file: string, type: string, member: string) {
      const { src, P } = read(file);
      const { d } = declOf(P, type);
      splice(file, src, d.typeAnnotation.end, d.typeAnnotation.end, ` | ${member}`);
    },
    // a new statement after the last one
    append(file: string, text: string) {
      const { src, P } = read(file);
      const last = P.program.body[P.program.body.length - 1];
      splice(file, src, last.end, last.end, "\n" + text);
    },
    // the body of a .ojs block chosen by the variable name the compiler gives it, with text added at its end
    ojsAppend(file: string, compile: (s: string) => { _name: string | null }[], name: string, text: string) {
      const src = readFileSync(file, "utf8");
      const blocks = splitSeed(src);
      const i = blocks.findIndex((b) => { try { return compile(b).some((v) => v._name === name); } catch { return false; } });
      if (i < 0) throw new Error(`no block defines ${name}`);
      blocks[i] = blocks[i] + text;
      // the file rewritten from its blocks: splitSeed drops the separator lines' text, so they are written as `// %%`
      writeFileSync(file, blocks.join("\n// %%\n") + "\n");
    },
  };
}

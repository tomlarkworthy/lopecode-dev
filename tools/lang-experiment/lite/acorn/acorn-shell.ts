// The one unchecked cell of the acorn cells: acornParse(text, jsx), with ../parse.ts's parsers (acorn +
// @sveltejs/acorn-typescript), its tree rebuilt as fresh plain objects by ACORN_ROWS (gen.ts). Each node gets nid, its
// number in a pre-order walk in acorn's key order, and line (loc.start.line); loc and extra are dropped; a field the
// row declares and the node lacks is null ([] for a list); a regex or bigint Literal's value is null. A node whose type
// has no row, that has a key its row lacks, that lacks a field its row requires, or that holds a node where its row
// has a value, is an Other node. A SyntaxError is returned as a value; anything else acorn throws is thrown. Trusted
// for: the tree being acorn's (positions, nids, which node is which); the boundary checks only its shape.
import { TS, TSX } from "../parse.ts";
import { ACORN_ROWS } from "./acorn-rows.ts";

export const acornParse = (() => {
  const parsers = [TS, TSX];
  const rows = new Map(Object.entries(ACORN_ROWS).map(([t, fs]) => [t, new Map(fs.map((f) => [f[0], f]))]));
  const drop = new Set(["type", "start", "end", "loc", "extra"]);
  const isNode = (v: any) => !!v && typeof v === "object" && typeof v.type === "string";
  const fits = (n: any, [k, how, nullable]: [string, number, number]) => {
    const v = n[k];
    if (v === undefined || v === null) return !!nullable;
    return how === 1 ? isNode(v) : how === 2 ? Array.isArray(v) : !isNode(v) && !(Array.isArray(v) && v.some(isNode));
  };
  const valueOf = (v: any) => (v === undefined || v instanceof RegExp || typeof v === "bigint" ? null : v && typeof v === "object" ? { ...v } : v);
  return (text: string, jsx: boolean): unknown => {
    const comments: { block: boolean; text: string; start: number; end: number }[] = [];
    let program: any;
    try {
      program = parsers[jsx ? 1 : 0].parse(text, { ecmaVersion: "latest", sourceType: "module", locations: true, onComment: (block: boolean, t: string, start: number, end: number) => comments.push({ block, text: t, start, end }) } as any);
    } catch (e: any) {
      if (!(e instanceof SyntaxError)) throw e;
      return { ok: false, message: e.message, pos: (e as any).pos ?? -1, line: (e as any).loc?.line ?? 0, column: (e as any).loc?.column ?? 0 };
    }
    let nid = 0;
    const visit = (n: any): any => {
      const row = rows.get(n.type);
      const keys = Object.keys(n).filter((k) => !drop.has(k));
      const known = !!row && keys.every((k) => row.has(k)) && ACORN_ROWS[n.type]!.every((f) => fits(n, f));
      const out: any = known ? { type: n.type } : { type: "Other", kind: n.type };
      out.nid = nid++; out.start = n.start; out.end = n.end; out.line = n.loc.start.line;
      if (!known) { out.fields = []; out.props = []; }
      for (const k of keys) {
        const v = n[k], how = known ? row!.get(k)![1] : isNode(v) ? 1 : Array.isArray(v) && v.every((x) => x === null || isNode(x)) ? 2 : 0;
        const got = how === 1 ? (isNode(v) ? visit(v) : null) : how === 2 ? (v ?? []).map((x: any) => (isNode(x) ? visit(x) : null)) : valueOf(v);
        if (known) out[k] = got;
        else if (how === 0) out.props.push({ key: k, value: got });
        else out.fields.push({ key: k, list: how === 2, nodes: how === 2 ? got : [got] });
      }
      if (known) for (const [k, f] of row!) if (!(k in out)) out[k] = f[1] === 2 ? [] : null;
      return out;
    };
    return { ok: true, ast: { program: visit(program), comments, src: text, count: nid } };
  };
})();

// incr2 (D3): acornParse of parts joined by a blank line, each part parsed alone and kept by its text for the next two
// calls, its tree moved to where the part sits (start, end and line moved, nid moved past the parts before). The whole
// text is parsed instead when a part does not parse alone, a top-level name is bound in two parts, or a part after the
// first starts with a statement that does not start with a keyword (it might go on from the part before). Trusted
// for: the tree being acornParse's of the joined text; lite/infer/attack/incr.test.ts compares the two on its modules.
export const acornParseParts = (() => {
  let kept: Map<string, any>[] = [new Map(), new Map()];
  const LED = new Set(["VariableDeclaration", "FunctionDeclaration", "ClassDeclaration", "TSTypeAliasDeclaration", "TSInterfaceDeclaration", "TSEnumDeclaration", "TSModuleDeclaration", "TSDeclareFunction", "ImportDeclaration", "ExportNamedDeclaration", "ExportDefaultDeclaration", "ExportAllDeclaration"]);
  const ids = (n: any, out: string[]): string[] => {
    if (Array.isArray(n)) { for (const x of n) ids(x, out); return out; }
    if (n === null || typeof n !== "object" || typeof n.type !== "string") return out;
    if (n.type === "Identifier") out.push(n.name);
    for (const k of ["id", "properties", "elements", "value", "left", "argument", "local", "specifiers", "declarations", "declaration"]) if (k in n) ids(n[k], out);
    return out;
  };
  const breaks = (s: string) => { let k = 0; for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) k++; return k; };
  return (parts: string[], jsx: boolean): unknown => {
    const text = parts.join("\n\n");
    const now = new Map<string, any>(), trees: any[] = [], bound = new Set<string>();
    for (const [i, t] of parts.entries()) {
      const key = `${jsx ? 1 : 0}${t}`;
      const p = now.get(key) ?? kept[0]!.get(key) ?? kept[1]!.get(key) ?? acornParse(t, jsx);
      now.set(key, p);
      if (!p.ok) return acornParse(text, jsx);
      trees.push(p.ast);
      for (const [j, st] of p.ast.program.body.entries()) {
        if (i > 0 && j === 0 && !LED.has(st.type)) return acornParse(text, jsx);
        for (const n of st.type === "ImportDeclaration" || LED.has(st.type) ? ids(st.type === "ExportNamedDeclaration" ? st.declaration ?? st.specifiers : st.type === "VariableDeclaration" ? st.declarations.map((d: any) => d.id) : st.type === "ImportDeclaration" ? st.specifiers : st.id ?? null, []) : []) {
          if (bound.has(n)) return acornParse(text, jsx);
          bound.add(n);
        }
      }
    }
    kept = [now, kept[0]!];
    const body: any[] = [], comments: any[] = [];
    let off = 0, lines = 0, nids = 1;
    trees.forEach((a, i) => {
      const dp = off, dl = lines, dn = nids - 1;
      const move = (x: any): any => {
        if (Array.isArray(x)) return x.map(move);
        if (x === null || typeof x !== "object" || typeof x.type !== "string") return x;
        const out: any = { ...x, nid: x.nid + dn, start: x.start + dp, end: x.end + dp, line: x.line + dl };
        for (const k of Object.keys(x)) {
          const v = x[k];
          if (k === "fields") out.fields = v.map((f: any) => ({ ...f, nodes: f.nodes.map(move) }));
          else if (v !== null && typeof v === "object" && k !== "props") out[k] = move(v);
        }
        return out;
      };
      for (const st of a.program.body) body.push(move(st));
      for (const c of a.comments) comments.push({ ...c, start: c.start + dp, end: c.end + dp });
      nids += a.count - 1;
      off += parts[i]!.length + 2;
      lines += breaks(parts[i]!) + 2;
    });
    return { ok: true, ast: { program: { type: "Program", nid: 0, start: 0, end: text.length, line: 1, body, sourceType: "module" }, comments, src: text, count: nids } };
  };
})();

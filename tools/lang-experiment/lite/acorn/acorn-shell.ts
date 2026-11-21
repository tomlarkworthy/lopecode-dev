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

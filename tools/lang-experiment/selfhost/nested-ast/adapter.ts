// The outside side (unchecked TypeScript): parse with orig/lite/parse.ts (acorn + acorn-typescript) and hand the result
// to checked code as a NESTED tree of fresh plain objects, normalised as ../flat-ast/adapter.ts flatten normalises rows:
// loc -> line, extra dropped, an absent or undefined field -> null (a list -> []), a regex or bigint Literal's value ->
// null (regex and bigint kept), a node type outside the spec -> an Other node. Every node is stamped with nid, its
// number in a pre-order walk in acorn's key order, so nid equals the flat prototype's row index. A parse error is
// returned as a value. Two paths to one acorn object (ImportSpecifier.imported/.local) become two objects.
import { parse } from "./orig/lite/parse.ts";
import SPEC_A from "../flat-ast/out/spec-a.json";

type Spec = Record<string, { key: string; how: "node" | "list" | "value"; ts: string }[]>;
export type NParse = { ok: true; ast: { program: any; comments: any[]; src: string; lineStarts: number[]; count: number } } | { ok: false; message: string; pos: number; line: number; column: number };

const isNode = (v: any) => !!v && typeof v === "object" && typeof v.type === "string";
const valueOf = (v: any) => (v === undefined || v instanceof RegExp || typeof v === "bigint" ? null : v);
const hows = new Map<string, Map<string, { how: string; holes: boolean }>>(Object.entries(SPEC_A as Spec).map(([t, fs]) => [t, new Map(fs.map((f) => [f.key, { how: f.how, holes: f.ts.includes("null") }]))]));

export function nest(program: any, spec: Spec = SPEC_A as Spec): { program: any; count: number } {
  let nid = 0;
  const visit = (n: any): any => {
    const fs = spec[n.type];
    const out: any = fs ? { type: n.type } : { type: "Other", kind: n.type };
    out.nid = nid++; out.start = n.start; out.end = n.end; out.line = n.loc.start.line;
    if (fs) {
      const how = hows.get(n.type)!;
      for (const k in n) {
        if (k === "type" || k === "start" || k === "end" || k === "loc" || k === "extra") continue;
        const h = how.get(k), v = n[k];
        if (!h) throw new Error(`nest: ${n.type}.${k} not in the spec`);
        if (h.how === "node") out[k] = isNode(v) ? visit(v) : null;
        else if (h.how === "list") {
          if (!h.holes && (v ?? []).some((x: any) => x === null)) throw new Error(`nest: ${n.type}.${k} has a hole the spec does not allow`);
          out[k] = (v ?? []).map((x: any) => (isNode(x) ? visit(x) : null));
        } else if (v && typeof v === "object" && !(v instanceof RegExp)) out[k] = { ...v };
        else out[k] = valueOf(v);
      }
      for (const f of fs) if (!(f.key in out)) out[f.key] = f.how === "list" ? [] : null;
    } else {
      out.fields = []; out.props = [];
      for (const k in n) {
        if (k === "type" || k === "start" || k === "end" || k === "loc" || k === "extra") continue;
        const v = n[k];
        if (isNode(v)) out.fields.push({ key: k, list: false, nodes: [visit(v)] });
        else if (Array.isArray(v) && v.every((x) => x === null || isNode(x))) out.fields.push({ key: k, list: true, nodes: v.map((x) => (x ? visit(x) : null)) });
        else if (v === null || v === undefined || ["string", "number", "boolean"].includes(typeof v)) out.props.push({ key: k, value: v ?? null });
        else throw new Error(`nest: Other ${n.type}.${k} holds ${typeof v}`);
      }
    }
    return out;
  };
  const p = visit(program);
  return { program: p, count: nid };
}

export function lineStartsOf(src: string): number[] {
  const out = [0];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) out.push(i + 1);
  return out;
}
// the acorn objects in the same pre-order: acornByNid[i] is the acorn node the adapter numbered i
export function acornOrder(program: any, spec: Spec = SPEC_A as Spec): any[] {
  const out: any[] = [];
  const visit = (n: any) => {
    out.push(n);
    for (const k in n) {
      if (k === "type" || k === "start" || k === "end" || k === "loc" || k === "extra") continue;
      const v = n[k];
      if (isNode(v)) visit(v);
      else if (Array.isArray(v) && v.every((x) => x === null || isNode(x))) for (const x of v) if (x) visit(x);
    }
  };
  visit(program);
  return out;
}
// the adapter: one text, one value
export function nestParse(src: string, jsx: boolean): NParse {
  let P;
  try { P = parse(src, { jsx }); } catch (e: any) {
    if (!(e instanceof SyntaxError)) throw e;
    const x = e as SyntaxError & { pos?: number; loc?: { line: number; column: number } };
    return { ok: false, message: x.message, pos: x.pos ?? -1, line: x.loc?.line ?? 0, column: x.loc?.column ?? 0 };
  }
  const { program, count } = nest(P.program);
  return { ok: true, ast: { program, comments: P.comments.map((c) => ({ ...c, line: P.line(c.start) })), src, lineStarts: lineStartsOf(src), count } };
}

// core.ts distinctNames in the shell, as ../flat-ast/adapter.ts flatDistinct
const STAND = Array.from({ length: 40 }, (_, i) => String.fromCharCode(0xa4d0 + i));
export type Distinct = { parse: NParse; text: string; dups: Map<string, { name: string; pos: number }>; parses: number };
export function nestDistinct(src: string, jsx: boolean): Distinct {
  const dups = new Map<string, { name: string; pos: number }>();
  let text = src;
  for (let parses = 1; ; parses++) {
    const p = nestParse(text, jsx);
    if (p.ok || !/has already been declared/.test(p.message)) return { parse: p, text, dups, parses };
    const name = /^[\w$]+/.exec(text.slice(p.pos))?.[0];
    if (!name) return { parse: p, text, dups, parses };
    let k = dups.size, ph = "";
    for (let i = 0; i < name.length; i++) { ph = STAND[k % 40] + ph; k = Math.floor(k / 40); }
    if (k > 0 || dups.has(ph)) return { parse: p, text, dups, parses };
    dups.set(ph, { name: src.slice(p.pos, p.pos + name.length), pos: p.pos });
    text = text.slice(0, p.pos) + ph + text.slice(p.pos + name.length);
  }
}

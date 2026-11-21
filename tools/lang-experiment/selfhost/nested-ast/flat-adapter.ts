// COPY of ../flat-ast/adapter.ts with its imports pointed at orig/ and ../flat-ast/out (for the flat baseline timings).
// The outside side (unchecked TypeScript): parse with lite/parse.ts (acorn + acorn-typescript) and hand the result to
// checked code as data. flatten numbers the nodes in pre-order (a node before its children, children in key order, as
// `for (const k in n)` visits them), so index order is the original walk order. A parse error is returned as a value.
import { parse } from "./orig/lite/parse.ts";
import SPEC_A from "../flat-ast/out/spec-a.json";
import SPEC_ALL from "../flat-ast/out/spec-a-all.json";

type Spec = Record<string, { key: string; how: "node" | "list" | "value"; ts: string }[]>;
export type Flat = { nodes: any[]; comments: { block: boolean; text: string; start: number; end: number; line: number }[]; src: string; lineStarts: number[] };
export type FlatParse = { ok: true; ast: Flat } | { ok: false; message: string; pos: number; line: number; column: number };

const isNode = (v: any) => !!v && typeof v === "object" && typeof v.type === "string";
const valueOf = (v: any) => (v === undefined || v instanceof RegExp || typeof v === "bigint" ? null : v);

const howCache = new Map<Spec, Map<string, Map<string, string>>>();
const hows = (spec: Spec, t: string) => {
  let m = howCache.get(spec);
  if (!m) { m = new Map(Object.entries(spec).map(([k, fs]) => [k, new Map(fs.map((f) => [f.key, f.how]))])); howCache.set(spec, m); }
  return m.get(t)!;
};
const holes = (spec: Spec, t: string, k: string) => spec[t]!.some((f) => f.key === k && f.ts.includes("null"));
export function flatten(program: any, spec: Spec = SPEC_A as Spec): any[] {
  const nodes: any[] = [];
  const visit = (n: any, parent: number, field: string): number => {
    const i = nodes.length;
    const fs = spec[n.type];
    const row: any = fs ? { type: n.type } : { type: "Other", kind: n.type };
    row.start = n.start; row.end = n.end; row.line = n.loc.start.line; row.parent = parent; row.field = field;
    nodes.push(row);
    if (fs) {
      // the node's own key order, so the rows are in the order `for (const k in n)` walks
      const how = hows(spec, n.type);
      for (const k in n) {
        if (k === "type" || k === "start" || k === "end" || k === "loc" || k === "extra") continue;
        const h = how.get(k), v = n[k];
        // a field the census never saw would be lost: fail loudly
        if (!h) throw new Error(`flatten: ${n.type}.${k} not in the spec`);
        if (h === "node") row[k] = isNode(v) ? visit(v, i, k) : null;
        else if (h === "list") {
          // a hole in a list the census never saw with one would not fit the generated type
          if (!holes(spec, n.type, k) && (v ?? []).some((x: any) => x === null)) throw new Error(`flatten: ${n.type}.${k} has a hole the spec does not allow`);
          row[k] = (v ?? []).map((x: any) => (isNode(x) ? visit(x, i, k) : null));
        }
        else if (v && typeof v === "object" && !(v instanceof RegExp)) row[k] = { ...v };
        else row[k] = valueOf(v);
      }
      for (const f of fs) if (!(f.key in row)) row[f.key] = f.how === "list" ? [] : null;
    } else {
      row.fields = []; row.props = [];
      for (const k in n) {
        if (k === "type" || k === "start" || k === "end" || k === "loc" || k === "extra") continue;
        const v = n[k];
        if (isNode(v)) row.fields.push({ key: k, list: false, nodes: [visit(v, i, k)] });
        else if (Array.isArray(v) && v.every((x) => x === null || isNode(x))) row.fields.push({ key: k, list: true, nodes: v.map((x) => (x ? visit(x, i, k) : null)) });
        else if (v === null || v === undefined || ["string", "number", "boolean"].includes(typeof v)) row.props.push({ key: k, value: v ?? null });
        else throw new Error(`flatten: Other ${n.type}.${k} holds ${typeof v}`);
      }
    }
    row.after = nodes.length;
    return i;
  };
  visit(program, -1, "");
  return nodes;
}

// layout B: one generic row for every node type: children in kids (with the field of each in keys, a list field
// giving one entry per element, a hole as null), every other field in props. A record-valued field (Literal.regex,
// TemplateElement.value) is spread into props as key.subkey.
export type RowB = { type: string; start: number; end: number; line: number; parent: number; field: string; after: number; kids: (number | null)[]; keys: string[]; props: { key: string; value: string | number | boolean | null }[] };
export function flattenB(program: any): RowB[] {
  const nodes: RowB[] = [];
  const visit = (n: any, parent: number, field: string): number => {
    const i = nodes.length;
    const row: RowB = { type: n.type, start: n.start, end: n.end, line: n.loc.start.line, parent, field, after: 0, kids: [], keys: [], props: [] };
    nodes.push(row);
    for (const k in n) {
      if (k === "type" || k === "start" || k === "end" || k === "loc" || k === "extra") continue;
      const v = n[k];
      if (isNode(v)) { row.keys.push(k); row.kids.push(visit(v, i, k)); }
      else if (Array.isArray(v) && v.every((x) => x === null || isNode(x))) for (const x of v) { row.keys.push(k); row.kids.push(x ? visit(x, i, k) : null); }
      else if (v && typeof v === "object" && !(v instanceof RegExp)) for (const [sk, sv] of Object.entries(v)) row.props.push({ key: `${k}.${sk}`, value: (sv ?? null) as any });
      else row.props.push({ key: k, value: valueOf(v) });
    }
    row.after = nodes.length;
    return i;
  };
  visit(program, -1, "");
  return nodes;
}

export function lineStartsOf(src: string): number[] {
  const out = [0];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) out.push(i + 1);
  return out;
}

// the adapter: one text, one value
export function flatParse(src: string, jsx: boolean, spec: Spec | "B" = SPEC_A as Spec): FlatParse {
  let P;
  try { P = parse(src, { jsx }); } catch (e: any) {
    if (!(e instanceof SyntaxError)) throw e;
    const x = e as SyntaxError & { pos?: number; loc?: { line: number; column: number } };
    return { ok: false, message: x.message, pos: x.pos ?? -1, line: x.loc?.line ?? 0, column: x.loc?.column ?? 0 };
  }
  return { ok: true, ast: { nodes: spec === "B" ? flattenB(P.program) : flatten(P.program, spec), comments: P.comments.map((c) => ({ ...c, line: P.line(c.start) })), src, lineStarts: lineStartsOf(src) } };
}
export const SPECS = { a: SPEC_A as Spec, all: SPEC_ALL as Spec };

// core.ts distinctNames moved to the shell: a name declared again at the top level is replaced, in a copy, by a
// stand-in of the same length, and the copy parsed again, until it parses or fails for another reason. Checked code
// gets the last parse and dups (stand-in -> the name and where it was declared again). parses: how many parses ran.
const STAND = Array.from({ length: 40 }, (_, i) => String.fromCharCode(0xa4d0 + i));
export type Distinct = { parse: FlatParse; text: string; dups: Map<string, { name: string; pos: number }>; parses: number };
export function flatDistinct(src: string, jsx: boolean, spec: Spec | "B" = SPEC_A as Spec): Distinct {
  const dups = new Map<string, { name: string; pos: number }>();
  let text = src;
  for (let parses = 1; ; parses++) {
    const p = flatParse(text, jsx, spec);
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

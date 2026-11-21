// Parser adapter: the only file that knows which parser is used. acorn + @sveltejs/acorn-typescript.
// Returns an ESTree/TS-ESTree program, the comments, and a helper for the comments before a node.
import * as acorn from "acorn";
import { tsPlugin } from "@sveltejs/acorn-typescript";

export type Node = { type: string; start: number; end: number; loc: { start: { line: number; column: number } }; [k: string]: any };
export type Comment = { block: boolean; text: string; start: number; end: number };
export type Parsed = { program: Node; comments: Comment[]; src: string; leading(n: Node): Comment[]; line(pos: number): number };

const TS = acorn.Parser.extend(tsPlugin() as any);
const TSX = acorn.Parser.extend(tsPlugin({ jsx: true }) as any);

const SKIP = new Set(["loc", "typeAnnotation", "returnType", "typeParameters", "typeArguments", "start", "end", "type"]);
// Child nodes in source order, types excluded.
export function kids(n: Node): Node[] {
  const out: Node[] = [];
  for (const k in n) {
    if (SKIP.has(k)) continue;
    const v = n[k];
    if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === "string") out.push(x); }
    else if (v && typeof v === "object" && typeof v.type === "string") out.push(v);
  }
  return out.sort((a, b) => a.start - b.start);
}
export const isFn = (n: Node | null | undefined): boolean => !!n && /^(ArrowFunctionExpression|FunctionExpression|FunctionDeclaration)$/.test(n.type);

// jsx: parse a .tsx file. Off for .ts, where `<T>(x)` would otherwise read as an element.
export function parse(src: string, opts: { jsx?: boolean } = {}): Parsed {
  // COUNT (ss-acorn): every text parsed, for complete-cost.ts
  ((globalThis as any).__parsed ??= []).push([src, !!opts.jsx]);
  const comments: Comment[] = [];
  const program = (opts.jsx ? TSX : TS).parse(src, {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
    onComment: (block: boolean, text: string, start: number, end: number) => comments.push({ block, text, start, end }),
  } as any) as unknown as Node;
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") lineStarts.push(i + 1);
  const line = (pos: number) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (lineStarts[m] <= pos) lo = m; else hi = m - 1; }
    return lo + 1;
  };
  // Comments separated from n (and from each other) only by whitespace.
  const leading = (n: Node) => {
    const out: Comment[] = [];
    let at = n.start;
    for (let i = comments.length - 1; i >= 0; i--) {
      const c = comments[i];
      if (c.end > at) continue;
      if (src.slice(c.end, at).trim() !== "") break;
      out.unshift(c);
      at = c.start;
    }
    return out;
  };
  return { program, comments, src, leading, line };
}

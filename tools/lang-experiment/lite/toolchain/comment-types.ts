// Experiment: compile = erase types into /*ss:...*/ comments (still runnable JS), decompile = unwrap them.
import { parse, type Node } from "../parse.ts";
import * as acorn from "acorn";

const acornTok = (js: string, onComment: (block: boolean, text: string) => void) => {
  for (const _ of acorn.tokenizer(js, { ecmaVersion: "latest", sourceType: "module", onComment }));
};

const OPEN = "/*ss:", CLOSE = "*/";
const TYPE_KEYS = new Set(["typeAnnotation", "returnType", "typeParameters", "typeArguments"]);

function cutsOf(src: string): [number, number][] {
  const P = parse(src);
  const cuts: [number, number][] = [];
  const walk = (n: Node) => {
    if (n.type === "TSTypeAliasDeclaration" || n.type === "TSInterfaceDeclaration" || n.type === "TSDeclareFunction" ||
      (n.type === "ImportDeclaration" && n.importKind === "type") ||
      (n.type === "ExportNamedDeclaration" && n.declaration && /^TS/.test(n.declaration.type))) {
      cuts.push([n.start, n.end]);
      return;
    }
    if (n.type === "ExportNamedDeclaration" && n.declaration) cuts.push([n.start, n.declaration.start]);
    if (n.type === "TSAsExpression" || n.type === "TSSatisfiesExpression") {
      cuts.push([n.expression.end, n.end]);
      walk(n.expression);
      return;
    }
    if (n.type === "Identifier" && n.optional) {
      const q = src.indexOf("?", n.start + n.name.length);
      if (q >= 0) cuts.push([q, q + 1]);
    }
    for (const k in n) {
      if (k === "loc" || k === "start" || k === "end" || k === "type") continue;
      const v = n[k];
      const each = (x: any) => {
        if (!x || typeof x.type !== "string") return;
        if (TYPE_KEYS.has(k)) cuts.push([x.start, x.end]);
        else walk(x);
      };
      if (Array.isArray(v)) v.forEach(each);
      else each(v);
    }
  };
  walk(P.program);
  cuts.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const c of cuts) {
    const last = merged[merged.length - 1];
    if (last && c[0] <= last[1]) last[1] = Math.max(last[1], c[1]);
    else merged.push([...c]);
  }
  return merged;
}

// "*/" inside a type (a string literal type) would close the comment; "*\/" cannot occur in TS source outside strings/comments.
const esc = (s: string) => s.replaceAll("*/", "*\\/");
const unesc = (s: string) => s.replaceAll("*\\/", "*/");

export const LANG = '/*{lang:"ss"}*/';

// The language of a compiled text is named by its first comment, if that comment is a {lang:...} marker.
export function langOf(js: string): string | null {
  let first: string | null = null;
  try {
    acornTok(js, (_block: boolean, text: string) => { if (first === null) first = text; });
  } catch { return null; }
  const m = first === null ? null : /^\{lang:"([a-z]+)"\}$/.exec(first);
  return m ? m[1] : null;
}

// Types to /*ss:...*/ comments; the result is plain JS.
export function commentTypes(src: string): string {
  if (src.includes(OPEN) || src.includes(LANG)) throw new Error(`source contains a reserved marker`);
  let out = "", at = 0;
  for (const [s, e] of cutsOf(src)) {
    out += src.slice(at, s) + OPEN + esc(src.slice(s, e)) + CLOSE;
    at = e;
  }
  return out + src.slice(at);
}

export function uncommentTypes(js: string): string {
  let out = "", at = 0;
  for (;;) {
    const s = js.indexOf(OPEN, at);
    if (s < 0) return out + js.slice(at);
    const e = js.indexOf(CLOSE, s + OPEN.length);
    if (e < 0) throw new Error("unterminated type comment");
    out += js.slice(at, s) + unesc(js.slice(s + OPEN.length, e));
    at = e + CLOSE.length;
  }
}

export const compile = (src: string): string => LANG + commentTypes(src);

export function decompile(js: string): string {
  if (langOf(js) !== "ss") throw new Error(`not SoundScript: the first comment must be ${LANG}`);
  const head = js.indexOf(LANG);
  return uncommentTypes(js.slice(0, head) + js.slice(head + LANG.length));
}

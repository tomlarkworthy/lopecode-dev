// FROZEN FIXTURE (2026-11-22, switch4): lite/toolchain/comment-types.ts as it was before the rg, cp and tc cells were switched on.
// Only the differentials and tests compare against it; nothing shipped imports it, and the build does not reach it.
// Experiment: compile = erase types into /*ss:...*/ comments (still runnable JS), decompile = unwrap them.
import { parse, type Node } from "../parse.ts";
import * as acorn from "acorn";

const OPEN = "/*ss:", CLOSE = "*/";
const COMMENT_TYPE_KEYS = new Set(["typeAnnotation", "returnType", "typeParameters", "typeArguments"]);

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
      // the cut starts after the parentheses that close a parenthesised operand, `(x) as T`, and after
      // the /*ss>*/ that closes a lowered JSX operand
      const at = n.expression.end;
      let from = at;
      const gap = src.slice(at, n.typeAnnotation.start);
      for (const t of tokens(gap, (_b, text, _s, end) => { if (text === "ss>") from = Math.max(from, at + end); })) if (t.type.label === ")") from = Math.max(from, at + t.end);
      cuts.push([from, n.end]);
      walk(n.expression);
      return;
    }
    if (n.type === "TSNonNullExpression") {
      cuts.push([n.end - 1, n.end]);
      walk(n.expression);
      return;
    }
    if (n.type === "TSTypeAssertion") {
      const gt = tokens(src.slice(n.typeAnnotation.end, n.expression.start)).find((t) => t.type.label === "</>/<=/>=");
      if (!gt) throw new Error("unsupported: a <T>x assertion whose closing > was not found");
      cuts.push([n.start, n.typeAnnotation.end + gt.end]);
      walk(n.expression);
      return;
    }
    if (n.type === "Identifier" && n.optional) {
      // the ? is the first token after the name (a comment between them is not one)
      const from = n.start + n.name.length;
      const t = acorn.tokenizer(src.slice(from), { ecmaVersion: "latest" }).getToken();
      if (t.type.label === "?") cuts.push([from + t.start, from + t.end]);
    }
    for (const k in n) {
      if (k === "loc" || k === "start" || k === "end" || k === "type") continue;
      const v = n[k];
      const each = (x: any) => {
        if (!x || typeof x.type !== "string") return;
        if (COMMENT_TYPE_KEYS.has(k)) cuts.push([x.start, x.end]);
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

// Text kept inside a comment must not hold "*/". esc adds one backslash to every "*", backslashes, "/"
// run ("*/" -> "*\/", "*\/" -> "*\\/"), so it never writes "*/" and unesc inverts it exactly.
export const esc = (s: string) => s.replace(/\*(\\*)\//g, "*\\$1/");
export const unesc = (s: string) => s.replace(/\*\\(\\*)\//g, "*$1/");
const tokens = (js: string, onComment?: (block: boolean, text: string, start: number, end: number) => void) => [...acorn.tokenizer(js, { ecmaVersion: "latest", onComment })];

export const LANG = '/*{lang:"ss"}*/';

// The language of a compiled text is named by its first comment, if that comment is a {lang:...} marker.
// Read with acorn's tokenizer up to that comment only; remembered per text, since it runs over every variable.
const langs = new Map<string, string | null>();
export function langOf(js: string): string | null {
  const hit = langs.get(js);
  if (hit !== undefined) return hit;
  let first: string | null = null;
  try {
    const it = acorn.tokenizer(js, { ecmaVersion: "latest", sourceType: "module", onComment: (block: boolean, text: string) => { if (first === null) first = text; } });
    for (let t = it.getToken(); first === null && t.type !== acorn.tokTypes.eof; t = it.getToken());
  } catch {}
  const m = first === null ? null : /^\{lang:"([a-z]+)"\}$/.exec(first);
  const lang = m ? m[1] : null;
  if (langs.size > 4096) langs.delete(langs.keys().next().value!);
  langs.set(js, lang);
  return lang;
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
  // the type comments, found by acorn's tokenizer (a comment's text, never a string's), each put back as its text
  const kept: [number, number, string][] = [];
  for (const _ of acorn.tokenizer(js, { ecmaVersion: "latest", sourceType: "module", onComment: (block: boolean, text: string, start: number, end: number) => { if (block && text.startsWith("ss:")) kept.push([start, end, unesc(text.slice(3))]); } }));
  let out = "", at = 0;
  for (const [start, end, text] of kept) { out += js.slice(at, start) + text; at = end; }
  return out + js.slice(at);
}

export const compile = (src: string): string => LANG + commentTypes(src);

export function decompile(js: string): string {
  if (langOf(js) !== "ss") throw new Error(`not SoundScript: the first comment must be ${LANG}`);
  const head = js.indexOf(LANG);
  return uncommentTypes(js.slice(0, head) + js.slice(head + LANG.length));
}

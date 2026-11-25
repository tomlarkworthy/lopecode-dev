// The unchecked half of the tc cells, and the four functions of ss-toolchain.ts no cell gives (declaredNameAt,
// declaredName, tokensOf, paramsOf): acorn's tokenizer, plain JavaScript's parse error, the JSX lowering, the cell
// facts, acorn's identifier tables, and the intrinsics tables. The typed tree has no tokens and no tree for a text
// that does not parse, and Observable's compiler output is JavaScript, which the TypeScript parser reads differently.
import * as acorn from "acorn";
import { lowerJsx } from "../jsx/lower.ts";
import { cellsOf } from "../facts.ts";
import { CAPABILITIES, PRELUDE_FNS, OJS_INPUT_GLOBALS } from "../intrinsics.ts";

// The name a cell's text declares and where it is, read with acorn's tokenizer, so a text that does not parse
// has one too: [export] const|let <name>, or [export] [async] function [*] <name>. (ss-toolchain.ts's until 2026-11-22)
export function declaredNameAt(text: string): { name: string; start: number; end: number } | null {
  try {
    const it = acorn.tokenizer(text, { ecmaVersion: "latest" });
    let t = it.getToken();
    if (t.type.keyword === "export") t = it.getToken();
    if (t.type.keyword === "const" || (t.type.label === "name" && t.value === "let")) t = it.getToken();
    else {
      if (t.type.label === "name" && t.value === "async") t = it.getToken();
      if (t.type.keyword !== "function") return null;
      t = it.getToken();
      if (t.type.label === "*") t = it.getToken();
    }
    return t.type.label === "name" ? { name: t.value, start: t.start, end: t.end } : null;
  } catch { return null; }
}
export const declaredName = (text: string): string | null => declaredNameAt(text)?.name ?? null;
// The tokens of a text, from acorn's tokenizer, as far as it reads (a text that does not parse has a prefix
// that does). TypeScript's own syntax tokenizes as JavaScript's punctuation and names.
export type Token = { label: string; value: unknown; start: number; end: number };
export function tokensOf(text: string, max = Infinity): Token[] {
  const out: Token[] = [];
  try {
    const it = acorn.tokenizer(text, { ecmaVersion: "latest" });
    for (let t = it.getToken(); t.type !== acorn.tokTypes.eof && out.length < max; t = it.getToken())
      out.push({ label: t.type.keyword ?? t.type.label, value: t.value, start: t.start, end: t.end });
  } catch {}
  return out;
}
// The parameter names of the cell a text declares, from its parse; null for a text that does not parse
export function paramsOf(text: string): string[] | null {
  try { const c = cellsOf(lowerJsx(text))[0]; return c ? c.params.map((p) => p.name) : null; } catch { return null; }
}

// the first max tokens of text; a text that does not lex throws
export const tcLex = (text: string, max: number): { label: string; start: number; end: number }[] => {
  const out: { label: string; start: number; end: number }[] = [];
  const it = acorn.tokenizer(text, { ecmaVersion: "latest" });
  for (let t = it.getToken(); t.type !== acorn.tokTypes.eof && out.length < max; t = it.getToken()) out.push({ label: t.type.label, start: t.start, end: t.end });
  return out;
};
// the text of the first comment, read with the tokenizer as far as it reads
export const tcFirstComment = (js: string): string | null => {
  let first: string | null = null;
  try {
    const it = acorn.tokenizer(js, { ecmaVersion: "latest", sourceType: "module", onComment: (_b: boolean, text: string) => { if (first === null) first = text; } });
    for (let t = it.getToken(); first === null && t.type !== acorn.tokTypes.eof; t = it.getToken());
  } catch {}
  return first;
};
// plain JavaScript's error for an expression, null when it parses
export const tcJsError = (text: string): string | null => {
  try { acorn.parseExpressionAt(text, 0, { ecmaVersion: "latest" }); return null; } catch (e) { return (e as Error).message; }
};
export const tcDeclaredName = (text: string): string | null => declaredName(text);
export const tcLower = (text: string, keep: boolean): string => lowerJsx(text, { keep });
export const tcCellsOf = (text: string) => cellsOf(text).map((c) => ({
  name: c.name, returnsRef: c.returnsRef, generator: c.generator, compiles: c.compiles.map((s) => ({ refs: s.refs })), casts: [], holes: [], strict: null,
  params: c.params.map((p) => ({ name: p.name, refTyped: p.refTyped, eventsTyped: p.eventsTyped, boundary: p.boundary ?? null })),
}));
export const tcIsIdentifier = (s: string): boolean => s.length > 0 && acorn.isIdentifierStart(s.codePointAt(0)!, true) && [...s].slice(1).every((c) => acorn.isIdentifierChar(c.codePointAt(0)!, true));
export const tcCapNames = (): string[] => Object.keys(CAPABILITIES);
export const tcPreludeFns = (): string[] => [...PRELUDE_FNS];
export const tcOjsGlobals = (): string[] => [...OJS_INPUT_GLOBALS];

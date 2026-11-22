// complete.ts's reading of the text before the cursor, which usually does not parse: the typed word, strings and
// comments, open brackets, the cell's head and parameter list, a JSX tag. The patterns are complete.ts's own.

// the word ending at the end of s ([\w$]*$)
export const cpWordEnd = () => (s: string): string => /(?<w>[\w$]*)$/.exec(s)?.groups?.w ?? "";
// the rest of s after the word it starts with
export const cpAfterWord = () => (s: string): string => s.replace(/^[\w$]*/, "");
// an opening bracket's closer, as scan's result lists them
export const cpCloserOf = () => (o: string): string => (o === "${" ? "}" : o === "`" ? "`" : o === "(" ? ")" : o === "[" ? "]" : "}");
// the end of a line or block comment starting at i, -1 when it does not end before end
export const cpCommentEnd = () => (text: string, i: number, end: number): number => {
  if (text.charAt(i + 1) === "/") { const n = text.indexOf("\n", i); return n < 0 || n >= end ? -1 : n + 1; }
  const n = text.indexOf("*/", i + 2);
  return n < 0 || n + 2 > end ? -1 : n + 2;
};
// the end of a quoted string starting at i, -1 when it does not close before end
export const cpQuoteEnd = () => (text: string, i: number, end: number): number => {
  const c = text.charAt(i);
  let j = i + 1;
  while (j < end && text.charAt(j) !== c && text.charAt(j) !== "\n") j += text.charAt(j) === "\\" ? 2 : 1;
  return j >= end ? -1 : j + 1;
};
// scan: whether end sits in a string or comment, and the closers of the brackets open there, innermost first
export const cpScan = (cpCommentEnd, cpQuoteEnd, cpCloserOf) => (text: string, end: number): CpScan => {
  const stack: Mut<string[]> = [];
  let i = 0;
  while (i < end) {
    const c = text.charAt(i), d = text.charAt(i + 1);
    if (c === "/" && (d === "/" || d === "*")) { const n = cpCommentEnd(text, i, end); if (n < 0) return { quoted: true, closers: [] }; i = n; continue; }
    if (c === '"' || c === "'") { const n = cpQuoteEnd(text, i, end); if (n < 0) return { quoted: true, closers: [] }; i = n; continue; }
    if (stack.at(-1) === "`") {
      if (c === "`") stack.pop();
      else if (c === "$" && d === "{") { stack.push("${"); i++; }
      else if (c === "\\") i++;
      i++; continue;
    }
    if (c === "`" || c === "(" || c === "[" || c === "{") stack.push(c);
    else if (c === ")" || c === "]" || c === "}") stack.pop();
    i++;
  }
  if (stack.at(-1) === "`") return { quoted: true, closers: [] };
  return { quoted: false, closers: stack.map((o) => cpCloserOf(o)).toReversed() };
};
// tagAt: in `<tag attr…` with the cursor at an attribute name, the tag
export const cpTagAt = () => (before: string): string | null => {
  if (!/\s$/.test(before)) return null;
  let depth = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    const c = before.charAt(i);
    if (c === "}") depth++;
    else if (c === "{") { if (depth === 0) return null; depth--; }
    else if (depth === 0) {
      if (c === ">") return null;
      if (c === "<") return /^<(?<t>[a-z][\w]*)\s/.exec(before.slice(i))?.groups?.t ?? null;
    }
  }
  return null;
};
// the length of complete.ts's HEAD at the start of s (comments, then the cell's head up to its "("), -1 for none
export const cpHeadLen = () => (s: string): number => {
  const m = /^(?<h>(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*(?:export\s+)?(?:(?:const|let)\s+[\w$]+\s*=\s*(?:async\s+)?(?:function\*?\s*[\w$]*\s*)?|(?:async\s+)?function\*?\s+[\w$]+\s*)\()/.exec(s);
  return m === null ? -1 : (m.groups?.h ?? "").length;
};
// the name the cell's head declares, or null
export const cpSelfName = () => (s: string): string | null =>
  /^(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*(?:export\s+)?(?:const|let|(?:async\s+)?function\*?)\s+(?<n>[\w$]+)/.exec(s)?.groups?.n ?? null;
// paramListAt: inside the cell's own parameter list at a name position, the names already there
export const cpParamListAt = (cpHeadLen) => (before: string): string[] | null => {
  const at = cpHeadLen(before);
  if (at < 0) return null;
  const inside = before.slice(at);
  let depth = 0;
  for (const c of inside) {
    if ("([{<".includes(c)) depth++;
    else if (")]}>".includes(c)) { if (depth === 0) return null; depth--; }
  }
  if (depth !== 0) return null;
  const parts = inside.split(",");
  if ((parts.at(-1) ?? "").trim() !== "") return null;
  return parts.slice(0, -1).map((p) => /^\s*(?<n>[\w$]+)/.exec(p)?.groups?.n ?? "").filter((n) => n !== "");
};
// typeAt: after a parameter's colon in the cell's own parameter list, or in the return type after it
export const cpTypeAt = (cpHeadLen) => (before: string): boolean => {
  const at = cpHeadLen(before);
  if (at < 0) return false;
  const inside = before.slice(at);
  let depth = 0, seg = "";
  for (let i = 0; i < inside.length; i++) {
    const c = inside.charAt(i);
    if ("([{<".includes(c)) depth++;
    else if (")]}>".includes(c) && !(c === ">" && inside.charAt(i - 1) === "=")) {
      if (depth === 0) return c === ")" && /^\s*:[^={]*$/.test(inside.slice(i + 1));
      depth--;
    }
    if (depth === 0 && c === ",") { seg = ""; continue; }
    seg += c;
  }
  return /^\s*[\w$]+\s*\??\s*:/.test(seg);
};
// declared: the names of the types and interfaces a line of src starts to declare, in order
export const cpDeclared = () => (src: string): string[] => {
  const out: Mut<string[]> = [];
  let pos = 0;
  for (;;) {
    const re = pos === 0 ? /(?<all>(?:^|\n)\s*(?:export\s+)?(?:interface|type)\s+(?<n>[\w$]+))/ : /(?<all>\n\s*(?:export\s+)?(?:interface|type)\s+(?<n>[\w$]+))/;
    const m = re.exec(src.slice(pos));
    if (m === null) return out;
    out.push(m.groups?.n ?? "");
    pos += (m.index ?? 0) + (m.groups?.all ?? "").length;
  }
};
// the attribute names a tag's text already gives (\s([\w-]+)= over it)
export const cpGivenAttrs = () => (s: string): Set<string> => {
  const out: Mut<Set<string>> = new Set();
  let pos = 0;
  for (;;) {
    const m = /\s(?<n>[\w-]+)=/.exec(s.slice(pos));
    if (m === null) return out;
    const n = m.groups?.n ?? "";
    out.add(n);
    pos += (m.index ?? 0) + n.length + 2;
  }
};
// a spread (`...`) or a number literal's dot (`1.`) before the cursor, where nothing is offered
export const cpNoOffer = () => (before: string): boolean => /\.\.\.\s*$/.test(before) || /(^|[^\w$.])\d+\.$/.test(before);
// a member read: the text before the word ends in `.` or `?.`
export const cpIsMember = () => (before: string): boolean => /(\?\.|\.)\s*$/.test(before);

// The position of the cursor, read on the Lezer tree of the text before it (the host's treeAt, cp-lezer.ts): in a
// string or comment, the brackets open there, after a "." or a spread, in a JSX tag, in the cell's own parameter list or
// one of its types. The typed word is read from the characters, as a string or comment has no token for it.

// the word ending at the end of s ([\w$]*$)
export const cpWordEnd = () => (s: string): string => /(?<w>[\w$]*)$/.exec(s)?.groups?.w ?? "";
// the rest of s after the word it starts with
export const cpAfterWord = () => (s: string): string => s.replace(/^[\w$]*/, "");
// the closer of an opening token, "" for any other node
export const cpCloserOf = () => (name: string): string => (name === "(" ? ")" : name === "[" ? "]" : name === "{" || name === "InterpolationStart" ? "}" : "");
// the bracket a node of the path leaves open: an opening child with no closer after it, or "`" for a template cut short
export const cpOpenIn = (cpCloserOf) => (n: CpLzNode): string => {
  if (n.name === "TemplateString") return n.kids.some((k) => k.name === "⚠") ? "`" : "";
  let open = "";
  for (const k of n.kids) {
    const c = cpCloserOf(k.name);
    if (c !== "") open = c;
    else if (open !== "" && (k.name === open || (open === "}" && k.name === "InterpolationEnd"))) open = "";
  }
  return open;
};
// whether the end of text sits in a comment, an unclosed string or a template's text (not in its ${…})
export const cpQuoted = () => (text: string, path: CpLzNode[]): boolean => {
  for (const n of path) {
    if (n.to < text.length) continue;
    if (n.name === "Interpolation") return false;
    if (n.name === "LineComment") return true;
    if ((n.name === "String" || n.name === "TemplateString" || n.name === "BlockComment") && n.kids.some((k) => k.name === "⚠")) return true;
    if (n.name === "⚠" && (text.charAt(n.from) === '"' || text.charAt(n.from) === "'")) return true;
  }
  return false;
};
// scan: whether the end of text is quoted, and the closers of the brackets open there, innermost first
export const cpScan = (cpQuoted, cpOpenIn) => (text: string, path: CpLzNode[]): CpScan =>
  cpQuoted(text, path) ? { quoted: true, closers: [] } : { quoted: false, closers: path.map((n) => cpOpenIn(n)).filter((c) => c !== "") };
// a spread or a number literal's dot (`1.`) just before the end, where nothing is offered
export const cpNoOffer = () => (text: string, path: CpLzNode[]): boolean => {
  const t = path[0];
  return t !== undefined && (t.name === "Spread" || (t.name === "Number" && t.to === text.length && text.charAt(t.to - 1) === "."));
};
// a member read: the last token is "." or "?."
export const cpIsMember = () => (path: CpLzNode[]): boolean => path[0]?.name === "." || path[0]?.name === "?.";
// the node n, with its children: on the path to the position just inside it
export const cpNodeOf = () => (at: CpTreeAt, text: string, n: CpLzSpan): CpLzNode | null =>
  at(text, n.from + 1).find((m) => m.from === n.from && m.to === n.to && m.name === n.name) ?? null;
// tagAt: the end of text in `<tag attr…` after a space, outside any {…}: the tag, when it is a lowercase (builtin) one
export const cpTagAt = () => (text: string, path: CpLzNode[]): CpLzNode | null => {
  const i = path.findIndex((n) => n.name === "JSXSelfClosingTag" || n.name === "JSXOpenTag");
  const tag = path[i], leaf = path[0];
  if (tag === undefined || leaf === undefined || i === 0 || tag.to < text.length || leaf.to === text.length) return null;
  if (path.slice(0, i).some((n) => n.name === "JSXEscape" && n.to === text.length)) return null;
  return tag.kids.some((k) => k.name === "JSXBuiltin") ? tag : null;
};
// the attribute names a tag already gives a value (name=)
export const cpGivenAttrs = (cpNodeOf) => (at: CpTreeAt, text: string, tag: CpLzNode): Set<string> => {
  const out: Mut<Set<string>> = new Set();
  for (const k of tag.kids) {
    const a = k.name === "JSXAttribute" ? cpNodeOf(at, text, k) : null;
    const n = a?.kids[0];
    if (a !== null && n !== undefined && n.name === "JSXIdentifier" && a.kids[1]?.name === "Equals") out.add(text.slice(n.from, n.to));
  }
  return out;
};
// the names of the children before a function's parameter list that its head may have
export const CP_HEAD_WORDS = () => ["async", "function", "Star", "VariableDefinition"];
// the cell's function from the init of its declaration: (…) =>, async (…) =>, function [*] [name] (…), or an unclosed "(…"
// that the grammar reads as parentheses (`(`, `([a], `) before an arrow shows it is a parameter list
export const cpHeadFn = (cpNodeOf, CP_HEAD_WORDS) => (at: CpTreeAt, text: string, decl: CpLzNode): CpHead | null => {
  const [k0, k1, k2, k3] = decl.kids;
  const named = (k0?.name === "const" || k0?.name === "let") && k1?.name === "VariableDefinition" && k2?.name === "Equals";
  const init = decl.name === "FunctionDeclaration" ? decl : named && k3 !== undefined ? cpNodeOf(at, text, k3) : null;
  if (init === null) return null;
  if (init.name === "ParenthesizedExpression") return init.kids.some((x) => x.name === ")") ? null : { decl, fn: init, list: init };
  if (init.name !== "ArrowFunction" && init.name !== "FunctionExpression" && init.name !== "FunctionDeclaration") return null;
  const i = init.kids.findIndex((x) => x.name === "ParamList"), pl = init.kids[i];
  const ok = (x: CpLzSpan) => (init.name === "ArrowFunction" ? x.name === "async" : CP_HEAD_WORDS.includes(x.name));
  const list = pl === undefined || !init.kids.slice(0, i).every(ok) ? null : cpNodeOf(at, text, pl);
  return list === null || list.kids[0]?.name !== "(" ? null : { decl, fn: init, list };
};
// the head: the first statement after comments, [export] const|let name = <function> or [export] [async] function name(…)
export const cpHeadOf = (cpNodeOf, cpHeadFn) => (at: CpTreeAt, text: string): CpHead | null => {
  const first = at(text, 1).at(-1)?.kids.find((k) => k.name !== "LineComment" && k.name !== "BlockComment");
  let decl = first === undefined ? null : cpNodeOf(at, text, first);
  if (decl !== null && decl.name === "ExportDeclaration") { const d = decl.kids[1]; decl = d === undefined ? null : cpNodeOf(at, text, d); }
  return decl !== null && (decl.name === "VariableDeclaration" || decl.name === "FunctionDeclaration") ? cpHeadFn(at, text, decl) : null;
};
// whether a is the node b
export const cpSameNode = () => (a: CpLzSpan | undefined, b: CpLzSpan): boolean => a !== undefined && a.name === b.name && a.from === b.from && a.to === b.to;
// the name the cell's head declares, or null
export const cpSelfName = () => (text: string, head: CpHead | null): string | null => {
  const d = head?.decl.kids.find((k) => k.name === "VariableDefinition");
  return d === undefined ? null : text.slice(d.from, d.to);
};
// the parameters of a parameter list (or of the sequence in an unclosed "(…") that are a plain name; with rest, a rest
// parameter's name too
export const cpParamNames = () => (list: CpLzNode, rest: boolean): CpLzSpan[] => list.kids.filter((k, i) =>
  (k.name === "VariableDefinition" || k.name === "VariableName") && (i === 0 || ["(", ",", ...(rest ? ["Spread"] : [])].includes(list.kids[i - 1]?.name ?? "")));
// paramListAt: just after the "(" or a "," of the cell's own parameter list, the names already there
export const cpParamListAt = (cpSameNode, cpParamNames) => (text: string, path: CpLzNode[], head: CpHead | null): string[] | null => {
  const leaf = path[0], up = path[1];
  if (head === null || leaf === undefined || up === undefined || (leaf.name !== "(" && leaf.name !== ",")) return null;
  const inSeq = up.name === "SequenceExpression" && head.fn.name === "ParenthesizedExpression" && cpSameNode(path[2], head.list);
  return inSeq || cpSameNode(up, head.list) ? cpParamNames(up, false).map((k) => text.slice(k.from, k.to)) : null;
};
// typeAt: in the annotation of one of the cell's own parameters, or in its return type
export const cpTypeAt = (cpSameNode) => (path: CpLzNode[], head: CpHead | null): boolean => {
  if (head === null) return false;
  return path.some((up, i) => {
    const t = path[i - 1];
    return t !== undefined && t.name === "TypeAnnotation" && (cpSameNode(up, head.list) || (cpSameNode(up, head.fn) && t.from > head.list.from));
  });
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

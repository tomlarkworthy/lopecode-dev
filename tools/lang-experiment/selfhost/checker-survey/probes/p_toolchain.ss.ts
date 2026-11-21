// uses: ast, astlib
// Sampled units of lite/toolchain/ss-toolchain.ts. parse is the SoundScript parser a self-hosted toolchain would
// need (a stub here, with acorn's behaviour: it throws on a syntax error). Stubs are marked and not counted.
export const parse = () => (src: string, opts: { jsx?: boolean } = {}): Parsed => { throw new Error("stub"); };
export type IslandSpec = { inputs: string[]; refs: string[]; outputs: string[] };
export type CellInfo = { name: string; params: { name: string; refTyped: boolean; eventsTyped: boolean }[]; returnsRef: boolean; generator: boolean; compiles: IslandSpec[] };
export type Context = { generators: Set<string>; events: Set<string>; accepted: Set<string> | null; facts?: Map<string, CellInfo> | null; why?: Map<string, string[]> | null };

// keyOfVariable, original form (indexes the match)
export const keyOfVariable = () => (name: string): string => {
  const n = name.replace(/^viewof /, "");
  const m = /^\$ss\$(type|\d+)\$([\w$]+)$/.exec(n);
  return !m ? n : m[1] === "type" ? `type ${m[2]}` : `${m[2]} (${m[1]})`;
};
// keyOfVariable, rewritten: the groups through replace's $1/$2
export const keyOfVariable_rw = () => (name: string): string => {
  const n = name.replace(/^viewof /, "");
  const RE = /^\$ss\$(type|\d+)\$([\w$]+)$/;
  if (!RE.test(n)) return n;
  return n.replace(RE, "$1") === "type" ? n.replace(RE, "type $2") : n.replace(RE, "$2 ($1)");
};
// contextOf (full body); cellsOf, lowerJsx and contextOfFacts are stubs
export const cellsOf = () => (src: string): CellInfo[] => { throw new Error("stub"); };
export const lowerJsx = () => (src: string, opts: { keep?: boolean } = {}): string => { throw new Error("stub"); };
export const contextOfFacts = () => (infos: CellInfo[], accepted: Set<string> | null): Context => { throw new Error("stub"); };
export const contextOf = (cellsOf, lowerJsx, contextOfFacts) => (texts: string[], tsx: boolean, accepted: Set<string> | null = null): Context => {
  const infos = texts.flatMap((t) => { try { return cellsOf(tsx ? lowerJsx(t) : t); } catch { return []; } });
  return contextOfFacts(infos, accepted);
};
// keepJsx, original form: replace with a callback that advances a let
export const keep = () => (s: string): string => s;
export const keepJsx = (parse, kids, lowerJsx, keep) => (fnSrc: string): string => {
  const s = `(${fnSrc})`;
  const originals: Mut<string[]> = mut([]);
  function visit(n: Node): void {
    if (n.type === "JSXElement" || n.type === "JSXFragment") { originals.push(s.slice(n.start, n.end)); return; }
    for (const c of kids(n)) visit(c);
  }
  visit(parse(s, { jsx: true }).program);
  const kept = freeze(originals);
  let i = 0;
  const out = lowerJsx(s, { keep: true }).replace(/\/\*ss<[\s\S]*?\*\//g, () => `/*ss<${keep(kept[i++] ?? "")}*/`);
  if (i !== kept.length) throw new Error("JSX originals and kept comments do not match");
  return out.slice(1, -1);
};
// keepJsx, rewritten: split on the comment and rejoin in a loop
export const keepJsx_rw = (parse, kids, lowerJsx, keep) => (fnSrc: string): string => {
  const s = `(${fnSrc})`;
  const originals: Mut<string[]> = mut([]);
  function visit(n: Node): void {
    if (n.type === "JSXElement" || n.type === "JSXFragment") { originals.push(s.slice(n.start, n.end)); return; }
    for (const c of kids(n)) visit(c);
  }
  visit(parse(s, { jsx: true }).program);
  const kept = freeze(originals);
  const parts = lowerJsx(s, { keep: true }).split(/\/\*ss<[\s\S]*?\*\//);
  if (parts.length - 1 !== kept.length) throw new Error("JSX originals and kept comments do not match");
  let out = parts[0] ?? "";
  for (let i = 0; i < kept.length; i++) out += `/*ss<${keep(kept[i] ?? "")}*/` + (parts[i + 1] ?? "");
  return out.slice(1, -1);
};
// tokensOf: acorn's tokenizer, an iterator object from the parser library (reduced: its type only)
export type Tok = { type: { label: string; keyword?: string }; value: unknown; start: number; end: number };
export type Tokenizer = { getToken: () => Tok };
export type Token = { label: string; value: unknown; start: number; end: number };
export const tokenizer = () => (text: string): Tokenizer => { throw new Error("stub"); };
export const tokensOf = (tokenizer) => (text: string, max: number = Infinity): Token[] => {
  const out: Mut<Token[]> = mut([]);
  try {
    const it = tokenizer(text);
    for (let t = it.getToken(); t.type.label !== "eof" && out.length < max; t = it.getToken())
      out.push({ label: t.type.keyword ?? t.type.label, value: t.value, start: t.start, end: t.end });
  } catch {}
  return freeze(out);
};
// ojsCell (called by compileChecked): body is given a recorder r and called twice; the first call's r records
// the order of first use. Reduced to that pattern.
export type Built = { text: string; inputs: string[] };
export const ojsCell = () => (name: string, body: (r: (input: string) => string) => string): Built => {
  const order: Mut<string[]> = mut([]);
  const text = body((i) => { if (!order.includes(i)) order.push(i); return i; });
  return { text: `${name} = ${text}`, inputs: freeze(order) };
};
// compileChecked: its regex-guarded field read `d.id.name` after /^TS(TypeAlias|Interface)Declaration$/.test(d.type)
export const typeCellName = () => (d: Node): string | null => (/^TS(TypeAlias|Interface)Declaration$/.test(d.type) ? d.id.name : null);
// parseCompiled: a module-level memo, the identity test `n === fn`, the header read by JSON.parse
export const parsedCompiled = () => new Map<string, string | null>();
export const memoWrite = (parsedCompiled) => (definition: string): void => { parsedCompiled.set(definition, null); };
export const identityTest = () => (n: Node, fn: Node): boolean => n === fn;
export const header = () => (value: string): Record<string, string> => {
  const h = JSON.parse(value.slice(3));
  return h;
};
// fromObservableVariables: the caught parse error's message
export const reasonOf = (parse) => (definition: string): string => {
  try { parse(definition); return ""; } catch (e) { return `the definition does not parse: ${e.message}`; }
};

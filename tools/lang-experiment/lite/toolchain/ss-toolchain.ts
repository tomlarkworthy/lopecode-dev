// ss_toolchain: SoundScript cells <-> Lopecode runtime variables.
// A compiled cell is ordinary JS whose first comment is /*{lang:"ss"}*/. The typed source is kept in
// it (types as /*ss:...*/ comments, JSX as /*ss<...*/, the text around the function in a /*ss^{...}*/
// header), so decompile recovers the cell exactly from the variable's definition text.
import * as acorn from "acorn";
import { parse, kids, type Node } from "../parse.ts";
import { lowerJsx } from "../jsx/lower.ts";
import { cellsOf, type CellInfo } from "../facts.ts";
import { commentTypes, uncommentTypes, langOf, LANG, esc, unesc } from "./comment-types.ts";

export type Variable = { name: string; inputs: string[]; definition: string };
export { langOf, LANG };

const SS = "$ss$"; // wrapper parameter bound to the stdlib runtime object
export const STDLIB_INPUT = "ss";
const PRELUDE = ["ref", "action", "mut", "freeze", "borrow", "snapshot", "equals", "on", "h"];
// Capability parameter -> the variable the stdlib provides. invalidation is the runtime's own;
// ss_compile is defined in each module that compiles, because compile reads that module's cells.
export const CAP_INPUTS: Record<string, string> = { now: "ss_now", random: "ss_random", fetch: "ss_fetch", log: "ss_log", pool: "ss_pool", compile: "ss_compile", invalidation: "invalidation" };
const PROJECTION = "/*ss@ref*/";

const header = (o: object) => `/*ss^${JSON.stringify(o).replaceAll("*/", "*\\/")}*/`;

function reserved(text: string) {
  for (const m of ["/*ss", LANG]) if (text.includes(m)) throw new Error(`cell source contains the reserved text ${m}`);
}

// lowerJsx keeps each top-level element's source in a /*ss<...*/ comment, escaped in a way that cannot
// hold "*\/"; rewrite each kept original with esc, which decompile inverts exactly
function keepJsx(fnSrc: string): string {
  const s = `(${fnSrc})`;
  const originals: string[] = [];
  const visit = (n: Node) => {
    if (n.type === "JSXElement" || n.type === "JSXFragment") { originals.push(s.slice(n.start, n.end)); return; }
    for (const c of kids(n)) visit(c);
  };
  visit(parse(s, { jsx: true }).program);
  let i = 0;
  const out = lowerJsx(s, { keep: true }).replace(/\/\*ss<[\s\S]*?\*\//g, () => `/*ss<${esc(originals[i++])}*/`);
  if (i !== originals.length) throw new Error("JSX originals and kept comments do not match");
  return out.slice(1, -1);
}

// a TS form commentTypes leaves in the code is refused by name, never emitted as JS that does not parse
function erasesToJs(typed: string, fn: Node) {
  try { acorn.parseExpressionAt(`(${typed})`, 0, { ecmaVersion: "latest" }); return; } catch (e) {
    let what = "";
    const find = (n: Node) => {
      if (what || !n || typeof n !== "object") return;
      if (n.definite) what = "definite assignment `!:`";
      else if (n.type === "TSParameterProperty") what = "a parameter property";
      else if (/^TS(Enum|Module)Declaration$/.test(n.type)) what = n.type === "TSEnumDeclaration" ? "enum" : "namespace";
      else if (n.accessibility || n.abstract || n.declare || n.override) what = "a class member modifier";
      else for (const c of kids(n)) find(c);
    };
    find(fn);
    throw new Error(`unsupported: ${what || "TypeScript syntax that does not erase to JavaScript"} (${(e as Error).message})`);
  }
}

// Split a SoundScript file into cell texts (leading comments included), in order.
export function splitCells(src: string, tsx: boolean): string[] {
  const P = parse(src, { jsx: tsx });
  const out: string[] = [];
  let end = 0;
  for (const st of P.program.body as Node[]) {
    const lead = P.leading(st);
    const start = lead.length ? lead[0].start : st.start;
    out.push(src.slice(start, st.end));
    end = st.end;
  }
  if (P.comments.some((c) => c.start >= end)) throw new Error("a comment after the last cell has no cell to belong to");
  return out;
}

const identifiers = (n: Node, acc = new Set<string>()): Set<string> => {
  if (!n || typeof n !== "object") return acc;
  if (n.type === "Identifier") acc.add(n.name);
  for (const k in n) {
    if (k === "loc") continue;
    const v = (n as any)[k];
    if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === "string" && identifiers(x, acc));
    else if (v && typeof v.type === "string") identifiers(v, acc);
  }
  return acc;
};

// What one cell's compiled form depends on in the rest of its module: which cells are generators,
// which of those some cell takes as Source<T>, and which cells the checker accepted (only those are
// memoised; null, as for a cell compiled on its own, memoises none). compileModule works it out.
// facts: each cell's facts (facts.ts) when a check result supplied them, so compileCell does not parse
// for them again.
// subs: cells whose value type, as the checker inferred it, holds Sub; null when no check ran.
export type Context = { generators: ReadonlySet<string>; sourced: ReadonlySet<string>; accepted: ReadonlySet<string> | null; facts?: ReadonlyMap<string, CellInfo> | null; subs?: ReadonlySet<string> | null };
const NO_CONTEXT: Context = { generators: new Set(), sourced: new Set(), accepted: null };
const NO_MEMO_CAPS = new Set(["now", "random", "fetch", "log"]);

export function contextOf(texts: string[], tsx: boolean, accepted: ReadonlySet<string> | null = null): Context {
  const infos = texts.flatMap((t) => { try { return cellsOf(tsx ? lowerJsx(t) : t); } catch { return []; } });
  return contextOfFacts(infos, accepted);
}
function contextOfFacts(infos: Iterable<CellInfo>, accepted: ReadonlySet<string> | null, facts: ReadonlyMap<string, CellInfo> | null = null, subs: ReadonlySet<string> | null = null): Context {
  const list = [...infos];
  const generators = new Set(list.filter((c) => c.generator).map((c) => c.name));
  const sourced = new Set(list.flatMap((c) => c.params.filter((p) => p.sourceTyped && generators.has(p.name)).map((p) => p.name)));
  return { generators, sourced, accepted, facts, subs };
}
// the cells a check result accepts: ok, with no errors. Only these are memoised.
type CheckLike = { cells: { name: string; status: string; errors: unknown[]; value?: string }[]; facts?: ReadonlyMap<string, CellInfo> };
export const acceptedOf = (result: CheckLike) => new Set(result.cells.filter((c) => c.status === "ok" && !c.errors.length).map((c) => c.name));
// the same context as contextOf over the module's texts, from one check of the whole module, plus which
// cells hold Sub. The checker shows an alias by its name, so source (the checked module text) is
// needed to see Sub through `type Subs = Sub[]`; without it only types that spell Sub count.
export function contextFromCheck(result: CheckLike, source?: string, tsx = true): Context {
  if (!result.facts) throw new Error("this check result carries no cell facts");
  const names = new Set(["Sub"]);
  if (source !== undefined) {
    const aliases: [string, string][] = [];
    for (const st of parse(source, { jsx: tsx }).program.body as Node[]) {
      const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
      if (d && /^TS(TypeAlias|Interface)Declaration$/.test(d.type)) aliases.push([d.id.name, source.slice(d.start, d.end)]);
    }
    for (let grew = true; grew;) {
      grew = false;
      for (const [n, text] of aliases) if (!names.has(n) && mentions(text.slice(text.indexOf(n) + n.length), names)) { names.add(n); grew = true; }
    }
  }
  const subs = new Set(result.cells.filter((c) => mentions(c.value ?? "", names)).map((c) => c.name));
  return contextOfFacts(result.facts.values(), acceptedOf(result), result.facts, subs);
}
const mentions = (text: string, names: ReadonlySet<string>) => (text.match(/[\w$]+/g) ?? []).some((w) => names.has(w));

// The variable a cell's value is read from, and the one that holds its handle.
export const handleName = (name: string) => `viewof ${name}`;

// two 32-bit FNV-1a hashes with different offsets, as 13 base-36 digits
export function contentId(text: string): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x01000193 + 2) >>> 0;
  }
  return a.toString(36).padStart(7, "0") + b.toString(36).padStart(7, "0");
}

export function compileCell(text: string, tsx: boolean, ctx: Context = NO_CONTEXT): Variable[] {
  reserved(text);
  const P = parse(text, { jsx: tsx });
  if (P.program.body.length !== 1) throw new Error("a cell is exactly one top-level statement");
  const st: Node = P.program.body[0];
  const d: Node | null = st.type === "ExportNamedDeclaration" ? st.declaration : st;
  if (d && /^TS(TypeAlias|Interface)Declaration$/.test(d.type)) {
    return [{ name: `type ${d.id.name}`, inputs: [], definition: `() => ${LANG}${header({ d: text })}undefined` }];
  }
  let fn: Node | null = null;
  if (st.type === "ExportNamedDeclaration" && d?.type === "FunctionDeclaration") fn = d;
  else if (st.type === "ExportNamedDeclaration" && d?.type === "VariableDeclaration" && d.declarations.length === 1 &&
    /^(Arrow)?FunctionExpression$/.test(d.declarations[0].init?.type ?? "")) fn = d.declarations[0].init;
  if (!fn) throw new Error(`unsupported top-level statement (${st.type}); a cell is an exported function`);

  const declared = fn === d ? d.id?.name : d.declarations[0].id?.name;
  const info = (declared && ctx.facts?.get(declared)) || cellsOf(tsx ? lowerJsx(text) : text)[0];
  if (!info) throw new Error("not a cell");

  // an anonymous function* (...) is not a statement, so each pass sees the function as an expression
  const asExpr = (f: (s: string) => string, s: string) => f(`(${s})`).slice(1, -1);
  const fnSrc = text.slice(fn.start, fn.end);
  const lowered = tsx ? keepJsx(fnSrc) : fnSrc;
  const typed = asExpr(commentTypes, lowered);
  erasesToJs(typed, fn);
  const params = info.params.map((p) => p.name);
  const used = [...identifiers(parse(`(${lowered})`).program)].filter((n) => PRELUDE.includes(n) && !params.includes(n));
  const inputs = [STDLIB_INPUT, ...info.params.map((p) => (p.refTyped ? handleName(p.name) : CAP_INPUTS[p.name] ?? p.name))];
  const kind = info.returnsRef ? "ref" : info.generator && ctx.sourced.has(info.name) ? "source" : "cell";
  // hidden inputs: invalidation for a cell that builds subscriptions or whose value holds them (the set
  // it returns is released when it re-runs), and the refs of its compile(...) calls (it re-runs, and
  // returns new functions, when one changes)
  const hidden: string[] = [];
  const hiddenInputs: string[] = [];
  if ((used.includes("on") || !!ctx.subs?.has(info.name)) && !params.includes("invalidation")) { hidden.push("$ss$inv"); hiddenInputs.push("invalidation"); }
  const inv = params.includes("invalidation") ? "invalidation" : hidden.includes("$ss$inv") ? "$ss$inv" : "null";
  const refs = [...new Set(info.compiles.flatMap((s) => s.refs))];
  const refArgs = refs.map((r, i) => { hidden.push(`$ss$r${i}`); hiddenInputs.push(r); return `${JSON.stringify(r)}: $ss$r${i}`; });
  const args = params.map((p) => (p === "compile" ? `${SS}.compileFor(compile, ${JSON.stringify(info.name)}, {${refArgs.join(", ")}})` : p));
  const memo = kind === "cell" && !info.generator && !!ctx.accepted?.has(info.name) &&
    !info.params.some((p) => NO_MEMO_CAPS.has(p.name) || (ctx.generators.has(p.name) && !p.sourceTyped));
  const inner = `${LANG}${header({ h: text.slice(0, fn.start), t: text.slice(fn.end) })}${typed}`;
  const destructure = used.length ? `const {${used.join(", ")}} = ${SS}; ` : "";
  // id: a hash of the compiled text. The memo is keyed by it, so equal text with equal inputs shares a
  // result (sound for a pure cell) and any edit starts empty.
  const body = `${inner}, [${args.join(", ")}]`;
  const id = contentId(`${kind} ${info.name} ${memo} ${body}`);
  const opts = `{kind: ${JSON.stringify(kind)}, name: ${JSON.stringify(info.name)}, memo: ${memo}, id: ${JSON.stringify(id)}, invalidation: ${inv}}`;
  const definition = `(${[SS, ...params, ...hidden].join(", ")}) => { ${destructure}return ${SS}.cell(${body}, ${opts}); }`;
  const all = [...inputs, ...hiddenInputs];
  if (kind === "ref") {
    return [
      { name: info.name, inputs: [handleName(info.name), STDLIB_INPUT], definition: `(_, ${SS}) => ${LANG}${PROJECTION}${SS}.refValues(_)` },
      { name: handleName(info.name), inputs: all, definition },
    ];
  }
  return [{ name: info.name, inputs: all, definition }];
}

export function compileModule(src: string, tsx: boolean, accepted: ReadonlySet<string> | null = null): Variable[] {
  const texts = splitCells(src, tsx);
  const ctx = contextOf(texts, tsx, accepted);
  return texts.flatMap((c) => compileCell(c, tsx, ctx));
}

// The compiler's memo id: the id in the options object it writes last in a cell's definition. A user's
// own `id:` property cannot match, because nothing follows the options object but `); }`.
const ID_AT = /\bid: "(\w+)"(?=, invalidation: [\w$]+\}\); \}$)/;
export const idOf = (definition: string): string | null => ID_AT.exec(definition)?.[1] ?? null;
export function withId(definition: string, id: string): string {
  if (!/^\w+$/.test(id)) throw new Error(`a memo id is word characters only: ${JSON.stringify(id)}`);
  return definition.replace(ID_AT, () => `id: "${id}"`);
}

// The cell source a variable holds; null for a variable that is not SoundScript or is a generated part of a cell.
export function decompileVariable(definition: string): string | null {
  if (langOf(definition) !== "ss") return null;
  const at = definition.indexOf(LANG) + LANG.length;
  if (definition.startsWith(PROJECTION, at)) return null;
  if (!definition.startsWith("/*ss^", at)) throw new Error("SoundScript variable without a header comment");
  const hEnd = definition.indexOf("*/", at) + 2;
  const hdr = JSON.parse(definition.slice(at + 5, hEnd - 2));
  if (typeof hdr.d === "string") return hdr.d;
  const ast: any = acorn.parseExpressionAt(definition, 0, { ecmaVersion: "latest" });
  const ret = ast.body.body.find((s: any) => s.type === "ReturnStatement");
  let end = ret.argument.arguments[0].end;
  // a JSX element or a type (`x as T`, `x!`) that ends an arrow body closes after the function node does
  for (;;) {
    if (definition.startsWith("/*ss>*/", end)) end += 7;
    else if (definition.startsWith("/*ss:", end)) end = definition.indexOf("*/", end) + 2;
    else break;
  }
  const fnJs = definition.slice(hEnd, end);
  // split around each lowered JSX element: odd parts are the kept originals, even parts plain code
  const parts = fnJs.split(/\/\*ss<([\s\S]*?)\*\/[\s\S]*?\/\*ss>\*\//);
  const fn = parts.map((p, i) => (i % 2 ? unesc(p) : uncommentTypes(p))).join("");
  return hdr.h + fn + hdr.t;
}

// Variables of one cell, by any one of their names.
export const cellOfVariable = (name: string): string => name.replace(/^(viewof|type) /, "");

export function decompileModule(definitions: string[]): string {
  return definitions.map(decompileVariable).filter((s): s is string => s !== null).join("\n\n") + "\n";
}

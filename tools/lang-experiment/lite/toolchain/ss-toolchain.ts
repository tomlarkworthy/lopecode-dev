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
// which of those some cell takes as Events<T>, and which cells the checker accepted (only those are
// memoised; null, as for a cell compiled on its own, memoises none). compileModule works it out.
// facts: each cell's facts (facts.ts) when a check result supplied them, so compileCell does not parse
// for them again.
// why: for each cell the check did not accept, the checker's messages. With a module context (accepted
// not null) such a cell compiles to a definition that only raises them; its body never runs.
export type Context = { generators: ReadonlySet<string>; events: ReadonlySet<string>; accepted: ReadonlySet<string> | null; facts?: ReadonlyMap<string, CellInfo> | null; why?: ReadonlyMap<string, string[]> | null };
const NO_CONTEXT: Context = { generators: new Set(), events: new Set(), accepted: null };
const NO_MEMO_CAPS = new Set(["now", "random", "fetch", "log"]);

export function contextOf(texts: string[], tsx: boolean, accepted: ReadonlySet<string> | null = null): Context {
  const infos = texts.flatMap((t) => { try { return cellsOf(tsx ? lowerJsx(t) : t); } catch { return []; } });
  return contextOfFacts(infos, accepted);
}
function contextOfFacts(infos: Iterable<CellInfo>, accepted: ReadonlySet<string> | null, facts: ReadonlyMap<string, CellInfo> | null = null, why: ReadonlyMap<string, string[]> | null = null): Context {
  const list = [...infos];
  const generators = new Set(list.filter((c) => c.generator).map((c) => c.name));
  const events = new Set(list.flatMap((c) => c.params.filter((p) => p.eventsTyped && generators.has(p.name)).map((p) => p.name)));
  return { generators, events, accepted, facts, why };
}
// the cells a check result accepts: ok, with no errors. Only these run, and only these are memoised.
type CheckCell = { name: string; status: string; errors: { rule: string; msg: string }[]; unsupported?: { msg: string }[]; blockedBy?: string[]; value?: string };
type CheckLike = { cells: CheckCell[]; facts?: ReadonlyMap<string, CellInfo>; unparsed?: ReadonlyMap<string, string> };
export const acceptedOf = (result: CheckLike) => new Set(result.cells.filter((c) => c.status === "ok" && !c.errors.length && !result.unparsed?.has(c.name)).map((c) => c.name));
// a cell's own reasons for not being accepted, without line numbers (a line added above must not change them)
export function whyOf(result: CheckLike, c: CheckCell): string[] {
  const parseMsg = result.unparsed?.get(c.name);
  if (parseMsg !== undefined) return [`[parse] ${parseMsg}`];
  const out = [...c.errors.map((e) => `[${e.rule}] ${e.msg}`), ...(c.unsupported ?? []).map((u) => `[unsupported] ${u.msg}`)];
  if (!out.length && c.blockedBy?.length) out.push(`[blocked] ${c.blockedBy.join(", ")} has no usable type`);
  if (!out.length) out.push(`[${c.status}] not accepted by the checker`);
  return out;
}
// the same context as contextOf over the module's texts, from one check of the whole module
export function contextFromCheck(result: CheckLike, _source?: string, _tsx = true): Context {
  if (!result.facts) throw new Error("this check result carries no cell facts");
  const accepted = acceptedOf(result);
  const why = new Map(result.cells.filter((c) => !accepted.has(c.name)).map((c) => [c.name, whyOf(result, c)] as const));
  return contextOfFacts(result.facts.values(), accepted, result.facts, why);
}

// The editor's three states of a cell: ok; rejected (the checker does not accept the cell itself, or it
// does not parse); blocked (accepted, but a cell it takes is not ok, so it cannot run).
export type CellState = { state: "ok" | "rejected" | "blocked"; why: string[]; blockedBy: string[] };
export function cellStates(result: CheckLike): Map<string, CellState> {
  const accepted = acceptedOf(result);
  const out = new Map<string, CellState>();
  const names = new Set(result.cells.map((c) => c.name));
  for (const c of result.cells) {
    // the checker's own "blocked": no message of its own, but a cell it takes has no usable type
    const by = c.status === "blocked" && !c.errors.length && !c.unsupported?.length && !result.unparsed?.has(c.name) ? (c.blockedBy ?? []).filter((n) => names.has(n)) : [];
    out.set(c.name, accepted.has(c.name) ? { state: "ok", why: [], blockedBy: [] } : by.length ? { state: "blocked", why: [], blockedBy: by } : { state: "rejected", why: whyOf(result, c), blockedBy: [] });
  }
  const takes = new Map([...(result.facts?.values() ?? [])].map((f) => [f.name, f.params.map((p) => p.name).filter((n) => out.has(n) && n !== f.name)] as const));
  for (let changed = true; changed; ) {
    changed = false;
    for (const [name, st] of out) {
      if (st.state === "rejected") continue;
      const by = [...new Set([...(takes.get(name) ?? []).filter((n) => out.get(n)!.state !== "ok"), ...(accepted.has(name) ? [] : st.blockedBy)])];
      if (by.length && (st.state !== "blocked" || by.join() !== st.blockedBy.join())) { out.set(name, { state: "blocked", why: [], blockedBy: by }); changed = true; }
    }
  }
  return out;
}

// The name a cell's text declares, read without parsing it (it may not parse).
export const declaredName = (text: string): string | null => /^(?:\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*export\s+(?:(?:const|let)\s+|(?:async\s+)?function\s*\*?\s*)([\w$]+)/.exec(text)?.[1] ?? null;
// A cell the checker does not accept: its typed source is kept whole in the header, and the definition
// only raises the checker's messages. A ref cell keeps its two variables, so its readers stay wired.
function rejectedCell(text: string, name: string, why: string[], ref: boolean): Variable[] {
  const definition = `(${SS}) => ${LANG}${header({ d: text, rejected: why })}${SS}.rejected(${JSON.stringify(name)}, ${JSON.stringify(why)})`;
  if (!ref) return [{ name, inputs: [STDLIB_INPUT], definition }];
  return [
    { name, inputs: [handleName(name), STDLIB_INPUT], definition: `(_, ${SS}) => ${LANG}${PROJECTION}${SS}.refValues(_)` },
    { name: handleName(name), inputs: [STDLIB_INPUT], definition },
  ];
}

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

// With a module context, a cell that does not parse, does not compile, or that the check did not accept
// compiles to rejectedCell; with none (a cell compiled on its own) those throw, as before.
export function compileCell(text: string, tsx: boolean, ctx: Context = NO_CONTEXT, nameHint: string | null = null): Variable[] {
  if (!ctx.accepted) return compileChecked(text, tsx, ctx);
  let out: Variable[];
  try { out = compileChecked(text, tsx, ctx); } catch (e) {
    const name = declaredName(text) ?? nameHint;
    if (!name) throw e;
    return rejectedCell(text, name, ctx.why?.get(name) ?? [`[compile] ${(e as Error).message}`], false);
  }
  const main = out.find((v) => !v.name.startsWith("viewof ") && !v.name.startsWith("type ")) ?? out[0];
  if (main.name.startsWith("type ") || ctx.accepted.has(main.name)) return out;
  return rejectedCell(text, main.name, ctx.why?.get(main.name) ?? ["[rejected] not accepted by the checker"], out.length === 2);
}

function compileChecked(text: string, tsx: boolean, ctx: Context): Variable[] {
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
  // a cell that calls on(...) is a listener: the checker allows on(...) only as the cell's whole value
  const kind = info.returnsRef ? "ref" : info.generator && ctx.events.has(info.name) ? "events" : used.includes("on") ? "listener" : "cell";
  // hidden inputs: invalidation for an events or listener cell (its generator stops, or its listener
  // ends, when it runs again), and the refs of its compile(...) calls (it re-runs, and returns new
  // functions, when one changes)
  const hidden: string[] = [];
  const hiddenInputs: string[] = [];
  if ((kind === "events" || kind === "listener") && !params.includes("invalidation")) { hidden.push("$ss$inv"); hiddenInputs.push("invalidation"); }
  const inv = params.includes("invalidation") ? "invalidation" : hidden.includes("$ss$inv") ? "$ss$inv" : "null";
  const refs = [...new Set(info.compiles.flatMap((s) => s.refs))];
  const refArgs = refs.map((r, i) => { hidden.push(`$ss$r${i}`); hiddenInputs.push(r); return `${JSON.stringify(r)}: $ss$r${i}`; });
  const args = params.map((p) => (p === "compile" ? `${SS}.compileFor(compile, ${JSON.stringify(info.name)}, {${refArgs.join(", ")}})` : p));
  const memo = (kind === "cell" || kind === "listener") && !info.generator && !!ctx.accepted?.has(info.name) &&
    !info.params.some((p) => NO_MEMO_CAPS.has(p.name) || (ctx.generators.has(p.name) && !p.eventsTyped));
  const inner = `${LANG}${header({ h: text.slice(0, fn.start), t: text.slice(fn.end) })}${typed}`;
  const destructure = used.length ? `const {${used.join(", ")}} = ${SS}; ` : "";
  // id: a hash of the compiled text. The memo is keyed by it, so equal text with equal inputs shares a
  // result (sound for a pure cell) and any edit starts empty.
  const body = `${inner}, [${args.join(", ")}]`;
  const id = contentId(`${kind} ${info.name} ${memo} ${body}`);
  // an events cell's definition is a function, so the runtime's `this` (the variable's last value, its
  // handle) reaches the stdlib, which keeps the handle across runs
  // a ref cell's definition is a named function that passes itself: the stdlib keeps the store per
  // definition object, so a run with the same inputs keeps the state (one module's variable, not
  // every cell with the same text)
  const prev = kind === "events" ? "prev: this, " : kind === "ref" ? `self: ${SS}ref, ` : "";
  const opts = `{kind: ${JSON.stringify(kind)}, name: ${JSON.stringify(info.name)}, memo: ${memo}, ${prev}id: ${JSON.stringify(id)}, invalidation: ${inv}}`;
  const head = `(${[SS, ...params, ...hidden].join(", ")})`;
  const definition = kind === "events" ? `function ${head} { ${destructure}return ${SS}.cell(${body}, ${opts}); }`
    : kind === "ref" ? `function ${SS}ref${head} { ${destructure}return ${SS}.cell(${body}, ${opts}); }`
    : `${head} => { ${destructure}return ${SS}.cell(${body}, ${opts}); }`;
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

// ss_toolchain: SoundScript cells <-> Lopecode runtime variables.
// A compiled cell is ordinary JS whose first comment is /*{lang:"ss"}*/. The typed source is kept in
// it (types as /*ss:...*/ comments, JSX as /*ss<...*/, the text around the function in a /*ss^{...}*/
// header), so decompile recovers the cell exactly from the variable's definition text.
import * as acorn from "acorn";
import { parse, kids, type Node } from "../parse.ts";
import { lowerJsx } from "../jsx/lower.ts";
import { cellsOf, preludeCalls, globalRefs, type CellInfo } from "../facts.ts";
import { commentTypes, langOf, LANG, esc, unesc } from "./comment-types.ts";
import { CAPABILITIES, PRELUDE_FNS, OJS_INPUT_GLOBALS } from "../intrinsics.ts";

export type Variable = { name: string; inputs: string[]; definition: string };
export { langOf, LANG };

// the prelude functions, and h, the JSX element function lowered JSX calls
const PRELUDE = [...PRELUDE_FNS, "h"];
// the runtime module's cells a compiled cell can take: the built-ins its body uses and what its compiled form calls
export const RUNTIME_CELLS = [...PRELUDE, "ref", "events", "listen", "cross", "viewRef", "compileFor", "rejected", "release"];
// A capability parameter or a runtime cell -> the input that provides it: ss_<name>, except invalidation, the
// runtime's own. ss_compile is defined in each module that compiles, because compile reads that module's cells; a
// runtime cell is imported from the runtime module under that name, and the runtime module takes its own cell
// (inputsIn(true)). Context.inputs is the table of the module a cell is compiled for.
export const inputsIn = (runtimeModule: boolean): Record<string, string> =>
  Object.fromEntries([...Object.keys(CAPABILITIES), ...RUNTIME_CELLS].map((n) => [n, n === "invalidation" || (runtimeModule && RUNTIME_CELLS.includes(n)) ? n : `ss_${n}`]));
export const INPUTS = inputsIn(false);

const header = (o: object) => `/*ss^${JSON.stringify(o).replaceAll("*/", "*\\/")}*/`;

function reserved(text: string) {
  for (const m of ["/*ss", LANG]) if (text.includes(m)) throw new Error(`cell source contains the reserved text ${m}`);
}

// lowerJsx keeps each top-level element's source in a /*ss<...*/ comment, escaped in a way that cannot
// hold "*\/"; rewrite each kept original as a JSON string with esc, which unkeep inverts exactly. A JSON
// string holds no line terminator, so after `return` the comment does not end the statement (ASI).
const keep = (s: string) => esc(JSON.stringify(s).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"));
// a kept original: a JSON string, or (compiled before 2026-11-18) the element's text, which starts with <
const unkeep = (s: string) => (s.startsWith('"') ? JSON.parse(unesc(s)) : unesc(s));
function keepJsx(fnSrc: string): string {
  const s = `(${fnSrc})`;
  const originals: string[] = [];
  const visit = (n: Node) => {
    if (n.type === "JSXElement" || n.type === "JSXFragment") { originals.push(s.slice(n.start, n.end)); return; }
    for (const c of kids(n)) visit(c);
  };
  visit(parse(s, { jsx: true }).program);
  let i = 0;
  const out = lowerJsx(s, { keep: true }).replace(/\/\*ss<[\s\S]*?\*\//g, () => `/*ss<${keep(originals[i++])}*/`);
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
    // S1.8: a statement of several declarators is one cell text per declarator, the comments with the first
    const decl = st.type === "ExportNamedDeclaration" ? st.declaration : st;
    const ds: Node[] = decl?.type === "VariableDeclaration" && decl.declarations.length > 1 ? decl.declarations : [];
    if (ds.length) ds.forEach((d, i) => out.push((i ? "" : src.slice(start, st.start)) + src.slice(st.start, decl.declarations[0].start) + src.slice(d.start, d.end) + ";"));
    else out.push(src.slice(start, st.end));
    end = st.end;
  }
  if (P.comments.some((c) => c.start >= end)) throw new Error("a comment after the last cell has no cell to belong to");
  return out;
}

// What one cell's compiled form depends on in the rest of its module: which cells are generators,
// which of those some cell takes as Events<T>, and which cells the checker accepted (null, as for a cell
// compiled on its own, rejects none). compileModule works it out.
// facts: each cell's facts (facts.ts) when a check result supplied them, so compileCell does not parse
// for them again.
// why: for each cell the check did not accept, the checker's messages. With a module context (accepted
// not null) such a cell compiles to a definition that only raises them; its body never runs.
// inputs: the module's input table (inputsIn), INPUTS when not given.
// module: the module's name, which an events or listener cell passes with its own (null when not given).
export type Context = { generators: ReadonlySet<string>; events: ReadonlySet<string>; accepted: ReadonlySet<string> | null; facts?: ReadonlyMap<string, CellInfo> | null; why?: ReadonlyMap<string, string[]> | null; inputs?: Record<string, string>; module?: string | null };
const NO_CONTEXT: Context = { generators: new Set(), events: new Set(), accepted: null };

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
// the cells a check result accepts: ok, with no errors. Only these run.
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
// does not parse); blocked (accepted, but a cell it takes is not ok, so it cannot run), also as State<T>.
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

// The name a cell's text declares and where it is, read with acorn's tokenizer, so a text that does not parse
// has one too: [export] const|let <name>, or [export] [async] function [*] <name>.
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

// A cell's key is the checker's name for it: the declared name, "<name> (2)" for a later declaration of a
// name (core.ts), "type <name>" for a type. Its variable is named so that Observable can name a cell so:
// "$ss$type$<name>" and "$ss$2$<name>"; any other key is its own variable name.
export const variableName = (key: string): string => {
  const dup = /^([\w$]+) \((\d+)\)$/.exec(key);
  return dup ? `$ss$${dup[2]}$${dup[1]}` : key.startsWith("type ") ? `$ss$type$${key.slice(5)}` : key;
};
// the key of a variable, by any of its names (a state cell's viewof <name> too)
export const keyOfVariable = (name: string): string => {
  const n = name.replace(/^viewof /, "");
  const m = /^\$ss\$(type|\d+)\$([\w$]+)$/.exec(n);
  return !m ? n : m[1] === "type" ? `type ${m[2]}` : `${m[2]} (${m[1]})`;
};
// A state cell is the pair Observable makes of `viewof <name> = …`: viewof <name> holds the handle a State<T>
// parameter takes (a view: its value is the state, and it tells of each commit with an input event), <name> is
// Observable's own Generators.input of it.
// a state cell's value variable: the definition the standard compiler gives the value of a viewof cell
export const STATE_VALUE = "(G, _) => G.input(_)";
export const handleName = (key: string) => `viewof ${variableName(key)}`;

// One Observable cell, `[viewof ]<name> = <body>`, and the variables Observable's compiler makes of it.
// body(r) writes the body; r(input) writes a reference to an input and returns how it is spelled: the input's
// name in the cell text, and in the definition the same, except that `viewof x` is a parameter $0, $1, … The
// inputs are the references in order of first use, as the compiler lists them.
type Built = { text: string; vars: Variable[] };
function ojsCell(name: string, view: boolean, block: boolean, body: (r: (input: string) => string) => string): Built {
  const order: string[] = [];
  const text = body((i) => { if (!order.includes(i)) order.push(i); return i; });
  const dollar = new Map(order.filter((i) => i.startsWith("viewof ")).map((i, k) => [i, `$${k}`]));
  const js = body((i) => dollar.get(i) ?? i);
  const definition = `function _${name}(${order.map((i) => dollar.get(i) ?? i).join(",")}) ${block ? js : `{return (${js});}`}`;
  const own = { name: view ? `viewof ${name}` : name, inputs: order, definition };
  return { text: `${own.name} = ${text}`, vars: view ? [own, { name, inputs: ["Generators", own.name], definition: STATE_VALUE }] : [own] };
}

// A cell the checker does not accept: its typed source is kept whole in the header, and the definition
// only raises the checker's messages, after releasing its last value (this): a listener or events it held ends.
// A state cell keeps its two variables, so its readers stay wired.
const rejectedCell = (text: string, key: string, why: string[], ref: boolean, IN: Record<string, string>): Built =>
  ojsCell(variableName(key), ref, false, (r) => `${r(IN.rejected)}(${LANG}${header({ d: text, rejected: why })}${JSON.stringify(key)}, ${JSON.stringify(why)}, ${r(IN.release)}(this))`);

// A name declared again is stored as "<name> (2)", "<name> (3)", ... (core.ts reports it so).
export const isDuplicateKey = (key: string | null): key is string => !!key && /^[\w$]+ \(\d+\)$/.test(key);
// With a module context, a cell that does not parse, does not compile, or that the check did not accept
// compiles to rejectedCell; with none (a cell compiled on its own) those throw, as before.
// nameHint names a variable whose name is declared again, and it compiles to the checker's messages under that name.
export const compileCell = (text: string, tsx: boolean, ctx: Context = NO_CONTEXT, nameHint: string | null = null): Variable[] => build(text, tsx, ctx, nameHint).vars;
// the same cell as Observable cell text: Observable's compiler makes compileCell's variables of it
export const compileCellText = (text: string, tsx: boolean, ctx: Context = NO_CONTEXT, nameHint: string | null = null): string => build(text, tsx, ctx, nameHint).text;
function build(text: string, tsx: boolean, ctx: Context, nameHint: string | null): Built {
  if (!ctx.accepted) return compileChecked(text, tsx, ctx);
  const IN = ctx.inputs ?? INPUTS;
  if (isDuplicateKey(nameHint) && ctx.why?.has(nameHint) && declaredName(text) !== nameHint) return rejectedCell(text, nameHint, ctx.why.get(nameHint)!, false, IN);
  let out: Built & { key?: string; ref?: boolean };
  try { out = compileChecked(text, tsx, ctx); } catch (e) {
    const name = declaredName(text) ?? nameHint;
    if (!name) throw e;
    return rejectedCell(text, name, ctx.why?.get(name) ?? [`[compile] ${(e as Error).message}`], false, IN);
  }
  if (!out.key || ctx.accepted.has(out.key)) return out;
  return rejectedCell(text, out.key, ctx.why?.get(out.key) ?? ["[rejected] not accepted by the checker"], !!out.ref, IN);
}

function compileChecked(text: string, tsx: boolean, ctx: Context): Built & { key?: string; ref?: boolean } {
  reserved(text);
  const P = parse(text, { jsx: tsx });
  if (P.program.body.length !== 1) throw new Error("a cell is exactly one top-level statement");
  const st: Node = P.program.body[0];
  const d: Node | null = st.type === "ExportNamedDeclaration" ? st.declaration : st;
  if (d && /^TS(TypeAlias|Interface)Declaration$/.test(d.type)) {
    return ojsCell(variableName(`type ${d.id.name}`), false, false, () => `void ${LANG}${header({ d: text })}0`);
  }
  let fn: Node | null = null;
  // with or without `export`
  if (d?.type === "FunctionDeclaration") fn = d;
  else if (d?.type === "VariableDeclaration" && d.kind !== "var" && d.declarations.length === 1 &&
    /^(Arrow)?FunctionExpression$/.test(d.declarations[0].init?.type ?? "")) fn = d.declarations[0].init;
  if (d?.type === "VariableDeclaration" && d.declarations.length > 1) throw new Error(`one editor cell holds one cell; write ${d.declarations.map((x: Node) => x.id?.name).join(" and ")} as separate cells`);
  if (!fn) throw new Error(`unsupported top-level statement (${st.type}); a cell is a top-level function, const or let`);

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
  const loweredFn = parse(`(${lowered})`).program;
  const IN = ctx.inputs ?? INPUTS;
  // the built-ins the body calls or reads: free references only, not a property, a key or a local of that name.
  // Each is bound to its input at the top of the definition, unless its input has its own name (the runtime module)
  const used = PRELUDE.filter((n) => globalRefs(loweredFn, n).size > 0);
  const bound = used.filter((n) => IN[n] !== n);
  // the allowed globals Observable's parser does not know, and built-ins read by their own name, are inputs, in order of first use
  const globals = [...OJS_INPUT_GLOBALS, ...used.filter((n) => IN[n] === n)].map((g) => [g, Math.min(...[...globalRefs(loweredFn, g)].map((n) => n.start))] as const).filter(([, at]) => at < Infinity).sort((a, b) => a[1] - b[1]).map(([g]) => g);
  // a cell that calls the prelude's on(...) is a listener: the checker allows on(...) only as the cell's whole value
  const kind = info.returnsRef ? "ref" : info.generator && ctx.events.has(info.name) ? "events" : preludeCalls(fn, "on").size ? "listener" : "cell";
  const refs = [...new Set(info.compiles.flatMap((s) => s.refs))];
  const inner = `${LANG}${header({ h: text.slice(0, fn.start), t: text.slice(fn.end) })}${typed}`;
  // a parameter's argument, r spelling each input. A State<T> parameter takes the handle variable; a
  // capability the variable that provides it; compile, compileFor over ss_compile with the refs of its calls
  // (it re-runs, and returns new functions, when one changes). A cell in another language crosses checked
  // (boundary.ts): its value as a frozen copy; as a State, the value of its viewof (a view, or an imported
  // state cell's handle), with each written value checked.
  const arg = (p: CellInfo["params"][number], r: (i: string) => string) => {
    const input = p.refTyped ? `viewof ${p.name}` : Object.hasOwn(CAPABILITIES, p.name) ? IN[p.name] : p.name;
    if (p.name === "compile") return `${r(IN.compileFor)}(${r(input)}, ${JSON.stringify(info.name)}, {${refs.map((x) => `${JSON.stringify(x)}: ${r(x)}`).join(", ")}})`;
    if (!p.boundary) return r(input);
    const shape = JSON.stringify(p.boundary.shape);
    return p.boundary.ref ? `${r(IN.viewRef)}(${r(input)}, ${shape}, ${JSON.stringify(p.name)})` : `${r(IN.cross)}(${r(input)}, ${shape}, ${JSON.stringify(`${info.name}.${p.name}`)})`;
  };
  const args = (r: (i: string) => string) => info.params.map((p) => arg(p, r)).join(", ");
  const name = JSON.stringify(info.name);
  // the cell's expression, written in text order so the inputs are listed in order of first use. A state cell
  // passes this, the variable's last value (the handle), so the stdlib keeps the handle across runs; an events or
  // listener cell passes its module's name and takes invalidation (cells.ts events, listen).
  // Any other cell is its function applied to its inputs.
  const mod = JSON.stringify(ctx.module ?? null);
  const expr = (r: (i: string) => string) => {
    if (kind === "ref" || kind === "events") {
      const head = `${r(IN[kind])}(${kind === "ref" ? "this" : mod}, ${name}, [${args(r)}], `;
      globals.forEach(r);
      return `${head}${inner}${kind === "events" ? `, ${r("invalidation")}` : ""})`;
    }
    const listen = kind === "listener" ? `${r(IN.listen)}(` : "";
    globals.forEach(r);
    const applied = `(${inner})(${args(r)})`;
    return listen ? `${listen}${applied}, ${name}, ${r("invalidation")}, ${mod})` : applied;
  };
  const block = bound.length > 0;
  const out = ojsCell(variableName(info.name), kind === "ref", block, (r) => block ? `{ const ${bound.map((n) => `${n} = ${r(IN[n])}`).join(", ")}; return ${expr(r)}; }` : expr(r));
  return { ...out, key: info.name, ref: kind === "ref" };
}

export function compileModule(src: string, tsx: boolean, accepted: ReadonlySet<string> | null = null): Variable[] {
  const texts = splitCells(src, tsx);
  const ctx = contextOf(texts, tsx, accepted);
  return texts.flatMap((c) => compileCell(c, tsx, ctx));
}

// A compiled definition, parsed once: the marker and header comments, the function that follows them, and the
// call that takes it: its function applied to its inputs (inside listen for a listener), or ref, events or
// rejected (whose first argument, the key, follows the header), each called by its input (ss_ref, or the runtime
// module's own ref). callee names that shape: "plain" when nothing outside the function reads a runtime cell,
// "apply" when something does (a built-in bound to its input, or an input that crosses).
// name: the cell name ref, events or listen is given. null for a definition that is not SoundScript.
// Remembered per definition text.
export type Shape = "plain" | "apply" | "listen" | "ref" | "events" | "rejected";
export type Compiled = { comments: acorn.Comment[]; header: Record<string, string>; headerEnd: number; call: any; fn: any; callee: Shape | null; name: string | null; refs: string[] };
// the runtime cell a call calls by its input in any module, when it is one of names
const rtCall = (n: any, names: readonly string[]): string | null =>
  n?.type === "CallExpression" && n.callee.type === "Identifier" ? names.find((x) => n.callee.name === x || n.callee.name === INPUTS[x]) ?? null : null;
// ss_<name> -> the runtime cell name
const RUNTIME_INPUTS = new Map(RUNTIME_CELLS.map((n) => [INPUTS[n], n]));
const children = (n: any) => Object.keys(n).flatMap((k) => { const v = n[k]; return Array.isArray(v) ? v : [v]; }).filter((v) => v && typeof v.type === "string");
const parsedCompiled = new Map<string, Compiled | null>();
export function parseCompiled(definition: string): Compiled | null {
  const hit = parsedCompiled.get(definition);
  if (hit !== undefined) return hit;
  let out: Compiled | null = null;
  if (langOf(definition) === "ss") {
    const comments: acorn.Comment[] = [];
    const root = acorn.parseExpressionAt(definition, 0, { ecmaVersion: "latest", onComment: comments });
    const at = comments.findIndex((c) => c.type === "Block" && `/*${c.value}*/` === LANG);
    const head = comments[at + 1];
    if (!head || head.start !== comments[at].end || !head.value.startsWith("ss^")) throw new Error("SoundScript variable without a header comment");
    // the call whose callee or argument starts where the header ends, and the node around that call
    let call: any = null, fn: any = null, up: any = null;
    const find = (n: any, parent: any) => {
      if (fn) return;
      if (n.type === "CallExpression") {
        const a = n.callee.start === head.end ? n.callee : n.arguments.find((x: any) => x.start === head.end);
        if (a) { call = n; fn = a; up = parent; return; }
      }
      for (const c of children(n)) find(c, n);
    };
    find(root, null);
    // outside the function: does anything read a runtime cell, and the names in compileFor(input, "name", {"ref": ref, ...})
    let ss = false;
    const refs: string[] = [];
    const scan = (n: any) => {
      if (n === fn) return;
      if ((n.type === "Identifier" && RUNTIME_INPUTS.has(n.name)) || rtCall(n, ["cross", "viewRef", "compileFor"])) ss = true;
      if (rtCall(n, ["compileFor"]) && n.arguments[2]?.type === "ObjectExpression")
        for (const p of n.arguments[2].properties) if (p.type === "Property" && p.key.type === "Literal") refs.push(String(p.key.value));
      for (const c of children(n)) scan(c);
    };
    scan(root);
    // a type cell's marker opens no call (void /*…*/0): its header holds its source
    const listen = call && fn === call.callee && rtCall(up, ["listen"]) && up.arguments[0] === call ? up : null;
    const callee = (!call ? null : fn === call.callee ? (listen ? "listen" : ss ? "apply" : "plain") : rtCall(call, ["ref", "events", "rejected"])) as Shape | null;
    const named = (listen ?? (callee === "ref" || callee === "events" ? call : null))?.arguments[1];
    out = { comments, header: JSON.parse(head.value.slice(3)), headerEnd: head.end, call, fn, callee, name: named?.type === "Literal" && typeof named.value === "string" ? named.value : null, refs };
  }
  if (parsedCompiled.size > 4096) parsedCompiled.delete(parsedCompiled.keys().next().value!);
  parsedCompiled.set(definition, out);
  return out;
}
// what a compiled definition is: its shape (Compiled callee) and its kind, "cell" (plain or apply), "listener",
// "ref", "events", or null for a rejected cell; with its compile refs. null for any other definition
const KINDS: Record<Shape, string | null> = { plain: "cell", apply: "cell", listen: "listener", ref: "ref", events: "events", rejected: null };
export const compiledKind = (definition: string): { callee: Shape; kind: string | null; refs: string[] } | null => {
  const p = parseCompiled(definition);
  return p?.callee ? { callee: p.callee, kind: KINDS[p.callee], refs: p.refs } : null;
};
// The cell source a variable holds; null for a variable that is not SoundScript or is a generated part of a cell.
// The source is in the comments and the function that follow the marker, whatever wraps the call around them
// (the compiler's definition, Observable's own, or the cell text).
export function decompileVariable(definition: string): string | null {
  const p = parseCompiled(definition);
  if (!p) return null;
  if (typeof p.header.d === "string") return p.header.d;
  if (!p.fn) throw new Error("SoundScript variable whose marker opens no call");
  // the function, and the comments that close it: a JSX element or a type (`x as T`, `x!`) that ends an
  // arrow body closes after the function node does
  let end = p.fn.end;
  for (const c of p.comments) if (c.start === end && c.type === "Block" && (c.value === "ss>" || c.value.startsWith("ss:"))) end = c.end;
  // the text between the header and end, each kept comment put back: /*ss:T*/ is T, and /*ss<E*/…/*ss>*/
  // (a lowered JSX element) is the element E
  let out = "", at = p.headerEnd, inJsx = false;
  for (const c of p.comments) {
    if (c.start < p.headerEnd || c.end > end || c.type !== "Block") continue;
    if (inJsx) { if (c.value === "ss>") { inJsx = false; at = c.end; } continue; }
    if (c.value.startsWith("ss<")) { out += definition.slice(at, c.start) + unkeep(c.value.slice(3)); inJsx = true; }
    else if (c.value.startsWith("ss:")) { out += definition.slice(at, c.start) + unesc(c.value.slice(3)); at = c.end; }
  }
  return p.header.h + out + definition.slice(at, end) + p.header.t;
}

// Variables of one cell, by any one of their names: the cell's name (a type's own name)
export const cellOfVariable = (name: string): string => keyOfVariable(name).replace(/^type /, "");

export function decompileModule(definitions: string[]): string {
  return definitions.map(decompileVariable).filter((s): s is string => s !== null).join("\n\n") + "\n";
}

// An Observable JavaScript cell as SoundScript text, from the variables the standard compiler makes of it
// ({name, inputs, definition}): `const <name> = (<inputs>) => <body>;`, the body sliced verbatim from the
// definition. expression: whether the cell's body is an expression (the parser's cell.body), which the
// definition cannot tell from `{return (x);}`; when not given, that form is read as an expression.
// A cell that does not translate gives {reason}.
type Translated = { text: string } | { reason: string };
const isIdentifier = (s: string) => s.length > 0 && acorn.isIdentifierStart(s.codePointAt(0)!, true) && [...s].slice(1).every((c) => acorn.isIdentifierChar(c.codePointAt(0)!, true));
// `this` or `arguments` read by the cell's own function: an arrow would read its surroundings' instead
function ownThis(n: any): string | null {
  if (!n || typeof n.type !== "string") return null;
  if (n.type === "ThisExpression") return "this";
  if (n.type === "Identifier" && n.name === "arguments") return "arguments";
  if (n.type === "FunctionExpression" || n.type === "FunctionDeclaration" || n.type === "ClassBody") return null;
  for (const k in n) {
    if (k === "type" || k === "start" || k === "end") continue;
    const v = n[k];
    const hit = Array.isArray(v) ? v.reduce((h: string | null, x: any) => h ?? ownThis(x), null) : ownThis(v);
    if (hit) return hit;
  }
  return null;
}
export function fromObservableVariables(vars: { name: string | null; inputs: string[]; definition: string }[], opts: { expression?: boolean } = {}): Translated {
  if (!vars.length) return { reason: "the text compiles to no variable" };
  const names = vars.map((v) => v.name ?? "");
  if (names.some((n) => n.startsWith("viewof "))) return { reason: "a viewof cell has no SoundScript form" };
  if (names.some((n) => n.startsWith("mutable ") || n.startsWith("initial "))) return { reason: "a mutable cell has no SoundScript form" };
  if (names.some((n) => n.startsWith("module ")) || vars.some((v) => v.inputs.includes("@variable"))) return { reason: "an import has no SoundScript form" };
  if (vars.length !== 1) return { reason: `the text compiles to ${vars.length} variables; a SoundScript cell is one` };
  const [{ name, inputs, definition }] = vars;
  if (!name) return { reason: "an anonymous cell has no SoundScript form; a SoundScript cell is named" };
  if (!isIdentifier(name)) return { reason: `the cell name ${name} is not an identifier` };
  const bad = inputs.find((i) => !isIdentifier(i));
  if (bad) return { reason: `the cell takes ${bad}, which a SoundScript parameter cannot name` };
  const rt = inputs.find((i) => RUNTIME_INPUTS.has(i));
  if (rt) return { reason: `the cell takes ${rt}, the input compiled SoundScript cells take for the runtime's ${RUNTIME_INPUTS.get(rt)}` };
  const cap = inputs.find((i) => Object.hasOwn(CAPABILITIES, i) && INPUTS[i] !== i);
  if (cap) return { reason: `the cell takes ${cap}, which as a SoundScript parameter is the ${cap} capability` };
  let fn: any;
  try { fn = acorn.parseExpressionAt(definition, 0, { ecmaVersion: "latest", preserveParens: true }); } catch (e) { return { reason: `the definition does not parse: ${(e as Error).message}` }; }
  if (fn.end !== definition.length || !/^(Arrow)?FunctionExpression$/.test(fn.type)) return { reason: "the definition is not a function" };
  if (fn.params.length !== inputs.length || fn.params.some((p: any, i: number) => p.type !== "Identifier" || p.name !== inputs[i])) return { reason: "the definition's parameters are not its inputs" };
  const own = ownThis(fn.body);
  if (own) return { reason: `the definition reads ${own}, which a SoundScript cell's arrow function does not have` };
  const head = `const ${name} = ${fn.async ? "async " : ""}`;
  const params = `(${inputs.join(", ")})`;
  const body = fn.body;
  // Observable's compiler writes an expression cell as {return (<expression>);}
  const ret = body.type === "BlockStatement" && body.body.length === 1 && body.body[0].type === "ReturnStatement" && body.body[0].argument?.type === "ParenthesizedExpression" ? body.body[0].argument : null;
  const block = fn.generator || (body.type === "BlockStatement" && !(ret && opts.expression !== false));
  const candidates: string[] = [];
  if (fn.generator) candidates.push(`${head}function* ${params} ${definition.slice(body.start, body.end)};`);
  else if (body.type !== "BlockStatement") candidates.push(`${head}${params} => ${definition.slice(body.start, body.end)};`);
  else if (ret && opts.expression !== false) {
    const inner = definition.slice(ret.start + 1, ret.end - 1);
    candidates.push(`${head}${params} => ${inner};`, `${head}${params} => (${inner});`);
  } else candidates.push(`${head}${params} => ${definition.slice(body.start, body.end)};`);
  let why = "";
  for (const text of candidates) {
    // the text must read back as one const of a function whose body is the slice, not a reparse that
    // took the slice apart (an object literal read as a block)
    try {
      const st = parse(text, { jsx: true }).program.body;
      const init = st.length === 1 && st[0].type === "VariableDeclaration" && st[0].declarations.length === 1 ? st[0].declarations[0].init : null;
      const want = fn.generator ? "FunctionExpression" : "ArrowFunctionExpression";
      if (init?.type === want && (init.body.type === "BlockStatement") === block && st[0].end === text.length) return { text };
      why = "it reads back as a different cell";
    } catch (e) { why = (e as Error).message; }
  }
  return { reason: `the translation does not parse as SoundScript: ${why}` };
}

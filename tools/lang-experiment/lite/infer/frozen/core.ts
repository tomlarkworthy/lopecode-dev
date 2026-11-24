// FROZEN FIXTURE (2026-11-21, switch3): the TypeScript checker as it was before checkSources ran the cells. Read by
// lite/infer/diff.ts, lite/infer/complete-diff.ts, lite/syntax.test.ts and selfhost/checker-shape, checker-survey;
// nothing shipped imports it, and the build does not reach it.
// Changed since: fnKept asks ch.mayHoldFn (S11.9 fix, 2026-11-21 review4), as md-value's mdKept asks ixMayHoldFn.
// Changed since: [mut-cell] on each injected type and, as a backstop, on the value (holes step 2, 2026-11-22), as
// md-inject's mdInject and md-value's mdValueRules with md-cell's mdKeep.
// DELIBERATE CHANGE (2026-11-22, holes8): [compile-boundary]'s uncloneableWith is imported from the live types.ts
// (walks.ss.ts), so this fixture took its change with it: a type argument (Map<string, () => number>), an open type
// (unknown, object, a type parameter) and nesting deeper than 8 are now uncloneable. 0 rule-count changes on
// diff.ts --module-only.
// The lite checker without file access: module shape, syntax bans, injection, a per-cell type
// check (infer.ts) and the ownership rules (own.ts). Each cell ends ok, rejected, unsupported (a
// construct lite does not model) or blocked (a dependency has no usable type).
import { parse, type Node, type Parsed } from "./ts/parse.ts";
import { Registry } from "./ts/registry.ts";
import { Checker } from "./infer.ts";
import { ownership, actionEscapes, iterIn, mutIn, stripMut } from "./own.ts";
import { type Ty, ERR, UNKNOWN, isNamed, named, show, rec, union, reservedName, RESERVED_MSG, reservedCellName, RESERVED_CELL_MSG, reservedText, RESERVED_TEXT_MSG, captureMessage, uncloneableWith, admitsUndefinedWith, holdsWith, hasErrWith, forgotWith } from "../../types.ts";
// DELIBERATE CHANGE (2026-11-24, d1): the prelude names a compiled cell binds, from the toolchain's own cell (F)
import { PRELUDE_HOME } from "../../intrinsics.ts";
import { tcPrelude } from "../../toolchain/tc-index.ts";
import { CAPABILITIES } from "../../intrinsics.ts";
import { island, specOf, compileCalls } from "./ts/island.ts";
import { factsOf, type CellInfo } from "./ts/facts.ts";
import { captures, opaqueCaptures } from "./capture.ts";
import { kids, isFn } from "./ts/parse.ts";
import { boundaryShape, type Shape } from "../../boundary.ts";
import { messageOf } from "../../../prelude.runtime.ts";
import { syntaxCheck, type SyntaxDiag } from "../../acorn/index.ts";
// DELIBERATE CHANGE (2026-11-24, t1): the live checker's md-cell.ss.ts mdJsxH, mdProtoMembers and PROTO_MEMBER_MSG, over this parse
import { RESERVED_INPUTS, PROTO_MEMBERS } from "../../core.ts";
const everyKid = (n: Node): Node[] => { const out: Node[] = []; for (const k in n) { if (k === "loc") continue; const v = n[k]; for (const x of Array.isArray(v) ? v : [v]) if (x && typeof x === "object" && typeof x.type === "string") out.push(x); } return out; };
function jsxHT1(n: Node): Node | null {
  let jsx = false, at: Node | null = null;
  const pat = (p: Node | null | undefined): void => {
    if (!p || at) return;
    if (p.type === "Identifier") { if (p.name === "h") at = p; }
    else if (p.type === "ArrayPattern") for (const x of p.elements) pat(x);
    else if (p.type === "ObjectPattern") for (const x of p.properties) pat(x.type === "RestElement" ? x.argument : x.value);
    else if (p.type === "AssignmentPattern") pat(p.left);
    else if (p.type === "RestElement") pat(p.argument);
  };
  const walk = (x: Node): void => {
    if (x.type === "JSXElement" || x.type === "JSXFragment") jsx = true;
    if (x.type === "VariableDeclarator") pat(x.id);
    if (isFn(x)) { pat(x.id); for (const p of x.params) pat(p); }
    if (x.type === "CatchClause") pat(x.param);
    for (const k of kids(x)) walk(k);
  };
  walk(n);
  return jsx ? at : null;
}
// w1 (F-4): each name bound under n (declarator, function name or parameter, catch parameter) that, parsed alone as an
// expression, is not an Identifier
export function keywordNamesW1(n: Node): Node[] {
  const out: Node[] = [];
  const keyword = (name: string): boolean => { try { const b = parse(`(${name});`).program.body[0]; return b?.type !== "ExpressionStatement" || b.expression.type !== "Identifier"; } catch { return true; } };
  const pat = (p: any): void => {
    if (!p) return;
    if (p.type === "Identifier") { if (keyword(p.name)) out.push(p); }
    else if (p.type === "ObjectPattern") { for (const x of p.properties) pat(x.type === "Property" ? x.value : x.type === "RestElement" ? x.argument : null); }
    else if (p.type === "ArrayPattern") { for (const x of p.elements) pat(x); }
    else if (p.type === "AssignmentPattern") pat(p.left);
    else if (p.type === "RestElement") pat(p.argument);
  };
  const walk = (x: any): void => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) { for (const y of x) walk(y); return; }
    if (typeof x.type !== "string") return;
    if (x.type === "VariableDeclarator") pat(x.id);
    if (x.type === "CatchClause") pat(x.param);
    if (x.type === "FunctionDeclaration" || x.type === "FunctionExpression" || x.type === "ArrowFunctionExpression") { pat(x.id); for (const q of x.params) pat(q); }
    for (const k of Object.keys(x)) if (k !== "loc") walk(x[k]);
  };
  walk(n);
  return out;
}
// DELIBERATE CHANGE (2026-11-24, w1, Step 2): any member so named, optional or not, and an object literal's key (live mdProtoMembers)
export function protoMembersT1(n: Node): { at: Node; name: string; opt: boolean }[] {
  const out: { at: Node; name: string; opt: boolean }[] = [];
  const nameOf = (k: Node): string | null => (k.type === "Identifier" ? k.name : k.type === "Literal" && typeof k.value === "string" ? k.value : null);
  const walk = (x: Node): void => {
    if (x.type === "TSPropertySignature" || x.type === "TSMethodSignature") {
      const name = x.computed === true ? null : nameOf(x.key);
      if (name !== null && (name === "__proto__" || PROTO_MEMBERS.has(name))) out.push({ at: x, name, opt: name !== "__proto__" });
    }
    if (x.type === "ObjectExpression") for (const p of x.properties) if (p.type === "Property" && !p.computed) { const name = nameOf(p.key); if (name !== null && name !== "__proto__" && PROTO_MEMBERS.has(name)) out.push({ at: p, name, opt: true }); }
    for (const k of everyKid(x)) walk(k);
  };
  walk(n);
  return out;
}
export const protoMsgT1 = (name: string, opt: boolean) => opt
  ? `${name} may not be a member's name: it is a member of Object.prototype or one a conversion calls (a template string, +, ==, String(), JSON.stringify, join, sort and await call toString, valueOf, toJSON and then), so a conversion would run a value's own ${name} or read the inherited one; give the member another name`
  : `__proto__ may not be declared as a member: it is the object's prototype, not a member; give the member another name`;

export type LiteError = { rule: string; line: number; msg: string };
export type LiteCell = {
  name: string; status: "ok" | "rejected" | "unsupported" | "blocked"; line: number;
  errors: LiteError[]; unsupported: LiteError[]; blockedBy: string[]; value?: string;
};
// facts: per cell, what the compiler needs (facts.ts), from this check's parse. Not enumerable, so a
// result prints and compares as before.
export type LiteResult = { port: string; file: string; ok: boolean; module: LiteError[]; cells: LiteCell[]; ms: number; readonly facts?: ReadonlyMap<string, CellInfo> };

type CellDef = { name: string; fn: Node; stmt: Node; bans: readonly SyntaxDiag[] };

// outside: the module's cells in other languages (Observable JavaScript, raw), by name; view when the
// module also has `viewof <name>` (an Observable JavaScript view, or a SoundScript state cell imported with its
// viewof). A SoundScript cell takes one through an annotated parameter (boundary.ts).
export type Outside = { name: string; view?: boolean };
// DELIBERATE CHANGE (2026-11-24, d1): home, the identity of the module the cells are in (F)
export type Sources = { cells: string; tsx?: boolean; foreign?: string | null; shell?: string | null; name?: string; outside?: readonly Outside[] | null; home?: string | null };
// per parameter that names an outside cell: its value's shape, and whether it is taken as State (its viewof)
export type Boundary = { shape: Shape; ref: boolean };

// Browser-safe: no file system. check.ts checkPort reads a port directory and calls this.
// onCell: each cell's checker before it runs, so a caller can set hooks on it (completion)
export function checkSources(src: Sources, opts: { strictIndex?: boolean; onCell?: (name: string, ch: Checker, fn: Node) => void } = {}): LiteResult {
  const t0 = performance.now();
  const dir = src.name ?? "cells";
  const reg = new Registry();
  reg.strictIndex = opts.strictIndex ?? true;
  const moduleErrs: LiteError[] = [];
  const tsx = !!src.tsx;
  const cellsSrc = src.cells;
  // a name declared again is checked under a stand-in name of the same length (distinctNames), so the
  // first declaration keeps the name and the rest are rejected as duplicate-cell
  const { P, dups } = distinctNames(cellsSrc, tsx);
  const mod = (p: Parsed, n: Node, rule: string, msg: string) => moduleErrs.push({ rule, line: p.line(n.start), msg });
  // conversion problems while loading foreign.d.ts are module-level (they would otherwise be silent)
  const hasErr = hasErrWith(reg.ops);
  reg.onUnsup = (n, what) => moduleErrs.push({ rule: "unsupported", line: n.loc?.start.line ?? 0, msg: `foreign.d.ts: ${what}` });
  reg.onErr = (n, rule, msg) => moduleErrs.push({ rule, line: n.loc?.start.line ?? 0, msg: `foreign.d.ts: ${msg}` });

  // foreign.d.ts
  const foreignSrc = src.foreign ?? null;
  const foreignNames = new Set<string>();
  if (foreignSrc) {
    const FP = parse(foreignSrc);
    const rest = reg.load(FP, "foreign");
    for (const st of rest) mod(FP, st, "module-level", `foreign.d.ts: ${st.type} is not a declaration`);
    // DELIBERATE CHANGE (2026-11-24, t1, B-1): a banned member declared in foreign.d.ts (live core.ts loadForeign)
    for (const m of protoMembersT1(FP.program)) mod(FP, m.at, "banned-member", `foreign.d.ts: ${protoMsgT1(m.name, m.opt)}`);
    for (const [name, v] of reg.values) if (v.origin === "foreign") {
      foreignNames.add(name);
      if (!v.marker) mod(FP, v.node, "foreign-unmarked", `foreign ${name} has no /** pure */ or /** effect */`);
    }
  }
  // shell.ts: only the exported names
  const shellNames = new Set<string>();
  const shellSrc = src.shell ?? null;
  if (shellSrc) {
    for (const st of parse(shellSrc).program.body) {
      const d = st.type === "ExportNamedDeclaration" ? st.declaration : null;
      if (d?.type === "VariableDeclaration") d.declarations.forEach((x: Node) => x.id.type === "Identifier" && shellNames.add(x.id.name));
      else if (d?.type === "FunctionDeclaration") shellNames.add(d.id.name);
    }
  }
  // cells.ts module level: the cells and module-level errors from syntaxCheck (acorn/syntax.ss.ts), which parses the
  // text again as a typed tree; its nodes are matched to P's by position
  const S = syntaxCheck(cellsSrc, tsx, reg.builtinTypeNames(), shellNames);
  if (!S.ok) throw new Error(`parseTree did not parse what parse.ts did: ${S.message}`);
  const stmtAt = new Map((P.program.body as Node[]).map((st) => [st.start, st] as const));
  const top = (at: { start: number }) => (P.program.body as Node[]).find((st) => st.start <= at.start && at.start < st.end)!;
  // a type or interface with a built-in type's name is not loaded: the cells read the built-in
  const clash = new Set<Node>();
  for (const e of S.shape.clashes) {
    const st = top(e.at);
    clash.add(st.type === "ExportNamedDeclaration" && st.declaration ? st.declaration : st);
    moduleErrs.push({ rule: e.rule, line: P.line(e.at.start), msg: e.msg });
  }
  // DELIBERATE CHANGE (2026-11-24, t1, B-1): a type or interface declaring a banned member is a clash too (live md-shape.ss.ts mdTypeProto)
  for (const st of P.program.body as Node[]) {
    const d = st.type === "ExportNamedDeclaration" && st.declaration ? st.declaration : st;
    if (d.type !== "TSTypeAliasDeclaration" && d.type !== "TSInterfaceDeclaration") continue;
    const m = protoMembersT1(d)[0];
    if (m) { clash.add(d); moduleErrs.push({ rule: "banned-member", line: P.line(d.start), msg: protoMsgT1(m.name, m.opt) }); }
  }
  reg.load(P, "user", true, clash);
  for (const e of S.shape.errors) moduleErrs.push({ rule: e.rule, line: P.line(e.at.start), msg: e.msg });
  const cells: CellDef[] = S.shape.cells.map((c, i) => {
    const stmt = stmtAt.get(c.stmt.start)!;
    return { name: c.name, fn: nodeAt(stmt, c.fn.start, c.fn.end, c.fn.type)!, stmt, bans: S.diags[i]! };
  });
  const cellNames = new Set(cells.map((c) => c.name));

  const outside = new Map((src.outside ?? []).map((o) => [o.name, o] as const));
  // a shell cell's value is unknown to a checked cell, unless the parameter is typed as a function: that crosses as a
  // function from another language does
  const shellFn = (ann: Node | undefined, wrapper: string | null) => !!ann && !wrapper && reg.peek(() => {
    const t = reg.convert(ann, { tps: new Set() }, P);
    return (t.k === "named" && reg.isAlias(t.n) ? reg.expand(t) : t).k === "fn";
  });
  const boundaries = new Map<string, Map<string, Boundary>>();
  const viewTypes = new Map<string, { ty: Ty; cell: string }>();
  const out = new Map<string, LiteCell>();
  for (const c of cells) out.set(c.name, { name: c.name, status: "ok", line: P.line(c.stmt.start), errors: [], unsupported: [], blockedBy: [] });
  const cellOf = (pos: number) => cells.find((c) => c.stmt.start <= pos && pos < c.stmt.end);
  for (const cm of P.comments) if (/@ts-(ignore|expect-error|nocheck)/.test(cm.text)) {
    const c = cellOf(cm.start);
    const e = { rule: "no-ts-ignore", line: P.line(cm.start), msg: "@ts-ignore/@ts-expect-error/@ts-nocheck" };
    if (c) out.get(c.name)!.errors.push(e); else moduleErrs.push(e);
  }
  // DELIBERATE CHANGE (2026-11-23, m1 step 2): [mut-nested], a Mut or typeof type nested in another type (S4.9)
  for (const m of S.mut) {
    const c = cellOf(m.at.start), e = { rule: m.rule, line: P.line(m.at.start), msg: m.msg };
    if (c) out.get(c.name)!.errors.push(e); else moduleErrs.push(e);
  }

  // dependency order; cycles are errors
  const deps = new Map(cells.map((c) => [c.name, c.fn.params.filter((p: Node) => p.type === "Identifier" && cellNames.has(p.name)).map((p: Node) => p.name as string)]));
  // compile(...) names cells as strings; they are checked before the cell that names them.
  for (const c of cells) for (const call of compileCalls(c.fn)) {
    const sp = specOf(call);
    if (sp) deps.get(c.name)!.push(...[...sp.inputs, ...sp.refs, ...sp.outputs].filter((n) => cellNames.has(n)));
  }
  const order: CellDef[] = [];
  const state = new Map<string, number>();
  const byName = new Map(cells.map((c) => [c.name, c]));
  const visit = (n: string, stack: string[]) => {
    if (state.get(n) === 2) return;
    if (state.get(n) === 1) {
      const cyc = stack.slice(stack.indexOf(n));
      for (const x of cyc) out.get(x)!.errors.push({ rule: "cycle", line: out.get(x)!.line, msg: `dependency cycle ${[...cyc, n].join(" -> ")}` });
      return;
    }
    state.set(n, 1);
    for (const d of deps.get(n) ?? []) visit(d, [...stack, n]);
    state.set(n, 2);
    order.push(byName.get(n)!);
  };
  for (const c of cells) visit(c.name, []);

  const value = new Map<string, Ty | null>(); // null: no usable type
  const refInner = new Map<string, Ty>();
  const eventsInner = new Map<string, Ty>(); // generator cells: their yield type
  const OPTIONS = rec({ runtime: named("Pool") }, ["runtime"]);
  // The type of compile({inputs, refs, outputs, options}): (args: {inputs}) => Promise<{outputs}>.
  const compileType = (e: Node, env: any, ch: Checker): Ty => {
    const sp = specOf(e);
    if (!sp) { ch.unsupported(e, "compile takes { inputs, refs, outputs, options } with literal arrays of cell names"); return ERR; }
    if (sp.options) {
      const ot = ch.infer(sp.options, env);
      if (ot.k !== "err" && !reg.sub(ot, OPTIONS)) ch.err(sp.options, "compile-options", `${show(ot)} is not assignable to { runtime?: Pool }`);
    }
    const isl = island(cells.map((c) => ({ name: c.name, params: c.fn.params.map((p: Node) => p.name ?? ""), refCell: refInner.has(c.name) })), sp);
    let bad = false;
    for (const p of isl.problems) { ch.err(e, "compile-island", p.msg); bad = true; }
    for (const n of isl.order) {
      const c = byName.get(n)!;
      if (c.fn.async || c.fn.generator) { ch.err(e, "compile-island", `island cell ${n} is ${c.fn.async ? "async" : "a generator"}; an island runs synchronously`); bad = true; }
      const st = out.get(n)!.status;
      if (st !== "ok" || out.get(n)!.errors.length) { ch.err(e, "compile-island", `island cell ${n} is ${st === "ok" ? "rejected" : st}`); bad = true; }
    }
    const side = (names: string[]) => {
      const props: Record<string, Ty> = {};
      for (const n of names) {
        const t = value.get(n);
        if (t === null || t === undefined) { if (cellNames.has(n)) ch.err(e, "compile-island", `${n} has no usable type`); bad = true; continue; }
        const why = uncloneable(t);
        if (why) { ch.err(e, "compile-boundary", `${n}: ${show(t)} cannot cross to a worker (${why})`); bad = true; }
        props[n] = t;
      }
      return rec(props);
    };
    const args = side(sp.inputs);
    side(sp.refs);
    const res = side(sp.outputs);
    return bad ? ERR : { k: "fn", tps: [], ps: [{ n: "args", t: args, opt: false }], ret: named("Promise", res) };
  };
  const uncloneable = uncloneableWith(reg.ops), admitsUndefined = admitsUndefinedWith(reg.ops), holds = holdsWith(reg.ops);
  // Generator cells some cell takes as Events<T>: the runner gives every reader the handle, so a plain reader is an error.
  const takenAsEvents = new Set<string>(cells.flatMap((c) => (c.fn.params as Node[]).filter((p) => p.typeAnnotation?.typeAnnotation?.type === "TSTypeReference" && p.typeAnnotation.typeAnnotation.typeName.name === "Events").map((p) => p.name as string)));
  // Listener cells: no other cell may take one, so a listener's lifetime is its own cell's value.
  const listenerCells = new Set<string>();
  // State-dependent cells, with the reason: a state cell (its value is state), a generator (its values),
  // a cell taking a capability other than invalidation or log, and any cell taking one of these by value.
  const stateful = new Map<string, string>();
  // Cells that take a function from another language, or a cell that does, with how. Such a cell may not keep a value
  // that may be or hold a function in a state cell or yield one, which an action could then call (S11.9).
  const fnFed = new Map<string, string>();
  const castsOf = new Map<string, Map<number, unknown>>();
  for (const c of order) {
    if (value.has(c.name)) continue;
    const r = out.get(c.name)!;
    const ch = new Checker(reg, cellNames, P);
    ch.compileHook = (e, env) => compileType(e, env, ch);
    opts.onCell?.(c.name, ch, c.fn);
    castsOf.set(c.name, ch.casts);
    const diag = (n: Node, rule: string, msg: string) => r.errors.push({ rule, line: P.line(n.start), msg });
    for (const d of c.bans) if (d.unsup) ch.unsupported(nodeAt(c.fn, d.at.start, d.at.end, d.at.type)!, d.msg); else r.errors.push({ rule: d.rule, line: P.line(d.at.start), msg: d.msg });
    // DELIBERATE CHANGE (2026-11-23, e1): a cell may not be named Generators or invalidation (inputs compiled cells take
    // from the module); ss_… and $ss$… names reach this file through types.ts reservedName, which it imports
    // DELIBERATE CHANGE (2026-11-24, d1): and a prelude name, outside the module that defines the prelude (F)
    if (reservedCellName(c.name)) diag(c.fn, "reserved-name", RESERVED_CELL_MSG(c.name));
    else if (src.home !== PRELUDE_HOME && tcPrelude.includes(c.name)) diag(c.fn, "reserved-name", `${c.name} is reserved as a cell name: it is a prelude name, which a compiled cell that uses it binds from the runtime module, so a cell named ${c.name} clashes with that binding; give the cell another name`);
    // DELIBERATE CHANGE (2026-11-24, t1): a capability or global taken by name (F-1, F-2), a $ in the name, a binding h in a
    // cell with JSX (F-3), and an optional member named after an Object.prototype member or a __proto__ member (B-1)
    else if (RESERVED_INPUTS.has(c.name)) diag(c.fn, "reserved-name", `${c.name} is reserved as a cell name: a compiled cell takes ${c.name} (a capability or a global) by that name from outside the module, so a reader of a cell named ${c.name} gets that and not the cell; give the cell another name`);
    else if (c.name.includes("$")) diag(c.fn, "reserved-name", `${c.name} is reserved as a cell name: a cell name may not hold $, which the runners use in the names they make (a state cell x has a handle x$ref); give the cell another name`);
    const hT1 = jsxHT1(c.stmt);
    if (hT1) diag(hT1, "reserved-name", "h is reserved in a cell with JSX: each JSX element is a call h(...), which a local or parameter named h would take; give it another name");
    for (const m of protoMembersT1(c.stmt)) diag(m.at, "banned-member", protoMsgT1(m.name, m.opt));
    // DELIBERATE CHANGE (2026-11-24, w1, F-4): a name the parser bound that JavaScript reads as a keyword (live mdKeywordNames)
    for (const k of keywordNamesW1(c.stmt)) diag(k, "reserved-name", `${k.name} is reserved: JavaScript reads it as a keyword, so the compiled cell would not parse; give it another name`);
    // DELIBERATE CHANGE (2026-11-23, a9): text the compiler reserves (/*ss, its language mark) is refused at check time (5d)
    const mark = reservedText(P.src.slice(c.stmt.start, c.stmt.end));
    if (mark !== null) diag(c.fn, "reserved-name", RESERVED_TEXT_MSG(c.name, mark));
    // injection
    const injected: Ty[] = [];
    for (const p of c.fn.params as Node[]) {
      if (p.type !== "Identifier") { diag(p, "inject-pattern", "an injected parameter must be a plain identifier"); injected.push(ERR); continue; }
      const name: string = p.name;
      const ann = p.typeAnnotation?.typeAnnotation;
      // State<T> and Events<T> take a handle to a state cell / generator cell, not its value
      if (ann?.type === "TSTypeReference" && (ann.typeName.name === "Source" || ann.typeName.name === "Sub")) {
        diag(p, "inject-events", ann.typeName.name === "Source" ? "Source was renamed Events: type this parameter Events<...>" : "Sub was renamed Listener, and no cell may take a listener");
        injected.push(ERR); continue;
      }
      const wrapper = ann?.type === "TSTypeReference" && (ann.typeName.name === "State" || ann.typeName.name === "Events") ? ann.typeName.name as string : null;
      const handle = wrapper === "State" ? { rule: "inject-state", what: "state cell", inners: refInner, of: (t: Ty) => `of ${show(t)}` }
        : wrapper ? { rule: "inject-events", what: "sync generator cell", inners: eventsInner, of: (t: Ty) => `yielding ${show(isNamed(t, "Events") ? t.args[0] : t)}` } : null;
      let vt: Ty;
      if (cellNames.has(name)) {
        const v = value.get(name);
        if (v === null || v === undefined) { r.blockedBy.push(name); injected.push(ERR); continue; }
        if (handle) {
          const inner = handle.inners.get(name);
          const want = reg.convert(ann, { tps: new Set() }, P);
          // DELIBERATE CHANGE (2026-11-23, e1): an events cell's yields need only be a T
          if (!inner || !(isNamed(want, wrapper!) && reg.sub(inner, want.args[0]) && (wrapper !== "State" || reg.sub(want.args[0], inner)))) diag(p, handle.rule, `${name} is not a ${handle.what} ${handle.of(want)}`);
          injected.push(want);
          continue;
        }
        if (listenerCells.has(name)) { diag(p, "listener-placement", `${name} is a listener; no cell may take one, so it ends only when ${name} runs again`); injected.push(ERR); continue; }
        if (takenAsEvents.has(name)) { diag(p, "inject-events", `${name} is taken as Events elsewhere, so a reader gets the handle; type this parameter Events<...>`); injected.push(ERR); continue; }
        vt = v;
      } else if (foreignNames.has(name)) {
        const fv = reg.values.get(name)!;
        if (fv.marker === "effect") diag(p, "foreign-effect", `checked cell takes /** effect */ foreign ${name}`);
        vt = fv.t;
        const fit = iterIn(vt, reg);
        if (fit) diag(p, "iterator-cell", `foreign ${name}: ${show(vt)} may hold an iterator (${fit}); every cell that takes it would use up the same one`);
      } else if (shellNames.has(name) && !shellFn(ann, wrapper)) vt = UNKNOWN;
      else if (Object.hasOwn(CAPABILITIES, name) && !shellNames.has(name)) vt = named(CAPABILITIES[name]);
      else if (outside.has(name) || shellNames.has(name)) {
        // a cell in another language: the annotation is the type, checked when a value crosses
        if (!ann) { diag(p, "boundary-unannotated", `${name} is a cell in another language; annotate the parameter with the type it must have, e.g. ${name}: number`); injected.push(ERR); continue; }
        if (wrapper === "Events") { diag(p, "boundary-type", `${name} is a cell in another language; it cannot be taken as Events`); injected.push(ERR); continue; }
        if (wrapper === "State" && !outside.get(name)?.view) { diag(p, "boundary-state", `${name} has no viewof; only an Observable JavaScript view, or a SoundScript state cell imported with its viewof, can be taken as State`); injected.push(ERR); continue; }
        const want = reg.convert(ann, { tps: new Set() }, P);
        const inner = wrapper === "State" && isNamed(want, "State") ? want.args[0] : want;
        if (hasErr(inner)) { injected.push(ERR); continue; } // a type lite does not know is reported where it is written
        const shape = boundaryShape(inner, (t) => reg.expand(t), (n) => reg.isAlias(n), wrapper !== "State");
        if ("error" in shape) { diag(p, "boundary-type", `${name}: ${show(inner)} cannot cross from another language: it is or holds ${shape.error}`); injected.push(ERR); continue; }
        if (wrapper === "State") {
          const first = viewTypes.get(name);
          if (first && !(reg.sub(first.ty, inner) && reg.sub(inner, first.ty))) { diag(p, "boundary-state", `viewof ${name} is taken as State<${show(first.ty)}> by ${first.cell}; every State to one view has the same type`); injected.push(ERR); continue; }
          if (!first) viewTypes.set(name, { ty: inner, cell: c.name });
        }
        if (!boundaries.has(c.name)) boundaries.set(c.name, new Map());
        boundaries.get(c.name)!.set(name, { shape, ref: wrapper === "State" });
        injected.push(want);
        continue;
      }
      else { diag(p, "inject-unknown", `parameter ${name} names no cell, foreign or capability`); injected.push(ERR); continue; }
      if (handle) { diag(p, handle.rule, `${name} is not a ${handle.what}`); injected.push(ERR); continue; }
      if (ann) {
        const want = reg.convert(ann, { tps: new Set() }, P);
        const widenBorrow = isNamed(vt, "Borrowed") && !isNamed(want, "Borrowed");
        // DELIBERATE CHANGE (2026-11-24, w1): a failure by the forgetting rule says what was left out (forgotWith)
        const why = widenBorrow || reg.sub(vt, want) ? null : reg.peek(() => forgotWith(reg)(vt, want));
        if (widenBorrow || why !== null || !reg.sub(vt, want)) diag(p, "inject-type", `${name}: ${show(vt)} is not assignable to ${show(want)}${why !== null ? `: ${why}` : ""}`);
        else ch.hides(p, vt, want);
        injected.push(want);
      } else injected.push(vt);
    }
    // holes step 2: an input is never a Mut
    injected.forEach((t, i) => { const mt = mutIn(t, reg); if (mt && c.fn.params[i]?.type === "Identifier") diag(c.fn.params[i], "mut-cell", `input ${c.fn.params[i].name}: ${mt}; an input is never a Mut: the cell it comes from and every other cell that takes it share it`); });
    injected.forEach((t, i) => { if (t.k !== "err" && hasErr(t)) { r.blockedBy.push(`${c.fn.params[i].name} (type not understood)`); } });
    // action-capture: which parameters are state-dependent values, and why
    const tainted = new Map<string, string>();
    for (const p of c.fn.params as Node[]) {
      if (p.type !== "Identifier") continue;
      const ann = p.typeAnnotation?.typeAnnotation;
      const wrapper = ann?.type === "TSTypeReference" ? ann.typeName?.name : null;
      if (wrapper === "State" || wrapper === "Events") continue;
      const name: string = p.name;
      if (cellNames.has(name)) {
        const t = value.get(name);
        if (t && isNamed(t, "Action")) continue;
        if (refInner.has(name)) tainted.set(name, `the value of the state cell ${name}`);
        else if (byName.get(name)?.fn.generator) tainted.set(name, `the latest value of the events cell ${name}`);
        else if (stateful.has(name)) tainted.set(name, `${name} ${stateful.get(name)}`);
      } else if (shellNames.has(name)) tainted.set(name, `a shell cell's value`);
      else if (outside.has(name) && !Object.hasOwn(CAPABILITIES, name)) tainted.set(name, `the value of ${name}, a cell in another language`);
      // log writes nothing the program reads back; invalidation is the cell's own lifetime
      else if (Object.hasOwn(CAPABILITIES, name) && name !== "invalidation" && name !== "log") tainted.set(name, `capability ${name}`);
    }
    const fedBy = (c.fn.params as Node[]).flatMap((p) => p.type !== "Identifier" ? []
      : boundaries.get(c.name)?.get(p.name)?.shape.k === "fn" ? [`takes ${p.name}, a function from another language`]
      : fnFed.has(p.name) ? [`takes ${p.name}, which ${fnFed.get(p.name)}`] : [])[0];
    if (fedBy) fnFed.set(c.name, fedBy);
    const firstTaint = [...tainted.entries()][0];
    if (firstTaint) stateful.set(c.name, firstTaint[1].startsWith("capability ") ? `takes the ${firstTaint[1]}` : `reads ${firstTaint[0]}`);
    if (c.fn.generator) stateful.set(c.name, `is a generator`);
    const viaName = captures(c.fn, tainted);
    for (const cap of viaName) diag(cap.node, "action-capture", captureMessage(cap));
    let fnT: Ty = ERR;
    try {
      fnT = ch.fnExpr(c.fn, null, undefined, { injected });
      for (const e of ownership(c.fn, ch)) ch.err(e.node, e.rule, e.msg);
      for (const e of actionEscapes(c.fn, ch)) ch.err(e.node, e.rule, e.msg);
      for (const cap of opaqueCaptures(c.fn, ch, tainted, new Set(viaName.map((x) => x.node)))) ch.err(cap.node, "action-capture", captureMessage(cap));
      for (const e of memoErrs(c.fn, ch, reg, tainted)) ch.err(e.node, "memo-pure", e.msg);
    } catch (e) {
      ch.unsupported(c.fn, `checker crashed: ${messageOf(e)}`);
    }
    for (const d of ch.diags) r.errors.push({ rule: d.rule, line: P.line(d.node.start), msg: d.msg });
    for (const u of ch.unsup) r.unsupported.push({ rule: "unsupported", line: P.line(u.node.start), msg: u.msg });
    r.errors = dedupe(r.errors);
    r.unsupported = dedupe(r.unsupported);
    const errsBefore = r.errors.length;
    // value type
    let ret = fnT.k === "fn" ? fnT.ret : ERR;
    if (c.fn.async && isNamed(ret, "Promise")) ret = ret.args[0];
    if (c.fn.generator && isNamed(ret, "Generator")) ret = ret.args[0];
    // DELIBERATE CHANGE (2026-11-23, a9): the runtime awaits a cell's value, so its readers get it with every Promise level off (B-3)
    const um = (t: Ty): Ty[] => t.k === "union" ? t.ts.flatMap(um) : t.k === "named" && reg.isAlias(t.n) && (reg.expand(t).k === "union" || !["rec", "err"].includes(reg.expand(t).k)) ? um(reg.expand(t)) : t.k === "never" ? [] : [t];
    const isP = (m: Ty) => isNamed(m, "Promise") && m.k === "named" && m.args[0] !== undefined;
    const settle = (x: Ty, d: number): Ty => d > 16 || !um(x).some(isP) ? x : union(um(x).map((m) => isP(m) && m.k === "named" ? settle(m.args[0], d + 1) : m));
    // DELIBERATE CHANGE (2026-11-22, S4): what a cell exposes is the read-only view (frozen at run time), not [mut-cell]
    ret = stripMut(ret, reg);
    if (c.fn.generator && !c.fn.async) eventsInner.set(c.name, ret);
    const fnKept = (what: string, t: Ty, then: string) => { if (fedBy && ch.mayHoldFn(t)) r.errors.push({ rule: "action-capture", line: P.line(c.fn.start), msg: `${what} ${show(t)}, which may be or hold a function from another language (${c.name} ${fedBy}); ${then}` }); };
    if (c.fn.generator && !c.fn.async) fnKept("an events cell yields", ret, "a listener's action would receive it");
    if (isNamed(ret, "StateCell")) {
      // Observable's Generators.input, which reads a state cell's value, skips an undefined value
      if (admitsUndefined(ret.args[0])) r.errors.push({ rule: "state-undefined", line: P.line(c.fn.start), msg: `a state cell's value may not be undefined (its type is ${show(ret.args[0])}): Observable skips an undefined value, so the cell would never have one. Use null` });
      const nested = holds(ret.args[0], ["State", "StateCell"]);
      if (nested) r.errors.push({ rule: "state-in-state", line: P.line(c.fn.start), msg: `a state cell holds ${show(ret.args[0])}, which contains ${nested}; a state cell's content may not contain a State or StateCell` });
      fnKept("a state cell holds", ret.args[0], "an action that reads the state cell could call it");
      refInner.set(c.name, ret.args[0]); ret = ret.args[0];
      stateful.set(c.name, "is a state cell");
    }
    const it = iterIn(ret, reg);
    // DELIBERATE CHANGE (2026-11-24, d1): the message for a FetchResponse
    if (it === "FetchResponse") r.errors.push({ rule: "iterator-cell", line: P.line(c.fn.start), msg: `value ${show(ret)} holds a FetchResponse: a response's body can be read once, so the cells that take it would find it used up, depending on the order they run in; read the body in this cell and give the data (const data = async (fetch: Fetch) => (await fetch(url)).json())` });
    else if (it) r.errors.push({ rule: "iterator-cell", line: P.line(c.fn.start), msg: `value ${show(ret)} may hold an iterator (${it}); every cell that takes it would use up the same one, so what each computes would depend on the order the cells run in. Make it an array` });
    // DELIBERATE CHANGE (2026-11-22, holes7): a value with a callable then is a type error (md-value.ss.ts mdThenable)
    const thenable = (t: Ty): boolean => t.k === "union" ? t.ts.some(thenable) : t.k === "rec" && t.props.get("then")?.t.k === "fn";
    if (thenable(ret)) r.errors.push({ rule: "type", line: P.line(c.fn.start), msg: `value ${show(ret)} has a callable then: the runtime would call it and give the cells that take it what then passes on, not this type. Rename then` });
    // a Listener is a whole cell value: not in a list, record, state cell, union with another type, or function
    if (isNamed(ret, "Listener") || (ret.k === "union" && ret.ts.every((t) => isNamed(t, "Listener")))) listenerCells.add(c.name);
    else if (holds(ret, ["Listener"])) r.errors.push({ rule: "listener-placement", line: P.line(c.fn.start), msg: `value ${show(ret)} holds a Listener; a listener is only the whole value of a cell` });
    const usable = !hasErr(ret) && (r.unsupported.length === 0 || !!c.fn.returnType);
    value.set(c.name, usable ? settle(ret, 0) : null);
    r.value = show(settle(ret, 0));
    r.status = r.errors.length ? "rejected" : r.unsupported.length ? "unsupported" : r.blockedBy.length ? "blocked" : "ok";
  }
  // a later declaration of a name: reported as "<name> (2)", "<name> (3)", ... and rejected
  const shown = new Map<string, string>();
  for (const [ph, d] of dups) {
    const first = cells.find((c) => c.name === d.name);
    const at = first ? out.get(first.name)!.line : null;
    const mine = out.get(ph);
    if (!mine) { moduleErrs.push({ rule: "duplicate-cell", line: P.line(d.pos), msg: `${d.name} is already defined${at ? ` at line ${at}` : ""}` }); continue; }
    let k = 2;
    while (cellNames.has(`${d.name} (${k})`) || [...shown.values()].includes(`${d.name} (${k})`)) k++;
    shown.set(ph, `${d.name} (${k})`);
    mine.errors.unshift({ rule: "duplicate-cell", line: mine.line, msg: `${d.name} is already defined${at ? ` at line ${at}` : ""}` });
    mine.status = "rejected";
  }
  const unPh = (x: string) => { for (const [ph, n] of shown) x = x.split(ph).join(n); for (const [ph, d] of dups) x = x.split(ph).join(d.name); return x; };
  if (dups.size) for (const c of out.values()) {
    c.name = shown.get(c.name) ?? c.name;
    for (const e of [...c.errors, ...c.unsupported]) e.msg = unPh(e.msg);
    c.blockedBy = c.blockedBy.map(unPh);
    if (c.value) c.value = unPh(c.value);
  }
  const list = cells.map((c) => out.get(c.name)!);
  const result: LiteResult = { port: dir, file: tsx ? "cells.tsx" : "cells.ts", ok: moduleErrs.length === 0 && list.every((c) => c.status === "ok"), module: moduleErrs, cells: list, ms: performance.now() - t0 };
  const facts = new Map(cells.map((c) => {
    // DELIBERATE CHANGE (2026-11-23, e1): the shapes of the cell's cast calls in source order, before params as the cells' facts
    const { params, ...head } = factsOf(shown.get(c.name) ?? c.name, c.fn, c.stmt);
    const casts = [...(castsOf.get(c.name) ?? new Map())].sort((x, y) => x[0] - y[0]).map((x) => x[1]);
    const f = { ...head, ...(casts.length ? { casts } : {}), params };
    const b = boundaries.get(c.name);
    if (b) f.params = f.params.map((p) => (b.has(p.name) ? { ...p, boundary: b.get(p.name) } : p));
    return [f.name, f] as const;
  }));
  Object.defineProperty(result, "facts", { value: facts, enumerable: false });
  return result;
}

// The source parsed, with every name declared again at the top level replaced, in a copy, by a stand-in
// of the same length (so positions and lines are unchanged), made of letters no cell uses. dups: stand-in
// -> the name and where it was declared again.
const STAND = Array.from({ length: 40 }, (_, i) => String.fromCharCode(0xa4d0 + i));
function distinctNames(src: string, jsx: boolean): { P: Parsed; dups: Map<string, { name: string; pos: number }> } {
  const dups = new Map<string, { name: string; pos: number }>();
  let text = src;
  for (;;) {
    try { return { P: parse(text, { jsx }), dups }; } catch (e) {
      const pos = (e as { pos?: number }).pos;
      if (!(e instanceof SyntaxError) || typeof pos !== "number" || !/has already been declared/.test(e.message)) throw e;
      const name = /^[\w$]+/.exec(text.slice(pos))?.[0];
      if (!name) throw e;
      let k = dups.size, ph = "";
      for (let i = 0; i < name.length; i++) { ph = STAND[k % 40] + ph; k = Math.floor(k / 40); }
      if (k > 0 || dups.has(ph)) throw e;
      dups.set(ph, { name: src.slice(pos, pos + name.length), pos });
      text = text.slice(0, pos) + ph + text.slice(pos + name.length);
    }
  }
}

function dedupe(es: LiteError[]): LiteError[] {
  const s = new Set<string>();
  return es.filter((e) => { const k = `${e.line}:${e.rule}:${e.msg}`; if (s.has(k)) return false; s.add(k); return true; });
}

// the node under root with this span and type (a typed tree's node in P)
function nodeAt(root: Node, start: number, end: number, type: string): Node | null {
  const todo: Node[] = [root];
  for (let n = todo.pop(); n; n = todo.pop()) {
    if (n.start === start && n.end === end && n.type === type) return n;
    if (n.start > start || n.end < end) continue;
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === "string") todo.push(x); } else if (k !== "loc" && v && typeof v.type === "string") todo.push(v); }
  }
  return null;
}

// DELIBERATE CHANGE (2026-11-23, m1 step 1): memo(f) (S2.13), the cells' mdMemoSig and mdMemoUses: each parameter of f
// takes data, its result holds no shared state, and from outside itself f uses only what an action body may, no
// capability and no state handle or action; a let or a Mut it captures is R-K's
const MEMO_PARAM_BAD = ["Mut", "Borrowed", "State", "StateCell", "Action", "Events", "Listener", "Promise", "Generator", "AsyncGenerator", "Pool", "Compile", "Elem", "FetchResponse", "URLSearchParams", "DataView"];
const MEMO_RESULT_BAD = ["Mut", "Borrowed", "State", "StateCell", "Action", "Events", "Listener", "Promise", "Generator", "AsyncGenerator", "Iterator", "IterableIterator", "Pool", "Compile", "FetchResponse"];
function memoErrs(cellFn: Node, ch: Checker, reg: Registry, tainted: Map<string, string>): { node: Node; msg: string }[] {
  const out: { node: Node; msg: string }[] = [], holds = holdsWith(reg.ops), F = ch.facts;
  const tail = "; a memoised function may use from outside itself only inputs that hold no state and the consts and functions made from them, since a stored result would not see a change: pass the value as an argument";
  const calls: Node[] = [];
  (function walk(n: Node) { if (n.type === "CallExpression" && F.calls.get(n)?.prelude === "memo") calls.push(n); for (const k of kids(n)) walk(k); })(cellFn);
  for (const call of calls) {
    const f = call.arguments?.[0];
    if (!f || !isFn(f)) continue;
    const t = F.types.get(f);
    if (t && t.k === "fn" && !f.async && !f.generator) {
      t.ps.forEach((p, i) => {
        const at = f.params?.[i] ?? f, w = holds(p.t, MEMO_PARAM_BAD);
        if (ch.mayHide(p.t)) out.push({ node: at, msg: `a parameter of memo's function is ${show(p.t)}, which may be or hold a function: a function may read a capability, so the stored result could be stale; take data` });
        else if (w === "Mut") out.push({ node: at, msg: `a parameter of memo's function is ${show(p.t)}: memo freezes its arguments, so take it under its plain type` });
        else if (w !== null) out.push({ node: at, msg: `a parameter of memo's function holds a ${w}, which memo cannot freeze or which is state; take data` });
      });
      const r = holds(t.ret, MEMO_RESULT_BAD);
      if (r !== null) out.push({ node: f, msg: `memo's function returns a value that holds a ${r}, which every call would share` });
      // DELIBERATE CHANGE (2026-11-23, m1 step 1 review): an iterator result, by the [iterator-capture] type test
      const it = r === null ? iterIn(t.ret, reg) : null;
      if (it) out.push({ node: f, msg: `memo's function returns a value that may hold an iterator (${it}), which every call would share and reading uses up; return an array` });
    }
    const seen = new Set<string>();
    const rk = (b: any) => b.kind === "let" || b.mutOwned || isNamed(b.t, "Mut");
    for (const c of opaqueCaptures(cellFn, ch, tainted, new Set(), [f])) {
      const b = F.bindingOf.get(c.node);
      seen.add(c.name);
      const why = c.opaque ? c.why.replace("after the action is made", "after memo's function is made") : c.why.startsWith("capability ") ? "is a capability" : `depends on state (${c.why})`;
      if (!b || !rk(b)) out.push({ node: c.node, msg: `${c.name} ${why}${tail}` });
    }
    const within = (x: Node, y: Node) => x.start >= y.start && x.end <= y.end;
    const free: any[] = [];
    (function walk(n: Node) {
      if (n.type === "Identifier") { const b = F.bindingOf.get(n); if (b && b.kind !== "prelude" && b.kind !== "global" && b.node !== n && !within(b.node, f) && !free.includes(b)) free.push(b); }
      for (const k of kids(n)) walk(k);
    })(f);
    for (const b of free) {
      if (seen.has(b.name)) continue;
      seen.add(b.name);
      const w = b.cellParam && Object.hasOwn(CAPABILITIES, b.name) ? `the capability ${b.name}` : holds(b.t, ["State", "StateCell", "Action", "Events", "Listener"]);
      if (w !== null) out.push({ node: f, msg: `memo's function uses ${b.name}, which is or holds ${w.startsWith("the ") ? w : (w === "Action" || w === "Events" ? "an " : "a ") + w}: a call that gives a stored result would skip what it does${tail}` });
    }
  }
  return out;
}

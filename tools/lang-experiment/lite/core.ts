// The lite checker without file access: module shape, syntax bans, injection, a per-cell type
// check (infer.ts) and the ownership rules (own.ts). Each cell ends ok, rejected, unsupported (a
// construct lite does not model) or blocked (a dependency has no usable type).
import { parse, type Node, type Parsed } from "./parse.ts";
import { Registry } from "./registry.ts";
import { Checker } from "./infer.ts";
import { ownership } from "./own.ts";
import { type Ty, ERR, UNKNOWN, isNamed, named, show, rec } from "./types.ts";
import { CAPABILITIES } from "./intrinsics.ts";
import { island, specOf, compileCalls } from "./island.ts";
import { factsOf, type CellInfo } from "./facts.ts";

export type LiteError = { rule: string; line: number; msg: string };
export type LiteCell = {
  name: string; status: "ok" | "rejected" | "unsupported" | "blocked"; line: number;
  errors: LiteError[]; unsupported: LiteError[]; blockedBy: string[]; value?: string;
};
// facts: per cell, what the compiler needs (facts.ts), from this check's parse. Not enumerable, so a
// result prints and compares as before.
export type LiteResult = { port: string; file: string; ok: boolean; module: LiteError[]; cells: LiteCell[]; ms: number; readonly facts?: ReadonlyMap<string, CellInfo> };

type CellDef = { name: string; fn: Node; stmt: Node };

let expandForErr: (t: Ty) => Ty = (t) => t;
function hasErr(t: Ty, depth = 0): boolean {
  if (depth > 8) return false;
  switch (t.k) {
    case "err": return true;
    case "arr": return hasErr(t.el, depth + 1);
    case "tup": return t.els.some((x) => hasErr(x, depth + 1));
    case "union": return t.ts.some((x) => hasErr(x, depth + 1));
    case "named": return t.args.some((x) => hasErr(x, depth + 1)) || expandForErr(t).k === "err"; // an alias lite could not convert
    case "fn": return t.ps.some((p) => hasErr(p.t, depth + 1)) || hasErr(t.ret, depth + 1);
    case "rec": return [...t.props.values()].some((p) => hasErr(p.t, depth + 1));
    default: return false;
  }
}

const SYNTAX: Record<string, string> = {
  ThisExpression: "no-this", ClassDeclaration: "no-class", ClassExpression: "no-class", TSAnyKeyword: "no-any",
  TSNonNullExpression: "no-non-null", ImportExpression: "no-dynamic-import", TSEnumDeclaration: "no-enum",
  TSModuleDeclaration: "no-namespace", TSTypeAssertion: "no-cast",
};
function syntaxPass(n: Node, report: (n: Node, rule: string, msg: string) => void, unsup: (n: Node, what: string) => void) {
  const walk = (x: any, parent: any) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) { x.forEach((y) => walk(y, parent)); return; }
    if (typeof x.type !== "string") return;
    const r = SYNTAX[x.type];
    if (r) report(x, r, x.type);
    if (x.type === "TSAsExpression" && !(x.typeAnnotation.type === "TSTypeReference" && x.typeAnnotation.typeName?.name === "const")) report(x, "no-cast", "as cast");
    if (x.type === "TSSatisfiesExpression") unsup(x, "satisfies");
    if (x.type === "VariableDeclaration" && x.kind === "var") report(x, "no-var", "var");
    if (x.type === "Identifier" && x.name === "arguments" && !(parent?.type === "MemberExpression" && parent.property === x && !parent.computed) && !(parent?.type === "Property" && parent.key === x))
      report(x, "no-arguments", "arguments");
    for (const k in x) if (k !== "loc") walk(x[k], x);
  };
  walk(n, null);
}

export type Sources = { cells: string; tsx?: boolean; foreign?: string | null; shell?: string | null; name?: string };

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
  const P = parse(cellsSrc, { jsx: tsx });
  const mod = (p: Parsed, n: Node, rule: string, msg: string) => moduleErrs.push({ rule, line: p.line(n.start), msg });
  // conversion problems while loading foreign.d.ts are module-level (they would otherwise be silent)
  expandForErr = (t) => reg.expand(t);
  reg.onUnsup = (n, what) => moduleErrs.push({ rule: "unsupported", line: n.loc?.start.line ?? 0, msg: `foreign.d.ts: ${what}` });
  reg.onErr = (n, rule, msg) => moduleErrs.push({ rule, line: n.loc?.start.line ?? 0, msg: `foreign.d.ts: ${msg}` });

  // foreign.d.ts
  const foreignSrc = src.foreign ?? null;
  const foreignNames = new Set<string>();
  if (foreignSrc) {
    const FP = parse(foreignSrc);
    const rest = reg.load(FP, "foreign");
    for (const st of rest) mod(FP, st, "module-level", `foreign.d.ts: ${st.type} is not a declaration`);
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
  // cells.ts module level
  const cells: CellDef[] = [];
  const rest = reg.load(P, "user", true);
  for (const st of rest) {
    if (st.type === "ExportNamedDeclaration" && st.declaration) {
      const d = st.declaration;
      if (d.type === "FunctionDeclaration") { cells.push({ name: d.id.name, fn: d, stmt: st }); continue; }
      if (d.type === "VariableDeclaration" && d.kind !== "var") {
        for (const x of d.declarations) {
          if (x.id.type === "Identifier" && x.init && (x.init.type === "ArrowFunctionExpression" || x.init.type === "FunctionExpression")) cells.push({ name: x.id.name, fn: x.init, stmt: st });
          else mod(P, x, "cell-not-function", `export ${x.id.name ?? "?"} is not a function`);
        }
        continue;
      }
    }
    if (st.type === "ImportDeclaration" && st.importKind === "type") continue;
    const rule = st.type === "TSEnumDeclaration" ? "no-enum" : st.type === "TSModuleDeclaration" ? "no-namespace" : st.type === "ClassDeclaration" ? "no-class"
      : (st.type === "VariableDeclaration" || st.declaration?.type === "VariableDeclaration") && (st.kind ?? st.declaration?.kind) === "var" ? "no-var" : "module-level";
    mod(P, st, rule, `${st.type} at module level`);
  }
  const cellNames = new Set(cells.map((c) => c.name));
  const seen = new Set<string>();
  for (const c of cells) {
    if (seen.has(c.name) || shellNames.has(c.name)) mod(P, c.stmt, "duplicate-cell", `cell ${c.name} defined twice`);
    seen.add(c.name);
  }

  const out = new Map<string, LiteCell>();
  for (const c of cells) out.set(c.name, { name: c.name, status: "ok", line: P.line(c.stmt.start), errors: [], unsupported: [], blockedBy: [] });
  const cellOf = (pos: number) => cells.find((c) => c.stmt.start <= pos && pos < c.stmt.end);
  for (const cm of P.comments) if (/@ts-(ignore|expect-error|nocheck)/.test(cm.text)) {
    const c = cellOf(cm.start);
    const e = { rule: "no-ts-ignore", line: P.line(cm.start), msg: "@ts-ignore/@ts-expect-error/@ts-nocheck" };
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
  // structuredClone carries data, not functions, refs, actions or borrowed views.
  const uncloneable = (t: Ty, depth = 0): string | null => {
    if (depth > 8) return null;
    if (t.k === "named" && reg.isAlias(t.n)) return uncloneable(reg.expand(t), depth + 1);
    switch (t.k) {
      case "fn": return "a function";
      case "named": return ["Action", "Ref", "RefCell", "Mut", "Borrowed", "Promise", "Generator", "Pool", "Compile", "Events", "Listener"].includes(t.n) ? t.n : null;
      case "arr": return uncloneable(t.el, depth + 1);
      case "tup": for (const x of t.els) { const w = uncloneable(x, depth + 1); if (w) return w; } return null;
      case "union": for (const x of t.ts) { const w = uncloneable(x, depth + 1); if (w) return w; } return null;
      case "rec": if (t.calls?.length) return "a function"; for (const p of t.props.values()) { const w = uncloneable(p.t, depth + 1); if (w) return w; } return null;
      default: return null;
    }
  };
  // the first of names that t mentions anywhere (aliases expanded), or null
  const holds = (t: Ty, names: string[], depth = 0): string | null => {
    if (depth > 12) return null;
    if (t.k === "named") {
      if (names.includes(t.n)) return t.n;
      if (reg.isAlias(t.n)) return holds(reg.expand(t), names, depth + 1);
      for (const a of t.args ?? []) { const w = holds(a, names, depth + 1); if (w) return w; }
      return null;
    }
    const kids: Ty[] = t.k === "arr" ? [t.el] : t.k === "tup" ? t.els : t.k === "union" ? t.ts
      : t.k === "rec" ? [...[...t.props.values()].map((p) => p.t), ...(t.calls ?? []).flatMap((f: any) => [...f.ps.map((p: any) => p.t), f.ret]), ...(t.index ? [t.index] : [])]
      : t.k === "fn" ? [...t.ps.map((p) => p.t), t.ret] : [];
    for (const k of kids) { const w = k && holds(k, names, depth + 1); if (w) return w; }
    return null;
  };
  // Generator cells some cell takes as Events<T>: the runner gives every reader the handle, so a plain reader is an error.
  const takenAsEvents = new Set<string>(cells.flatMap((c) => (c.fn.params as Node[]).filter((p) => p.typeAnnotation?.typeAnnotation?.type === "TSTypeReference" && p.typeAnnotation.typeAnnotation.typeName.name === "Events").map((p) => p.name as string)));
  // Listener cells: no other cell may take one, so a listener's lifetime is its own cell's value.
  const listenerCells = new Set<string>();
  for (const c of order) {
    if (value.has(c.name)) continue;
    const r = out.get(c.name)!;
    const ch = new Checker(reg, cellNames, P);
    ch.compileHook = (e, env) => compileType(e, env, ch);
    opts.onCell?.(c.name, ch, c.fn);
    const diag = (n: Node, rule: string, msg: string) => r.errors.push({ rule, line: P.line(n.start), msg });
    syntaxPass(c.fn, diag, (n, w) => ch.unsupported(n, w));
    // injection
    const injected: Ty[] = [];
    for (const p of c.fn.params as Node[]) {
      if (p.type !== "Identifier") { diag(p, "inject-pattern", "an injected parameter must be a plain identifier"); injected.push(ERR); continue; }
      const name: string = p.name;
      const ann = p.typeAnnotation?.typeAnnotation;
      // Ref<T> and Events<T> take a handle to a ref cell / generator cell, not its value
      if (ann?.type === "TSTypeReference" && (ann.typeName.name === "Source" || ann.typeName.name === "Sub")) {
        diag(p, "inject-events", ann.typeName.name === "Source" ? "Source was renamed Events: type this parameter Events<...>" : "Sub was renamed Listener, and no cell may take a listener");
        injected.push(ERR); continue;
      }
      const wrapper = ann?.type === "TSTypeReference" && (ann.typeName.name === "Ref" || ann.typeName.name === "Events") ? ann.typeName.name as string : null;
      const handle = wrapper === "Ref" ? { rule: "inject-ref", what: "ref cell", inners: refInner, of: (t: Ty) => `of ${show(t)}` }
        : wrapper ? { rule: "inject-events", what: "sync generator cell", inners: eventsInner, of: (t: Ty) => `yielding ${show(isNamed(t, "Events") ? t.args[0] : t)}` } : null;
      let vt: Ty;
      if (cellNames.has(name)) {
        const v = value.get(name);
        if (v === null || v === undefined) { r.blockedBy.push(name); injected.push(ERR); continue; }
        if (handle) {
          const inner = handle.inners.get(name);
          const want = reg.convert(ann, { tps: new Set() }, P);
          if (!inner || !(isNamed(want, wrapper!) && reg.sub(inner, want.args[0]) && reg.sub(want.args[0], inner))) diag(p, handle.rule, `${name} is not a ${handle.what} ${handle.of(want)}`);
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
      } else if (shellNames.has(name)) vt = UNKNOWN;
      else if (name in CAPABILITIES) vt = named(CAPABILITIES[name]);
      else { diag(p, "inject-unknown", `parameter ${name} names no cell, foreign or capability`); injected.push(ERR); continue; }
      if (handle) { diag(p, handle.rule, `${name} is not a ${handle.what}`); injected.push(ERR); continue; }
      if (ann) {
        const want = reg.convert(ann, { tps: new Set() }, P);
        const widenBorrow = isNamed(vt, "Borrowed") && !isNamed(want, "Borrowed");
        if (widenBorrow || !reg.sub(vt, want)) diag(p, "inject-type", `${name}: ${show(vt)} is not assignable to ${show(want)}`);
        injected.push(want);
      } else injected.push(vt);
    }
    injected.forEach((t, i) => { if (t.k !== "err" && hasErr(t)) { r.blockedBy.push(`${c.fn.params[i].name} (type not understood)`); } });
    let fnT: Ty = ERR;
    try {
      fnT = ch.fnExpr(c.fn, null, undefined, { injected });
      for (const e of ownership(c.fn, ch)) ch.err(e.node, e.rule, e.msg);
    } catch (e) {
      ch.unsupported(c.fn, `checker crashed: ${(e as Error).message}`);
    }
    for (const d of ch.diags) r.errors.push({ rule: d.rule, line: P.line(d.node.start), msg: d.msg });
    for (const u of ch.unsup) r.unsupported.push({ rule: "unsupported", line: P.line(u.node.start), msg: u.msg });
    r.errors = dedupe(r.errors);
    r.unsupported = dedupe(r.unsupported);
    // value type
    let ret = fnT.k === "fn" ? fnT.ret : ERR;
    if (c.fn.async && isNamed(ret, "Promise")) ret = ret.args[0];
    if (c.fn.generator && isNamed(ret, "Generator")) { ret = ret.args[0]; if (!c.fn.async) eventsInner.set(c.name, ret); }
    if (isNamed(ret, "RefCell")) {
      const nested = holds(ret.args[0], ["Ref", "RefCell"]);
      if (nested) r.errors.push({ rule: "ref-in-ref", line: P.line(c.fn.start), msg: `a ref holds ${show(ret.args[0])}, which contains ${nested}; a ref's content may not contain a Ref or RefCell` });
      refInner.set(c.name, ret.args[0]); ret = ret.args[0];
    }
    // a Listener is a whole cell value: not in a list, record, ref, union with another type, or function
    if (isNamed(ret, "Listener") || (ret.k === "union" && ret.ts.every((t) => isNamed(t, "Listener")))) listenerCells.add(c.name);
    else if (holds(ret, ["Listener"])) r.errors.push({ rule: "listener-placement", line: P.line(c.fn.start), msg: `value ${show(ret)} holds a Listener; a listener is only the whole value of a cell` });
    const usable = !hasErr(ret) && (r.unsupported.length === 0 || !!c.fn.returnType);
    value.set(c.name, usable ? ret : null);
    r.value = show(ret);
    r.status = r.errors.length ? "rejected" : r.unsupported.length ? "unsupported" : r.blockedBy.length ? "blocked" : "ok";
  }
  const list = cells.map((c) => out.get(c.name)!);
  const result: LiteResult = { port: dir, file: tsx ? "cells.tsx" : "cells.ts", ok: moduleErrs.length === 0 && list.every((c) => c.status === "ok"), module: moduleErrs, cells: list, ms: performance.now() - t0 };
  Object.defineProperty(result, "facts", { value: new Map(cells.map((c) => [c.name, factsOf(c.name, c.fn, c.stmt)])), enumerable: false });
  return result;
}

function dedupe(es: LiteError[]): LiteError[] {
  const s = new Set<string>();
  return es.filter((e) => { const k = `${e.line}:${e.rule}:${e.msg}`; if (s.has(k)) return false; s.add(k); return true; });
}


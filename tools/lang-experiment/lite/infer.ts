// Bidirectional type checker for one cell: expressions, statements, flow narrowing, generic calls.
// Records facts (expression types, identifier bindings, resolved call signatures, member flags) that
// own.ts reads for the ownership rules.
import { kids, isFn, type Node, type Parsed } from "./parse.ts";
import type { Registry } from "./registry.ts";
import {
  type Ty, type Fn, type Rec, type Param, type Subst, type Flags,
  NUM, STR, BIGINT, NULL, UNDEF, VOID, NEVER, UNKNOWN, OBJECT, ERR, BOOL, SYMBOL,
  union, members, show, subst, instantiate, widen, hasTv, named, arr, isNamed, isPrimitive, lit, unwrap, propT, tpNames,
} from "./types.ts";
import { ALLOWED_GLOBALS, PRELUDE_FNS } from "./intrinsics.ts";

export type BKind = "const" | "let" | "param" | "fn" | "global" | "prelude";
export type Binding = {
  id: number; name: string; t: Ty; kind: BKind; node: Node; fi: FnInfo | null;
  mutOwned?: boolean; fnNode?: Node; lazy?: () => Ty; assigned?: boolean; checked?: boolean; cellParam?: boolean;
};
export type FnInfo = {
  node: Node; parent: FnInfo | null; isAsync: boolean; isGen: boolean; isCell: boolean; inAction: boolean;
  retCtx?: Ty; rets: Ty[]; yields: Ty[];
  // retCtx came from where the function is passed, not from its annotation: the function's own type is checked there
  retFromCtx?: boolean;
  // a generator's annotated Generator<Y>: what each yield must give
  yieldCtx?: Ty;
};
export class Scope {
  vars = new Map<string, Binding>();
  parent: Scope | null;
  constructor(parent: Scope | null) { this.parent = parent; }
  get(n: string): Binding | undefined { return this.vars.get(n) ?? this.parent?.get(n); }
}
// dead: the statements are after a return, throw, break or continue (a break there ends no switch)
// a flow key that is not a path: a path starts with "#", so no property name can produce one of these
const exclusion = (x: string, path: string) => `!${x} ${path}`;
const pathOf = (key: string) => (key.startsWith("!") ? key.slice(key.indexOf(" ") + 1) : key);
export type Env = { scope: Scope; flow: Map<string, Ty>; fi: FnInfo; dead?: boolean };
export type CallFact = { sig?: Fn; prelude?: string; helper?: Binding };
export type Facts = {
  types: Map<Node, Ty>;
  bindingOf: Map<Node, Binding>;
  calls: Map<Node, CallFact>;
  memberFlags: Map<Node, Flags | undefined>;
  fnInfo: Map<Node, FnInfo>;
};
export type Diag = { node: Node; rule: string; msg: string };

let nextId = 0;
// type variables made by instantiate so far, page-wide, so two instantiations never share a name
let fresh = 0;
// Action<[A, B]> called as (a0: A, a1: B) => void
const actionFn = (args: Ty): Fn => ({ k: "fn", tps: [], ps: (args.k === "tup" ? args.els : []).map((t, i) => ({ n: "a" + i, t, opt: false })), ret: VOID });
// what typeof x === tag says of an unknown x: "function" proves an object, not a signature, so it is not callable
const TYPEOF = new Map<string, Ty>([["string", STR], ["number", NUM], ["boolean", BOOL], ["bigint", BIGINT], ["undefined", UNDEF],
  ["symbol", SYMBOL], ["object", union([OBJECT, NULL])], ["function", OBJECT]]);
// the runtime handles of these have none of the members their declarations give them to be nominal
const memberless = (m: Ty) => isNamed(m, "Action") || isNamed(m, "StateCell") || isNamed(m, "Events") || isNamed(m, "Listener");
const MUTATING_OPS = new Set(["=", "+=", "-=", "*=", "/=", "%=", "**=", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "&&=", "||=", "??="]);

export class Checker {
  facts: Facts = { types: new Map(), bindingOf: new Map(), calls: new Map(), memberFlags: new Map(), fnInfo: new Map() };
  diags: Diag[] = [];
  unsup: Diag[] = [];
  globals = new Scope(null);
  // compile({inputs, refs, outputs}) is typed from the cell graph, which only core.ts sees.
  compileHook: ((e: Node, env: Env) => Ty) | null = null;
  // called with every identifier read and its environment (completion reads the scope at a placeholder)
  identHook: ((e: Node, env: Env) => void) | null = null;
  // the functions given to action(...), and each write, action call or read made in a function nested in one;
  // own.ts actionEscapes reports those whose function may run after its action's call
  actionBodies = new Set<Node>();
  // 1 while the parts of a literal, a conditional or a logical expression are checked against a context that is
  // not their final type (a generic argument before its type parameters are solved, a return against the return
  // type of where the function is passed): hides is left to the check against the final type
  quiet = 0;
  inActionUses: { fi: FnInfo; node: Node; rule: string; msg: string }[] = [];
  // the properties of a destructuring pattern that take a State's set or update (own.ts actionEscapes)
  stateProps = new Set<Node>();

  reg: Registry;
  cellNames: Set<string>;
  parsed: Parsed;
  constructor(reg: Registry, cellNames: Set<string>, parsed: Parsed) {
    this.reg = reg;
    this.cellNames = cellNames;
    this.parsed = parsed;
    reg.onUnsup = (n, what) => this.unsupported(n, what);
    reg.onErr = (n, rule, msg) => this.err(n, rule, msg);
    for (const name of PRELUDE_FNS) this.globals.vars.set(name, { id: ++nextId, name, t: ERR, kind: "prelude", node: null as any, fi: null });
    for (const name of ALLOWED_GLOBALS) {
      const v = reg.values.get(name);
      if (name === "undefined") this.globals.vars.set(name, { id: ++nextId, name, t: UNDEF, kind: "global", node: null as any, fi: null });
      else if (v && v.origin === "intrinsic") this.globals.vars.set(name, { id: ++nextId, name, t: v.t, kind: "global", node: v.node, fi: null });
    }
    const eq = reg.values.get("equals");
    if (eq) this.globals.vars.get("equals")!.t = eq.t;
  }

  err(node: Node, rule: string, msg: string) { this.diags.push({ node, rule, msg }); }
  // a use that only an action body may make
  inActionOnly(env: Env, node: Node, rule: string, msg: string) {
    if (!env.fi.inAction) this.err(node, rule, msg);
    else if (!this.actionBodies.has(env.fi.node)) this.inActionUses.push({ fi: env.fi, node, rule, msg });
  }
  unsupported(node: Node, what: string) { this.unsup.push({ node, rule: "unsupported", msg: what }); }
  rec(n: Node, t: Ty): Ty { this.facts.types.set(n, t); return t; }

  // ---- union helpers and narrowing primitives ----
  um(t: Ty): Ty[] {
    if (t.k === "union") return t.ts.flatMap((x) => this.um(x));
    if (t.k === "named" && this.reg.isAlias(t.n)) {
      const e = this.reg.expand(t);
      if (e.k === "union" || (e.k !== "rec" && e.k !== "err")) return this.um(e);
    }
    return t.k === "never" ? [] : [t];
  }
  filter(t: Ty, keep: (m: Ty) => boolean | Ty): Ty {
    if (t.k === "err") return t;
    const out: Ty[] = [];
    for (const m of this.um(t)) {
      const r = keep(m);
      if (r === true) out.push(m);
      else if (r !== false) out.push(r);
    }
    return union(out);
  }
  truthy = (t: Ty) => this.filter(t, (m) => {
    if (m.k === "null" || m.k === "undef" || m.k === "void") return false;
    if (m.k === "lit") return !!m.v;
    return true;
  });
  falsy = (t: Ty) => this.filter(t, (m) => {
    if (["null", "undef", "void", "num", "str", "bigint", "unknown", "tv"].includes(m.k)) return true;
    if (m.k === "lit") return !m.v;
    return false;
  });
  nonNullish = (t: Ty) => this.filter(t, (m) => m.k !== "null" && m.k !== "undef" && m.k !== "void");
  typeTag(m: Ty): string | null {
    switch (m.k) {
      case "num": return "number";
      case "str": return "string";
      case "bigint": return "bigint";
      case "symbol": return "symbol";
      case "undef": case "void": return "undefined";
      case "null": return "object";
      case "lit": return typeof m.v;
      case "fn": return "function";
      case "rec": return m.calls?.length ? "function" : "object";
      case "named": {
        if (m.n === "Action") return "function";
        const x = this.reg.expand(unwrap(m));
        return x === m ? "object" : this.typeTag(x);
      }
      case "arr": case "tup": return "object";
      default: return null; // unknown, object, tv, err
    }
  }
  narrowTypeof(t: Ty, tag: string, pos: boolean): Ty {
    return this.filter(t, (m) => {
      const mt = this.typeTag(m);
      if (mt !== null) return (mt === tag) === pos;
      if (!pos) return true;
      if (m.k === "unknown" || m.k === "tv") return TYPEOF.get(tag) ?? false;
      return m.k === "object" ? tag === "object" || tag === "function" : true;
    });
  }
  narrowEq(t: Ty, v: Ty, pos: boolean, loose: boolean): Ty {
    const nullish = v.k === "null" || v.k === "undef";
    return this.filter(t, (m) => {
      if (pos) {
        if (loose && nullish) return m.k === "null" || m.k === "undef" || m.k === "void" || (m.k === "unknown" ? union([NULL, UNDEF]) : false);
        if (m.k === "unknown") return v;
        if (this.reg.sub(v, m)) return v.k === "lit" || nullish ? v : true;
        return this.reg.sub(m, v);
      }
      if (loose && nullish) return !(m.k === "null" || m.k === "undef" || m.k === "void");
      if ((v.k === "lit" || nullish) && this.reg.sub(m, v) && this.reg.sub(v, m)) return false;
      return true;
    });
  }
  narrowIn(t: Ty, k: string, pos: boolean): Ty {
    const ms = this.um(t);
    const has = (m: Ty) => !!this.reg.member(m, k) && this.reg.expand(m).k !== "unknown";
    const anyHas = ms.some(has);
    return this.filter(t, (m) => {
      if (pos) {
        if (has(m)) return true;
        if (anyHas) return false;
        if (m.k === "object" || m.k === "rec" || m.k === "unknown") {
          const r: Rec = m.k === "rec" ? { ...m, props: new Map(m.props) } : { k: "rec", props: new Map() };
          r.props.set(k, { t: UNKNOWN, opt: false });
          return r;
        }
        return false;
      }
      const p = this.reg.member(m, k);
      return !(p && !p.opt);
    });
  }
  narrowArray(t: Ty, pos: boolean): Ty {
    return this.filter(t, (m) => {
      if (m.k === "arr" || m.k === "tup") return pos;
      if (m.k === "unknown" || m.k === "object") return pos ? arr(UNKNOWN) : true;
      return !pos;
    });
  }
  // Discriminant: keep members of `t` whose property `k` passes `test`.
  narrowByProp(t: Ty, k: string, test: (pt: Ty) => boolean): Ty {
    return this.filter(t, (m) => {
      const p = this.reg.member(m, k);
      if (!p) return true;
      return test(propT(p));
    });
  }

  // ---- paths (identifier or chain of non-computed members) used as narrowing keys ----
  pathKey(n: Node, env: Env): string | null {
    if (n.type === "Identifier") {
      const b = env.scope.get(n.name);
      if (!b || b.kind === "global" || b.kind === "prelude" || isNamed(b.t, "Mut")) return null;
      return "#" + b.id;
    }
    if (n.type === "MemberExpression" && !n.optional) {
      const base = this.pathKey(n.object, env);
      if (!base) return null;
      if (!n.computed && n.property.type === "Identifier") return base + "." + n.property.name;
      if (n.computed && n.property.type === "Literal" && typeof n.property.value === "string") return base + (/^(0|[1-9]\d*)$/.test(n.property.value) ? `[${n.property.value}]` : "." + n.property.value);
      if (n.computed && n.property.type === "Literal" && typeof n.property.value === "number") return base + "[" + n.property.value + "]";
    }
    return null;
  }
  dropRoot(flow: Map<string, Ty>, b: Binding) {
    const k = "#" + b.id;
    for (const key of [...flow.keys()]) { const p = pathOf(key); if (p === k || p.startsWith(k + ".")) flow.delete(key); }
  }
  join(a: Map<string, Ty> | null, b: Map<string, Ty> | null): Map<string, Ty> | null {
    if (!a) return b;
    if (!b) return a;
    const out = new Map<string, Ty>();
    for (const [k, t] of a) { const u = b.get(k); if (u) out.set(k, union([t, u])); }
    return out;
  }

  // ---- conditions: evaluate and return [flow if true, flow if false] ----
  cond(e: Node, env: Env): [Map<string, Ty>, Map<string, Ty>] {
    if (e.type === "UnaryExpression" && e.operator === "!") {
      const [t, f] = this.cond(e.argument, env);
      this.rec(e, BOOL);
      return [f, t];
    }
    if (e.type === "LogicalExpression" && (e.operator === "&&" || e.operator === "||")) {
      const [lt, lf] = this.cond(e.left, env);
      const rEnv = { ...env, flow: e.operator === "&&" ? lt : lf };
      const [rt, rf] = this.cond(e.right, rEnv);
      this.rec(e, this.logicalType(e, this.facts.types.get(e.left)!, this.facts.types.get(e.right)!));
      return e.operator === "&&" ? [rt, this.join(lf, rf)!] : [this.join(lt, rt)!, rf];
    }
    const t = this.infer(e, env);
    const T = new Map(env.flow), F = new Map(env.flow);
    const type = (n: Node) => this.facts.types.get(n);
    // A branch where the test cannot pass on null (or undefined) records that as the key exclusion("null", k)
    // (or "undef"), so a later narrowing of k drops that member, whichever test came first. join keeps a key
    // only when both sides have it; dropRoot removes it with the narrowings of its root.
    const narrow = (n: Node, nt: Ty | undefined, by: (t: Ty, branch: boolean) => Ty) => {
      const k = this.pathKey(n, env);
      if (!k || !nt) return;
      for (const [M, br] of [[T, true], [F, false]] as const) {
        for (const x of [NULL, UNDEF]) if (by(x, br).k === "never") M.set(exclusion(x.k, k), NEVER);
        M.set(k, this.filter(by(nt, br), (m) => !(m.k === "null" ? M.has(exclusion("null", k)) : (m.k === "undef" || m.k === "void") && M.has(exclusion("undef", k)))));
      }
    };
    // P.f's test also narrows P to the members whose f can pass it
    const discriminant = (m: Node, can: (pt: Ty, branch: boolean) => boolean) => {
      if (m.type === "MemberExpression" && !m.computed && m.property.type === "Identifier")
        narrow(m.object, type(m.object), (ot, branch) => this.narrowByProp(ot, m.property.name, (pt) => can(pt, branch)));
    };
    if (e.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(e.operator)) {
      const pos = e.operator === "===" || e.operator === "==";
      const loose = e.operator.length === 2;
      const sides: [Node, Node][] = [[e.left, e.right], [e.right, e.left]];
      const tag = sides.find(([a, b]) => a.type === "UnaryExpression" && a.operator === "typeof" && b.type === "Literal" && typeof b.value === "string");
      if (tag) narrow(tag[0].argument, type(tag[0].argument), (pt, br) => this.narrowTypeof(pt, tag[1].value, br === pos));
      else for (const [a, b] of sides) {
        const bt = type(b);
        if (!bt || (bt.k !== "lit" && bt.k !== "null" && bt.k !== "undef")) continue;
        narrow(a, type(a), (at, br) => this.narrowEq(at, bt, br === pos, loose));
        discriminant(a, (pt, br) => this.narrowEq(pt, bt, br === pos, loose).k !== "never");
        break;
      }
    } else if (e.type === "BinaryExpression" && e.operator === "in" && e.left.type === "Literal" && typeof e.left.value === "string") {
      narrow(e.right, type(e.right), (rt, br) => this.narrowIn(rt, e.left.value, br));
    } else if (e.type === "CallExpression" && e.callee.type === "MemberExpression" && e.callee.object.type === "Identifier" && e.callee.object.name === "Array"
      && !e.callee.computed && e.callee.property.name === "isArray" && e.arguments.length === 1 && env.scope.get("Array")?.kind === "global") {
      narrow(e.arguments[0], type(e.arguments[0]), (at, br) => this.narrowArray(at, br));
    } else {
      narrow(e, t, (x, br) => (br ? this.truthy(x) : this.falsy(x)));
      discriminant(e, (pt, br) => (br ? this.truthy(pt) : this.falsy(pt)).k !== "never");
    }
    return [T, F];
  }

  // ---- bindings ----
  declare(env: Env, name: string, t: Ty, kind: BKind, node: Node, extra: Partial<Binding> = {}): Binding {
    const b: Binding = { id: ++nextId, name, t, kind, node, fi: env.fi, ...extra };
    env.scope.vars.set(name, b);
    this.facts.bindingOf.set(node, b);
    return b;
  }
  // Destructure a value of type t into a pattern (declarations and parameters).
  bindPattern(p: Node, t: Ty, env: Env, kind: BKind, extra: Partial<Binding> = {}): void {
    switch (p.type) {
      case "Identifier": this.declare(env, p.name, kind === "let" ? widen(t) : t, kind, p, extra); return;
      case "AssignmentPattern": {
        const nt = this.nonUndef(t);
        const dt = this.check(p.right, env, nt);
        this.bindPattern(p.left, this.reg.sub(dt, nt) && nt.k !== "never" ? nt : union([nt, dt]), env, kind, extra);
        return;
      }
      case "ObjectPattern": {
        const used: string[] = [];
        for (const prop of p.properties) {
          if (prop.type === "RestElement") {
            const base = this.reg.expand(t);
            if (base.k !== "rec") { this.unsupported(prop, "object rest of a non-record"); this.bindPattern(prop.argument, ERR, env, kind, extra); continue; }
            const r: Rec = { k: "rec", props: new Map([...base.props].filter(([k]) => !used.includes(k))) };
            this.bindPattern(prop.argument, r, env, kind, extra);
            continue;
          }
          if (prop.computed || (prop.key.type !== "Identifier" && prop.key.type !== "Literal")) { this.unsupported(prop, "computed destructuring key"); continue; }
          const k = prop.key.type === "Identifier" ? prop.key.name : String(prop.key.value);
          used.push(k);
          if (this.um(t).some((m) => m.k !== "err" && this.reg.member(m, k)?.flags?.banned)) this.err(prop, "banned-member", `${k} is banned`);
          if (this.um(t).some((m) => isNamed(unwrap(m), "State") && this.reg.member(m, k))) {
            this.inActionOnly(env, prop, "state-write", `State.${k} outside action(...)`);
            this.stateProps.add(prop);
          }
          this.bindPattern(prop.value, this.propOf(t, k, prop), env, kind, extra);
        }
        return;
      }
      case "ArrayPattern": {
        p.elements.forEach((el: Node | null, i: number) => {
          if (!el) return;
          if (el.type === "RestElement") {
            const e = this.reg.expand(t);
            const rest = e.k === "tup" ? { k: "tup", els: e.els.slice(i) } as Ty : arr(this.reg.iterElem(t) ?? ERR);
            this.bindPattern(el.argument, rest, env, kind, extra);
            return;
          }
          this.bindPattern(el, this.indexOf(t, i, el), env, kind, extra);
        });
        return;
      }
      default:
        this.unsupported(p, `pattern ${p.type}`);
    }
  }
  nonUndef = (t: Ty) => this.filter(t, (m) => m.k !== "undef" && m.k !== "void");
  propOf(t: Ty, k: string, at: Node): Ty {
    const out: Ty[] = [];
    for (const m of this.um(t)) {
      if (m.k === "err") return ERR;
      if (memberless(m)) { this.err(at, "type", `${show(m)} has no members`); return ERR; }
      const p = this.reg.member(m, k);
      if (!p) { this.memberMissing(m, k, at); return ERR; }
      out.push(propT(p));
    }
    return union(out);
  }
  indexOf(t: Ty, i: number, at: Node): Ty {
    const out: Ty[] = [];
    for (const m0 of this.um(t)) {
      const m = unwrap(m0);
      const e = this.reg.expand(m);
      if (e.k === "tup") { if (i < e.els.length) out.push(e.els[i]); else { this.err(at, "type", `tuple ${show(e)} has no element ${i}`); return ERR; } continue; }
      const el = this.reg.iterElem(e);
      if (!el) { this.err(at, "type", `${show(m)} is not indexable`); return ERR; }
      out.push(el);
      if (this.reg.strictIndex) out.push(UNDEF);
    }
    return union(out);
  }
  memberMissing(m: Ty, k: string, at: Node) {
    if (m.k === "null" || m.k === "undef" || m.k === "void") this.err(at, "possibly-undefined", `property ${k} of a value that may be ${show(m)}`);
    else if (m.k === "unknown") this.err(at, "no-member", `property ${k} on Js/unknown; narrow it first`);
    else if (this.intrinsicName(m)) this.unsupported(at, `intrinsic member ${this.intrinsicName(m)}.${k}`);
    else this.err(at, "no-member", `no property ${k} on ${show(m)}`);
  }
  // the intrinsic a type's members come from, or null for a user type
  intrinsicName(m: Ty): string | null {
    const e = this.reg.expand(m);
    if (e.k === "arr" || e.k === "tup") return "Array";
    if (e.k === "str" || (e.k === "lit" && typeof e.v === "string")) return "String";
    if (e.k === "num" || e.k === "lit") return "Number";
    if (e.k === "union" && e.ts.every((x) => x.k === "lit" && typeof x.v === "boolean")) return show(e);
    if (e.k === "named") { const d = this.reg.types.get(e.n); return !d || d.origin === "intrinsic" ? e.n : null; }
    return null;
  }

  // ---- expressions ----
  // soft: use `expected` as context only (inference in progress); the caller checks assignability later.
  // ctx: expected is a context, not the type the value finally has (soft implies it)
  check(e: Node, env: Env, expected: Ty | undefined, soft = false, ctx = false): Ty {
    const outer = this.quiet;
    const q = soft || ctx || outer > 0;
    this.quiet = q && /^(ObjectExpression|ArrayExpression|ConditionalExpression|LogicalExpression)$/.test(e.type) ? 1 : 0;
    try { return this.check1(e, env, expected, soft, q); } finally { this.quiet = outer; }
  }
  check1(e: Node, env: Env, expected: Ty | undefined, soft: boolean, q: boolean): Ty {
    if (!expected) return this.infer(e, env);
    if (expected.k === "unknown" && !this.ctxSensitive(e)) { const t = this.infer(e, env); if (!q) this.hides(e, t, expected); return t; }
    let t: Ty;
    switch (e.type) {
      case "ObjectExpression": t = this.objLit(e, env, expected); break;
      case "ArrayExpression": t = this.arrLit(e, env, expected); break;
      case "ArrowFunctionExpression": case "FunctionExpression": t = this.fnExpr(e, env, expected); break;
      case "ConditionalExpression": return this.rec(e, this.conditional(e, env, expected));
      case "LogicalExpression": {
        if (e.operator === "&&") { t = this.infer(e, env); break; }
        const [T, F] = this.cond(e.left, env);
        const lt = this.facts.types.get(e.left)!;
        const r = this.check(e.right, { ...env, flow: e.operator === "||" ? F : new Map(env.flow) }, expected);
        env.flow = this.join(T, F)!;
        return this.rec(e, this.logicalType(e, lt, r));
      }
      case "CallExpression": case "NewExpression": t = this.call(e, env, expected); break;
      default: t = this.infer(e, env);
    }
    this.rec(e, t);
    if (!soft) this.expect(e, t, expected, q);
    return t;
  }
  ctxSensitive(e: Node) { return /^(ObjectExpression|ArrayExpression|ArrowFunctionExpression|FunctionExpression)$/.test(e.type); }
  expect(at: Node, t: Ty, expected: Ty, ctx = false): boolean {
    if (this.reg.sub(t, expected)) return ctx || this.hides(at, t, expected);
    let rule = "type";
    if (this.reg.sub(this.nonUndef(t), expected)) rule = "possibly-undefined";
    else if (members(t).some((m) => isNamed(m, "Action")) && !members(expected).some((m) => isNamed(m, "Action"))) rule = "action-pass";
    this.err(at, rule, `${show(t)} is not assignable to ${show(expected)}`);
    return false;
  }

  // An Action placed where its type becomes unknown, object or a type parameter of a function that is not a built-in
  // (opaque) is [action-pass] (S6.6): there it is no longer told apart from other values. Returns true when it is not.
  hides(at: Node, t: Ty, expected: Ty, opaque: Set<string> | null = null): boolean {
    const w = t === expected ? null : this.reg.peek(() => this.hidden(t, expected, opaque));
    if (w) this.err(at, "action-pass", `${show(t)} is given the type ${show(expected)}, which hides its ${w}; an Action goes only where an Action is expected`);
    return !w;
  }
  // the first Action in s that a position of t of type unknown, object or an opaque type parameter would take
  hidden(s: Ty, t: Ty, opaque: Set<string> | null, depth = 0): string | null {
    if (depth > 10 || s.k === "err" || t.k === "err" || s.k === "never") return null;
    const H = (a: Ty, b: Ty) => this.hidden(a, b, opaque, depth + 1);
    if (t.k === "unknown" || t.k === "object" || (t.k === "tv" && opaque?.has(t.n))) return this.actionIn(s, 0);
    if (s.k === "named" && this.reg.isAlias(s.n)) return H(this.reg.expand(s), t);
    if (t.k === "named" && this.reg.isAlias(t.n)) return H(s, this.reg.expand(t));
    if (s.k === "union") { for (const m of s.ts) { const w = H(m, t); if (w) return w; } return null; }
    if (s.k === "named" && (s.n === "Mut" || s.n === "Borrowed") && !isNamed(t, s.n)) return H(s.args[0], t);
    if (t.k === "union") {
      // s goes to a member it is assignable to; it is hidden only when every such member hides it
      let w: string | null = null;
      for (const m of t.ts.filter((x) => this.reg.sub(s, x))) { const x = H(s, m); if (!x) return null; w = x; }
      return w;
    }
    const sx = this.reg.expand(s);
    switch (t.k) {
      case "arr": {
        const els = sx.k === "arr" ? [sx.el] : sx.k === "tup" ? sx.els : [this.reg.iterElem(sx) ?? NEVER];
        for (const x of els) { const w = H(x, t.el); if (w) return w; }
        return null;
      }
      case "tup":
        if (sx.k !== "tup") return null;
        for (let i = 0; i < t.els.length && i < sx.els.length; i++) { const w = H(sx.els[i], t.els[i]); if (w) return w; }
        return null;
      case "rec": {
        for (const [k, p] of t.props) { const sp = this.reg.member(sx, k); const w = sp && H(propT(sp), propT(p)); if (w) return w; }
        if (t.index && sx.k === "rec") for (const p of sx.props.values()) { const w = H(propT(p), t.index); if (w) return w; }
        for (const c of t.calls ?? []) { const w = this.hiddenFn(s, c, opaque, depth); if (w) return w; }
        return null;
      }
      case "fn": return this.hiddenFn(s, t, opaque, depth);
      case "named": {
        if (t.n === "Iterable" || t.n === "ArrayLike") { const el = this.reg.iterElem(sx); return el ? H(el, t.args[0]) : null; }
        if (sx.k !== "named" || sx.n !== t.n) return null;
        for (let i = 0; i < t.args.length; i++) { const w = sx.args[i] && H(sx.args[i], t.args[i]); if (w) return w; }
        return null;
      }
      default: return null;
    }
  }
  // a function of type s used as t: what it returns goes to t's return type, and what t's caller passes goes to s's parameters
  hiddenFn(s: Ty, t: Fn, opaque: Set<string> | null, depth: number): string | null {
    const f = this.reg.callSigs(s)[0];
    if (!f) return null;
    const w = this.hidden(f.ret, t.ret, opaque, depth + 1);
    if (w) return w;
    for (let i = 0; i < t.ps.length && i < f.ps.length; i++) { const x = this.hidden(t.ps[i].t, f.ps[i].t, opaque, depth + 1); if (x) return x; }
    return null;
  }
  // the first promise-like held anywhere in s: a Promise, a type with a then member, or object, which may be one
  promiseIn(s: Ty, depth: number): string | null {
    if (depth > 10) return null;
    const A = (x: Ty) => this.promiseIn(x, depth + 1);
    const first = (xs: Ty[]) => { for (const x of xs) { const w = A(x); if (w) return w; } return null; };
    if (s.k === "object" || (s.k !== "union" && s.k !== "err" && this.reg.member(s, "then"))) return show(s);
    switch (s.k) {
      case "named":
        if (s.n === "Promise") return show(s);
        if (this.reg.isAlias(s.n)) return A(this.reg.expand(s));
        return first(s.args);
      case "arr": return A(s.el);
      case "tup": return first(s.els);
      case "union": return first(s.ts);
      case "rec": return first([...[...s.props.values()].map((p) => p.t), ...(s.index ? [s.index] : [])]);
      default: return null;
    }
  }
  // the first Action held anywhere in s: in an element, a property, a type argument or what a function returns
  actionIn(s: Ty, depth: number): string | null {
    if (depth > 10) return null;
    const A = (x: Ty) => this.actionIn(x, depth + 1);
    const first = (xs: Ty[]) => { for (const x of xs) { const w = A(x); if (w) return w; } return null; };
    switch (s.k) {
      case "named":
        if (s.n === "Action") return show(s);
        if (this.reg.isAlias(s.n)) return A(this.reg.expand(s));
        return first(s.args);
      case "arr": return A(s.el);
      case "tup": return first(s.els);
      case "union": return first(s.ts);
      case "rec": return first([...[...s.props.values()].map((p) => p.t), ...(s.index ? [s.index] : []), ...(s.calls ?? []).map((c) => c.ret)]);
      case "fn": return A(s.ret);
      default: return null;
    }
  }

  infer(e: Node, env: Env): Ty {
    const q = this.quiet;
    this.quiet = 0;
    try { return this.rec(e, this.infer1(e, env)); } finally { this.quiet = q; }
  }
  infer1(e: Node, env: Env): Ty {
    switch (e.type) {
      case "Literal":
        if (e.regex) return named("RegExp");
        if (e.bigint !== undefined) return BIGINT;
        if (e.value === null) return NULL;
        return lit(e.value);
      case "TemplateLiteral":
        for (const x of e.expressions) this.infer(x, env);
        return e.expressions.length ? STR : lit(e.quasis[0].value.cooked);
      case "Identifier": return this.ident(e, env);
      case "ThisExpression": case "ClassExpression": case "ImportExpression": case "TSNonNullExpression": case "TSTypeAssertion":
        if (e.expression) this.infer(e.expression, env);
        return ERR; // reported by the syntax pass
      case "TSAsExpression":
        if (e.typeAnnotation.type === "TSTypeReference" && e.typeAnnotation.typeName.name === "const") return this.constLit(e.expression, env);
        this.infer(e.expression, env);
        return ERR;
      case "ObjectExpression": return this.objLit(e, env, undefined);
      case "ArrayExpression": return this.arrLit(e, env, undefined);
      case "ArrowFunctionExpression": case "FunctionExpression": return this.fnExpr(e, env, undefined);
      case "MemberExpression": return this.member(e, env);
      case "ChainExpression": {
        const t = this.infer(e.expression, env);
        return this.short.has(e.expression) ? union([t, UNDEF]) : t;
      }
      case "CallExpression": case "NewExpression": return this.call(e, env, undefined);
      case "UnaryExpression": return this.unary(e, env);
      case "UpdateExpression": {
        const t = this.lvalue(e.argument, env, e);
        if (e.argument.type === "Identifier") { const b = env.scope.get(e.argument.name); if (b) this.dropRoot(env.flow, b); }
        if (t.k !== "err" && !this.reg.sub(t, NUM)) this.err(e, "type", `${e.operator} on ${show(t)}`);
        return NUM;
      }
      case "BinaryExpression": return this.binary(e, env);
      case "LogicalExpression": {
        const [T, F] = this.cond(e.left, env);
        const lt = this.facts.types.get(e.left)!;
        const rEnv = { ...env, flow: e.operator === "&&" ? T : e.operator === "||" ? F : new Map(env.flow) };
        const rt = this.infer(e.right, rEnv);
        env.flow = e.operator === "&&" ? this.join(F, rEnv.flow)! : e.operator === "||" ? this.join(T, rEnv.flow)! : this.join(env.flow, rEnv.flow)!;
        return this.logicalType(e, lt, rt);
      }
      case "ConditionalExpression": return this.conditional(e, env, undefined);
      case "AssignmentExpression": return this.assign(e, env);
      case "AwaitExpression": {
        if (!env.fi.isAsync) this.err(e, "type", "await outside an async function");
        else if (env.fi.inAction) this.err(e, "action-async", "await in an action body: an action is synchronous; wait in an async cell and give the result to an action (S6.12)");
        return this.awaited(this.infer(e.argument, env));
      }
      case "YieldExpression": {
        if (!env.fi.isGen) this.err(e, "type", "yield outside a generator");
        if (e.delegate) { this.unsupported(e, "yield*"); return ERR; }
        const t = e.argument ? this.check(e.argument, env, env.fi.yieldCtx) : UNDEF;
        if (!e.argument && env.fi.yieldCtx && !this.reg.sub(UNDEF, env.fi.yieldCtx)) this.err(e, "type", `yield without a value from a generator yielding ${show(env.fi.yieldCtx)}`);
        env.fi.yields.push(t);
        return UNKNOWN;
      }
      case "JSXElement": case "JSXFragment": return this.jsx(e, env);
      case "SequenceExpression": this.unsupported(e, "comma expression"); return ERR;
      case "TaggedTemplateExpression": this.unsupported(e, "tagged template"); return ERR;
      default: this.unsupported(e, e.type); return ERR;
    }
  }
  // JSX is checked as the call it lowers to: an intrinsic tag against IntrinsicElements[tag], a
  // component as a call with one props object. Synthetic nodes reuse the original positions, and the
  // attribute expressions are the original nodes, so ownership facts land on the real tree.
  jsx(e: Node, env: Env): Ty {
    const ELEM = named("Elem");
    const at = (n: Node, extra: object) => ({ start: n.start, end: n.end, loc: n.loc, ...extra }) as Node;
    const prop = (n: Node, keyAt: Node, name: string, value: Node) =>
      at(n, { type: "Property", kind: "init", computed: false, method: false, shorthand: false, key: at(keyAt, { type: "Identifier", name }), value });
    const children: Node[] = [];
    for (const c of e.children) {
      if (c.type === "JSXText") {
        const t = c.value.replace(/\s*\n\s*/g, " ");
        if (t.trim() === "" && /\n/.test(c.value)) continue;
        children.push(at(c, { type: "Literal", value: t, raw: JSON.stringify(t) }));
      } else if (c.type === "JSXExpressionContainer") {
        if (c.expression.type !== "JSXEmptyExpression") children.push(c.expression);
      } else if (c.type === "JSXElement" || c.type === "JSXFragment") children.push(c);
      else { this.unsupported(c, c.type); return ERR; }
    }
    if (e.type === "JSXFragment") { children.forEach((k) => this.check(k, env, named("Child"))); return ELEM; }
    const op = e.openingElement;
    const props: Node[] = [];
    for (const a of op.attributes) {
      if (a.type !== "JSXAttribute" || a.name.type !== "JSXIdentifier") { this.unsupported(a, a.type === "JSXAttribute" ? "namespaced attribute" : "spread attribute"); return ERR; }
      let v: Node;
      if (a.value === null) v = at(a, { type: "Literal", value: true, raw: "true" });
      else if (a.value.type === "Literal") v = a.value;
      else if (a.value.type === "JSXExpressionContainer" && a.value.expression.type !== "JSXEmptyExpression") v = a.value.expression;
      else { this.unsupported(a, "attribute value"); return ERR; }
      props.push(prop(a, a.name, a.name.name, v));
    }
    if (children.length) props.push(prop(e, e, "children", at(e, { type: "ArrayExpression", elements: children })));
    const obj = at(op, { type: "ObjectExpression", properties: props });
    const name = op.name;
    if (name.type !== "JSXIdentifier") { this.unsupported(name, "member or namespaced element name"); return ERR; }
    if (/^[a-z]/.test(name.name)) {
      const p = this.reg.member(named("IntrinsicElements"), name.name);
      if (!p) { this.err(name, "no-member", `<${name.name}> is not a declared element`); this.infer(obj, env); return ERR; }
      this.check(obj, env, p.t);
      return ELEM;
    }
    const call = at(e, { type: "CallExpression", optional: false, callee: at(name, { type: "Identifier", name: name.name }), arguments: [obj] });
    const t = this.call(call, env, ELEM);
    if (t.k !== "err" && !this.reg.sub(t, ELEM)) this.err(e, "type", `component ${name.name} returns ${show(t)}, not Elem`);
    return ELEM;
  }
  conditional(e: Node, env: Env, expected: Ty | undefined): Ty {
    const [T, F] = this.cond(e.test, env);
    const a = this.check(e.consequent, { ...env, flow: T }, expected);
    const b = this.check(e.alternate, { ...env, flow: F }, expected);
    env.flow = this.join(T, F)!;
    return union([a, b]);
  }
  // await: a member that may be a thenable other than a Promise gives unknown. declared: an async function's
  // return annotation, where the member is the type returned, not awaited
  awaited(t: Ty, declared = false): Ty {
    return union(this.um(t).map((m) => (isNamed(m, "Promise") ? m.args[0] : !declared && (m.k === "object" || this.reg.member(m, "then")) ? UNKNOWN : m)));
  }
  // As TypeScript: when the left operand decides the result on every value, the right one adds nothing.
  logicalType(e: Node, lt: Ty, rt: Ty): Ty {
    if (e.operator === "&&") return this.truthy(lt).k === "never" ? lt : union([this.falsy(lt), rt]);
    if (e.operator === "||") return this.falsy(lt).k === "never" ? lt : union([this.truthy(lt), rt]);
    return this.um(lt).some((m) => ["null", "undef", "void", "unknown", "tv", "err"].includes(m.k)) ? union([this.nonNullish(lt), rt]) : lt;
  }
  constLit(e: Node, env: Env): Ty {
    if (e.type === "ArrayExpression") return this.rec(e, { k: "tup", els: e.elements.map((x: Node) => (x && x.type !== "SpreadElement" ? this.constLit(x, env) : (this.unsupported(e, "as const with spread"), ERR))) });
    if (e.type === "ObjectExpression") {
      const r: Rec = { k: "rec", props: new Map() };
      for (const p of e.properties) {
        if (p.type !== "Property" || p.computed || p.kind !== "init" || p.method) { this.unsupported(p, "as const object member"); continue; }
        r.props.set(p.key.name ?? String(p.key.value), { t: this.constLit(p.value, env), opt: false });
      }
      return this.rec(e, r);
    }
    return this.infer(e, env);
  }

  ident(e: Node, env: Env): Ty {
    this.identHook?.(e, env);
    const b = env.scope.get(e.name);
    if (!b) {
      if (e.name === "arguments") return ERR; // syntax pass
      if (this.cellNames.has(e.name)) this.err(e, "cell-by-name", `cell ${e.name} referenced by name; take it as a parameter`);
      else if (ALLOWED_GLOBALS.has(e.name)) this.unsupported(e, `intrinsic ${e.name} has no signature in lite/intrinsics.ts`);
      else this.err(e, "free-name", `free name ${e.name}`);
      return ERR;
    }
    this.facts.bindingOf.set(e, b);
    if (b.kind === "prelude") return b.t;
    const k = "#" + b.id;
    const nt = env.flow.get(k);
    if (nt) return nt;
    if (b.lazy && !b.checked) return b.lazy();
    return b.t;
  }

  short = new Set<Node>(); // members/calls of an optional chain after a ?. link: they see the non-nullish value
  member(e: Node, env: Env): Ty {
    const ot0 = this.infer(e.object, env);
    const k = this.pathKey(e, env);
    const nt = k ? env.flow.get(k) : undefined;
    const isShort = e.optional || this.short.has(e.object);
    if (isShort) this.short.add(e);
    const ot0b = this.collapseArrays(ot0);
    const ot = isShort ? this.nonNullish(ot0b) : ot0b;
    let t: Ty;
    // x["0"] on an array-like is an index read, as in TypeScript
    const numStr = e.computed && e.property.type === "Literal" && typeof e.property.value === "string" && /^(0|[1-9]\d*)$/.test(e.property.value)
      && this.um(ot).some((m) => { const x = this.reg.expand(unwrap(m)); return x.k === "arr" || x.k === "tup" || !!x.k && this.reg.member(x, "length") !== undefined && !this.reg.member(x, e.property.value); });
    if (numStr) { this.rec(e.property, lit(Number(e.property.value))); t = this.index(ot, lit(Number(e.property.value)), e); }
    else if (e.computed && !(e.property.type === "Literal" && typeof e.property.value === "string")) {
      const it = this.infer(e.property, env);
      t = this.index(ot, it, e);
    } else {
      const name = e.computed ? e.property.value : e.property.name;
      const out: Ty[] = [];
      let flags: Flags | undefined;
      let bad = false;
      for (const m of this.um(ot)) {
        if (m.k === "err") { bad = true; out.push(ERR); continue; }
        if (memberless(m)) { this.err(e, "type", `${show(m)} has no members`); bad = true; continue; }
        if (this.reg.expand(m).k === "err") { bad = true; out.push(ERR); continue; } // unconverted alias: reported where it was converted
        const p = this.reg.member(m, name);
        if (!p) { this.memberMissing(m, name, e.property); bad = true; out.push(ERR); continue; }
        if (isNamed(unwrap(m), "State")) this.inActionOnly(env, e, "state-write", `State.${name} outside action(...)`);
        if (p.flags?.banned) this.err(e, "banned-member", `${this.parsed.src.slice(e.object.start, e.object.end)}.${name} is banned`);
        flags = p.flags ?? flags;
        let pt = propT(p);
        if (isNamed(m, "Borrowed") && p.flags?.view && !this.reg.callSigs(pt).length) pt = named("Borrowed", pt);
        out.push(pt);
      }
      this.facts.memberFlags.set(e, flags);
      t = bad && out.length === 0 ? ERR : union(out);
    }
    if (nt) t = nt;
    return t;
  }
  // A | B arrays read as (A | B)[]: sound because arrays are immutable outside Mut.
  collapseArrays(t: Ty): Ty {
    const ms = this.um(t);
    const arrs = ms.filter((m) => m.k === "arr" || m.k === "tup");
    if (arrs.length < 2) return t;
    const els = arrs.map((m) => (m.k === "arr" ? m.el : union((m as any).els)));
    return union([...ms.filter((m) => !arrs.includes(m)), arr(union(els))]);
  }
  index(ot: Ty, it: Ty, e: Node): Ty {
    const out: Ty[] = [];
    for (const m0 of this.um(ot)) {
      if (m0.k === "err" || it.k === "err") { out.push(ERR); continue; }
      const m = unwrap(m0);
      const x = this.reg.expand(m);
      const numeric = this.reg.sub(it, NUM);
      if (numeric && x.k === "tup" && it.k === "lit" && typeof it.v === "number") {
        if (it.v in x.els) out.push(x.els[it.v]);
        else { this.err(e, "type", `tuple ${show(x)} has no element ${it.v}`); out.push(ERR); }
        continue;
      }
      if (numeric && (x.k === "arr" || x.k === "tup" || x.k === "str" || (x.k === "lit" && typeof x.v === "string") || this.reg.isTypedArray(x))) {
        out.push(this.reg.iterElem(x)!);
        if (this.reg.strictIndex) out.push(UNDEF);
        continue;
      }
      if (this.reg.sub(it, STR) && x.k === "rec" && x.index) { out.push(x.index); if (this.reg.strictIndex) out.push(UNDEF); continue; }
      if (x.k === "null" || x.k === "undef") { this.err(e, "possibly-undefined", `index into a value that may be ${show(x)}`); out.push(ERR); continue; }
      this.err(e, "type", `cannot index ${show(m)} with ${show(it)}`);
      out.push(ERR);
    }
    return union(out);
  }

  unary(e: Node, env: Env): Ty {
    if (e.operator === "delete") {
      if (e.argument.type !== "MemberExpression") { this.err(e, "no-delete", "delete"); return BOOL; }
      const ot = this.infer(e.argument.object, env);
      if (!isNamed(ot, "Mut")) this.err(e, "no-delete", "delete on a value that is not Mut");
      // the property read too, so a name that is not a property is reported and completion sees the member
      else this.infer(e.argument, env);
      return BOOL;
    }
    if (e.operator === "!") { this.cond(e.argument, env); return BOOL; }
    const t = this.infer(e.argument, env);
    if (t.k === "err" && e.operator !== "typeof") return ERR;
    switch (e.operator) {
      case "typeof": return STR;
      case "void": return UNDEF;
      case "-": case "+": case "~":
        if (e.operator === "-" && e.argument.type === "Literal" && typeof e.argument.value === "number") return lit(-e.argument.value);
        if (e.operator !== "+" && this.reg.sub(t, BIGINT)) return BIGINT;
        if (e.operator !== "+") this.numeric(e.argument, t);
        return NUM;
    }
    this.unsupported(e, `unary ${e.operator}`);
    return ERR;
  }
  numeric(at: Node, t: Ty): boolean {
    if (t.k === "err" || this.reg.sub(t, NUM)) return true;
    if (this.reg.sub(this.nonUndef(this.filter(t, (m) => m.k !== "null")), NUM)) { this.err(at, "possibly-undefined", `${show(t)} used as a number`); return false; }
    this.err(at, "type", `${show(t)} used as a number`);
    return false;
  }
  // TypeScript's "no overlap" comparison error, for operands that are unions of primitives only.
  noOverlap(a: Ty, b: Ty): boolean {
    const prim = (m: Ty) => ["num", "str", "bigint", "null", "undef", "void", "lit"].includes(m.k);
    const ma = this.um(a).map((m) => this.reg.expand(m)), mb = this.um(b).map((m) => this.reg.expand(m));
    if (!ma.every(prim) || !mb.every(prim)) return false;
    const nul = (m: Ty) => m.k === "null" || m.k === "undef" || m.k === "void";
    if (ma.some(nul) || mb.some(nul)) return false; // TypeScript allows comparing anything with null/undefined
    return !ma.some((x) => mb.some((y) => this.reg.sub(x, y) || this.reg.sub(y, x)));
  }
  binary(e: Node, env: Env): Ty {
    const op = e.operator;
    if (op === "instanceof") { this.unsupported(e, "instanceof"); return BOOL; }
    const a = this.infer(e.left, env), b = this.infer(e.right, env);
    if ((a.k === "err" || b.k === "err") && !["===", "!==", "==", "!=", "<", ">", "<=", ">=", "in"].includes(op)) return ERR;
    switch (op) {
      case "===": case "!==": case "==": case "!=":
        if (!isPrimitive(a) && !isPrimitive(b)) this.err(e, "strict-eq-object", `${op} on two non-primitive operands; use equals(a, b)`);
        else if (this.noOverlap(a, b)) this.err(e, "type", `${op} between ${show(a)} and ${show(b)}, which have no value in common`);
        return BOOL;
      case "+": {
        const isStr = (t: Ty) => this.reg.sub(t, STR);
        if (isStr(a) || isStr(b)) return STR;
        if (this.reg.sub(a, BIGINT) && this.reg.sub(b, BIGINT)) return BIGINT;
        this.numeric(e.left, a); this.numeric(e.right, b);
        return NUM;
      }
      case "<": case ">": case "<=": case ">=": {
        const na = this.nonUndef(a), nb = this.nonUndef(b);
        const dom = [STR, BIGINT].find((d) => this.reg.sub(na, d) && this.reg.sub(nb, d));
        if (!dom) { this.numeric(e.left, a); this.numeric(e.right, b); }
        else for (const [x, t] of [[e.left, a], [e.right, b]] as const) if (!this.reg.sub(t, dom)) this.err(x, "possibly-undefined", `${show(t)} compared with ${op}`);
        return BOOL;
      }
      case "in":
        if (!this.reg.sub(a, STR)) this.err(e.left, "type", `in with a ${show(a)} key`);
        for (const m of this.um(b)) {
          if (m.k === "unknown" || m.k === "tv") { this.err(e.right, "type", `in on ${show(m)}, which may be a primitive; narrow it with typeof first`); break; }
          if (isPrimitive(m) && m.k !== "err") { this.err(e.right, m.k === "null" || m.k === "undef" ? "possibly-undefined" : "type", `in on a value that may be ${show(m)}`); break; }
        }
        return BOOL;
      default:
        if (this.reg.sub(a, BIGINT) && this.reg.sub(b, BIGINT)) return BIGINT;
        this.numeric(e.left, a); this.numeric(e.right, b);
        return NUM;
    }
  }

  // Assignment target: returns the declared type of the target. Applies the write rules.
  lvalue(t: Node, env: Env, at: Node): Ty {
    if (t.type === "Identifier") {
      const b = env.scope.get(t.name);
      if (!b) { this.ident(t, env); return ERR; }
      this.facts.bindingOf.set(t, b);
      if (b.kind !== "let" && b.kind !== "param") { this.err(at, "const-assign", `assignment to ${b.kind} ${t.name}`); return ERR; }
      return b.t;
    }
    if (t.type === "MemberExpression") {
      this.writeRule(t.object, env, at, "member-write");
      const ot = this.facts.types.get(t.object)!;
      if (t.computed && !(t.property.type === "Literal" && typeof t.property.value === "string")) {
        const it = this.infer(t.property, env);
        const save = this.reg.strictIndex;
        this.reg.strictIndex = false;
        const r = this.index(ot, it, t);
        this.reg.strictIndex = save;
        return this.rec(t, r);
      }
      const name = t.computed ? t.property.value : t.property.name;
      return this.rec(t, this.propOf(ot, name, t.property));
    }
    if (t.type === "ArrayPattern" || t.type === "ObjectPattern") {
      const parts = t.type === "ArrayPattern" ? t.elements : t.properties.map((p: Node) => (p.type === "Property" ? p.value : p));
      for (const p of parts) if (p) this.lvalue(p.type === "AssignmentPattern" ? p.left : p, env, at);
      this.unsupported(t, "destructuring assignment");
      return ERR;
    }
    this.unsupported(t, `assignment target ${t.type}`);
    return ERR;
  }
  // A write to obj.x / obj[i] / obj.method(): obj must have type Mut<T>.
  writeRule(obj: Node, env: Env, at: Node, rule: string) {
    const ot = this.infer(obj, env);
    if (ot.k === "err" || isNamed(ot, "Mut")) return;
    let root = obj;
    while (root.type === "MemberExpression") root = root.object;
    const rt = this.facts.types.get(root);
    if (rt && isNamed(rt, "Mut")) this.err(at, "mut-deep-write", `write below the first level of a Mut (${show(ot)} is not Mut)`);
    else this.err(at, rule, `write to a ${show(ot)}, which is not Mut`);
  }
  assign(e: Node, env: Env): Ty {
    if (!MUTATING_OPS.has(e.operator)) { this.unsupported(e, `assignment ${e.operator}`); return ERR; }
    const id = e.left.type === "Identifier";
    const b = id ? env.scope.get(e.left.name) : undefined;
    const decl = this.lvalue(e.left, env, e);
    let v: Ty;
    if (e.operator === "=") v = this.check(e.right, env, decl.k === "err" ? undefined : decl);
    else {
      const cur = id ? this.ident(e.left, env) : decl;
      v = this.compound(e, cur, this.infer(e.right, env));
      if (decl.k !== "err") this.expect(e, v, decl);
    }
    if (b && decl.k !== "err") {
      this.dropRoot(env.flow, b);
      env.flow.set("#" + b.id, this.reg.sub(v, decl) ? v : decl);
    }
    return v;
  }
  compound(e: Node, cur: Ty, r: Ty): Ty {
    const op = e.operator.slice(0, -1);
    if (op === "+" && (this.reg.sub(cur, STR) || this.reg.sub(r, STR))) return STR;
    if (op === "&&" || op === "||" || op === "??") { this.unsupported(e, `logical assignment ${e.operator}`); return ERR; }
    this.numeric(e.left, cur); this.numeric(e.right, r);
    return NUM;
  }

  // ---- literals ----
  objLit(e: Node, env: Env, expected: Ty | undefined): Ty {
    const r: Rec = { k: "rec", props: new Map() };
    const recs = expected ? this.um(expected).map((m) => this.reg.expand(isNamed(m, "Mut") ? m.args[0] : m)).filter((m) => m.k === "rec") as Rec[] : [];
    const exact = expected !== undefined && recs.length > 0 && recs.length === this.um(expected).filter((m) => m.k !== "null" && m.k !== "undef").length && recs.every((x) => !x.index);
    for (const p of e.properties) {
      if (p.type === "SpreadElement") {
        const st = this.infer(p.argument, env);
        const ms = this.um(unwrap(st)).filter((m) => m.k !== "undef" && m.k !== "null");
        if (ms.length !== 1) { if (st.k !== "err") this.unsupported(p, `object spread of ${show(st)}`); continue; }
        const x = this.reg.expand(ms[0]);
        if (x.k !== "rec" || x.index) { if (x.k !== "err") this.unsupported(p, `object spread of ${show(x)}`); continue; }
        for (const [k, v] of x.props) r.props.set(k, v);
        continue;
      }
      if (p.kind !== "init") { this.unsupported(p, `${p.kind} accessor`); continue; }
      if (p.computed) { this.unsupported(p, "computed property"); continue; }
      const k = p.key.type === "Identifier" ? p.key.name : String(p.key.value);
      const cs = recs.map((x) => x.props.get(k)?.t ?? x.index).filter((c): c is Ty => !!c);
      const ctx = cs.length ? union(cs) : undefined;
      if (exact && ctx === undefined) this.err(p, "excess-property", `property ${k} is not in ${show(expected!)}`);
      let t = this.check(p.value, env, ctx);
      if (!expected) t = widen(t);
      r.props.set(k, { t, opt: false });
    }
    return r;
  }
  arrLit(e: Node, env: Env, expected: Ty | undefined): Ty {
    const ms = expected ? this.um(expected).map((m) => this.reg.expand(m)) : [];
    const tup = ms.find((m) => m.k === "tup" && m.els.length === e.elements.length) as { k: "tup"; els: Ty[] } | undefined;
    const noSpread = e.elements.every((x: Node | null) => x && x.type !== "SpreadElement");
    if (tup && noSpread) return { k: "tup", els: e.elements.map((x: Node, i: number) => this.check(x, env, tup.els[i])) };
    const elCtx = expected ? union(ms.map((m) => (m.k === "arr" ? m.el : m.k === "named" && (m.n === "Iterable" || m.n === "ArrayLike") ? m.args[0] : NEVER))) : undefined;
    const ctx = elCtx && elCtx.k !== "never" ? elCtx : undefined;
    const els: Ty[] = [];
    for (const x of e.elements) {
      if (!x) { this.unsupported(e, "array hole"); continue; }
      if (x.type === "SpreadElement") {
        const st = this.infer(x.argument, env);
        const el = this.reg.iterElem(st);
        if (!el) this.err(x, "type", `spread of non-iterable ${show(st)}`);
        els.push(el ?? ERR);
        continue;
      }
      els.push(this.check(x, env, ctx));
    }
    const el = union(els);
    return arr(ctx ? el : widen(el));
  }

  // ---- functions ----
  fnExpr(e: Node, env: Env | null, expected: Ty | undefined, cell?: { injected: Ty[] }): Fn {
    const ctxSig = expected ? this.reg.callSigs(expected).filter((f) => !f.tps.length)[0] : undefined;
    const scope = new Scope(env ? env.scope : this.globals);
    const fi: FnInfo = {
      node: e, parent: env?.fi ?? null, isAsync: !!e.async, isGen: !!e.generator, isCell: !!cell,
      inAction: !!env?.fi.inAction, rets: [], yields: [],
    };
    this.facts.fnInfo.set(e, fi);
    // Narrowings of const roots survive into a closure; let and reassigned-parameter roots do not.
    const flow = new Map<string, Ty>();
    if (env) for (const [k, t] of env.flow) {
      const id = Number(pathOf(k).slice(1).split(".")[0]);
      const b = this.findBinding(env.scope, id);
      if (b && (b.kind === "const" || b.kind === "fn" || (b.kind === "param" && !b.assigned))) flow.set(k, t);
    }
    const inner: Env = { scope, flow, fi };
    if (e.type === "FunctionExpression" && e.id) {
      const pre = this.annotatedSig(e, inner);
      this.declare(inner, e.id.name, pre ?? ERR, "fn", e.id, { fnNode: e, lazy: pre ? undefined : () => (this.unsupported(e, "recursive function without a return type"), ERR) });
    }
    const assigned = this.assignedNames(e.body);
    const ps: Param[] = [];
    let rest: Ty | undefined;
    e.params.forEach((p: Node, i: number) => {
      const ann = (p.type === "AssignmentPattern" ? p.left : p.type === "RestElement" ? p : p).typeAnnotation?.typeAnnotation;
      let t: Ty;
      if (ann) t = this.reg.convert(ann, this.typeCtx(inner), this.parsed);
      else if (cell) t = cell.injected[i] ?? ERR;
      else if (ctxSig) {
        if (i >= ctxSig.ps.length && !ctxSig.rest && p.type !== "RestElement") this.err(p, "arity", "callback takes more parameters than its context provides");
        t = p.type === "RestElement" ? arr(ctxSig.rest ?? UNKNOWN) : (ctxSig.ps[i]?.t ?? ctxSig.rest ?? UNDEF);
      }
      else { this.err(p, "untyped-parameter", "parameter has no type and no contextual type"); t = ERR; }
      if (ctxSig && ann && !cell) { const ct = ctxSig.ps[i]?.t; if (ct && !this.reg.sub(ct, t)) this.err(p, "type", `parameter ${show(t)} does not accept ${show(ct)}`); }
      if (p.type === "RestElement") {
        rest = t.k === "arr" ? t.el : ERR;
        this.bindPattern(p.argument, t, inner, "param");
        return;
      }
      const pt = p.optional ? union([t, UNDEF]) : t;
      ps.push({ n: p.name ?? `p${i}`, t: pt, opt: p.type === "AssignmentPattern" || !!p.optional });
      const id = p.type === "AssignmentPattern" ? p.left : p;
      if (id.type === "Identifier") this.bindPattern(p, pt, inner, "param", { cellParam: !!cell, assigned: assigned.has(id.name) });
      else this.bindPattern(p, t, inner, "param", { assigned: true });
    });
    let retAnn: Ty | undefined = e.returnType ? this.reg.convert(e.returnType.typeAnnotation, this.typeCtx(inner), this.parsed) : undefined;
    // an async function returns a promise, and a generator function a generator, whatever its body returns
    if (retAnn && fi.isAsync && !fi.isGen && retAnn.k !== "err" && !isNamed(this.reg.expand(retAnn), "Promise")) {
      this.err(e.returnType, "type", `an async function returns a Promise; its return type ${show(retAnn)} is not Promise<…>`);
      retAnn = named("Promise", retAnn);
    }
    if (retAnn && fi.isGen && retAnn.k !== "err") {
      const g = this.reg.expand(retAnn);
      if (isNamed(g, "Generator")) fi.yieldCtx = g.args[0];
      else { this.err(e.returnType, "type", `a generator function returns a Generator; its return type ${show(retAnn)} is not Generator<…>`); retAnn = ERR; }
    }
    const ctxRet = !retAnn && ctxSig && !hasTv(ctxSig.ret) ? ctxSig.ret : undefined;
    const declared = retAnn ?? ctxRet;
    if (declared && !fi.isGen) fi.retCtx = fi.isAsync ? this.awaited(declared, true) : declared.k === "void" ? undefined : declared;
    fi.retFromCtx = !retAnn && ctxRet !== undefined;
    let reachable = true;
    if (e.body.type === "BlockStatement") {
      this.hoist(e.body.body, inner);
      reachable = this.stmts(e.body.body, inner);
    } else {
      const t = this.returned(e.body, inner);
      fi.rets.push(t);
      reachable = false;
    }
    let ret: Ty;
    if (fi.isGen) {
      const y = union(fi.yields);
      ret = retAnn ?? named("Generator", y.k === "never" ? UNDEF : ctxRet ? y : widen(y));
    } else {
      let r = union(reachable && fi.rets.length ? [...fi.rets, UNDEF] : fi.rets.length ? fi.rets : [VOID]);
      if (!declared) r = widen(r);
      ret = fi.isAsync ? (retAnn ?? named("Promise", r)) : (retAnn ?? (ctxRet && ctxRet.k === "void" ? VOID : r));
      if (retAnn && !fi.isAsync && retAnn.k !== "void" && reachable && e.body.type === "BlockStatement" && retAnn.k !== "err" && !this.reg.sub(UNDEF, retAnn) && !(retAnn.k === "never"))
        this.err(e, "type", `function lacks an ending return statement and its return type ${show(retAnn)} does not include undefined`);
    }
    const tps = tpNames(e.typeParameters);
    for (const x of e.typeParameters?.params ?? []) if (x.constraint || x.default) this.unsupported(x, "type parameter constraint/default");
    return { k: "fn", tps, ps, rest, ret };
  }
  // a returned value, checked against the return context
  returned(e: Node, env: Env): Ty {
    const t = this.check(e, env, env.fi.retCtx, false, !!env.fi.retFromCtx);
    // an async function's promise resolves to what a returned promise resolves to, not to the promise
    if (env.fi.isAsync && !env.fi.isGen && members(this.reg.expand(t)).some((m) => isNamed(this.reg.expand(m), "Promise")))
      this.err(e, "type", `an async function returns ${show(t)}, a promise: await it, so the function's type says what it resolves to`);
    return t;
  }
  findBinding(s: Scope | null, id: number): Binding | undefined {
    for (; s; s = s.parent) for (const b of s.vars.values()) if (b.id === id) return b;
    return undefined;
  }
  typeCtx(env: Env) {
    const tps = new Set<string>();
    for (let fi: FnInfo | null = env.fi; fi; fi = fi.parent) for (const n of tpNames(fi.node.typeParameters)) tps.add(n);
    return { tps, typeofLookup: (name: string) => { const b = env.scope.get(name); return b && b.kind !== "prelude" ? b.t : undefined; } };
  }
  // A function whose parameters and return type are all annotated has a signature before its body is checked.
  annotatedSig(e: Node, env: Env): Fn | undefined {
    if (!e.returnType || e.params.some((p: Node) => !(p.type === "AssignmentPattern" ? p.left : p).typeAnnotation)) return undefined;
    if (e.typeParameters) return undefined;
    const save = this.diags.length, saveU = this.unsup.length;
    const f = this.reg.sig(e.params, e.returnType.typeAnnotation, undefined, this.typeCtx(env), this.parsed, "user");
    this.diags.length = save; this.unsup.length = saveU;
    if (e.async && !e.generator && !isNamed(this.reg.expand(f.ret), "Promise")) f.ret = named("Promise", f.ret);
    return f;
  }
  assignedNames(n: Node): Set<string> {
    const out = new Set<string>();
    const walk = (x: Node) => {
      if (x.type === "AssignmentExpression") this.patternNames(x.left, out);
      if (x.type === "UpdateExpression" && x.argument.type === "Identifier") out.add(x.argument.name);
      kids(x).forEach(walk);
    };
    walk(n);
    return out;
  }
  patternNames(p: Node | null, out: Set<string>) {
    if (!p) return;
    if (p.type === "Identifier") out.add(p.name);
    else if (p.type === "ArrayPattern") p.elements.forEach((x: Node) => this.patternNames(x, out));
    else if (p.type === "ObjectPattern") p.properties.forEach((x: Node) => this.patternNames(x.type === "RestElement" ? x.argument : x.value, out));
    else if (p.type === "AssignmentPattern") this.patternNames(p.left, out);
    else if (p.type === "RestElement") this.patternNames(p.argument, out);
  }

  // Function declarations are hoisted: bind them first, check their bodies in order.
  hoist(body: Node[], env: Env) {
    for (const s of body) {
      if (s.type !== "FunctionDeclaration") continue;
      const sig = this.annotatedSig(s, env);
      const b = this.declare(env, s.id.name, sig ?? ERR, "fn", s.id, { fnNode: s });
      if (!sig) {
        let busy = false;
        b.lazy = () => {
          if (busy) { this.unsupported(s, "recursive function without a return type"); return ERR; }
          busy = true;
          const f = this.fnExpr(s, { ...env, flow: new Map() }, undefined);
          b.t = f; b.checked = true; b.lazy = undefined;
          return f;
        };
      }
    }
  }

  // ---- calls ----
  call(e: Node, env: Env, expected: Ty | undefined): Ty {
    const callee = e.callee;
    if (e.type === "CallExpression" && callee.type === "Identifier") {
      const b = env.scope.get(callee.name);
      if (b?.kind === "prelude") return this.preludeCall(e, callee.name, env, expected);
      if (b?.kind === "param" && isNamed(b.t, "Compile")) {
        if (this.compileHook) return this.compileHook(e, env);
        this.unsupported(e, "compile outside a module check");
        return ERR;
      }
      if ((b?.kind === "fn" || b?.kind === "const") && b.fnNode) this.facts.calls.set(e, { helper: b });
    }
    let sigs: Fn[];
    let calleeT: Ty;
    // the call is not checked; its arguments still are (a spread's operand only when asked)
    const bail = (spread = false) => { e.arguments.forEach((a: Node) => this.infer(spread && a.type === "SpreadElement" ? a.argument : a, env)); return ERR; };
    if (e.type === "NewExpression") {
      if (callee.type !== "Identifier" || env.scope.get(callee.name)?.kind !== "global") {
        this.err(e, "new-non-intrinsic", "new on something that is not an allowed intrinsic");
        return bail();
      }
      calleeT = this.infer(callee, env);
      const x = this.reg.expand(calleeT);
      sigs = x.k === "rec" ? (x.ctors ?? []) : [];
      if (!sigs.length) { this.unsupported(e, `new ${callee.name}`); return bail(); }
    } else {
      const objectMember = callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "Object" && !callee.computed && env.scope.get("Object")?.kind === "global" ? callee.property.name : null;
      if (objectMember === "assign") return this.objectAssign(e, env);
      if (objectMember === "freeze") return this.objectFreeze(e, env, expected);
      calleeT = this.infer(callee, env);
      if (callee.type === "MemberExpression" || (callee.type === "ChainExpression" && callee.expression.type === "MemberExpression")) {
        const m = callee.type === "ChainExpression" ? callee.expression : callee;
        const fl = this.facts.memberFlags.get(m);
        if (fl?.mutates) this.writeRule(m.object, env, e, "mutating-method");
      }
      if (calleeT.k === "err") return bail(true);
      const isShort = e.optional || this.short.has(callee);
      if (isShort) this.short.add(e);
      const ms = this.um(isShort ? this.nonNullish(calleeT) : calleeT);
      if (ms.some((m) => isNamed(m, "Action"))) {
        this.inActionOnly(env, e, "action-call", "an Action called outside action(...)");
        sigs = [actionFn((ms.find((m) => isNamed(m, "Action")) as any).args[0])];
      } else {
        if (ms.length !== 1) { this.err(e, "type", `call of ${show(calleeT)}`); return bail(); }
        sigs = this.reg.callSigs(ms[0]);
        if (!sigs.length) {
          if (ms[0].k === "null" || ms[0].k === "undef") this.err(e, "possibly-undefined", `call of a value that may be ${show(ms[0])}`);
          else this.err(e, "type", `${show(ms[0])} is not callable`);
          return bail();
        }
      }
    }
    const explicit = this.typeArgs(e, env);
    let t: Ty = ERR;
    if (sigs.length === 1) t = this.apply(e, sigs[0], env, expected, explicit);
    else {
      let done = false;
      for (let i = 0; i < sigs.length && !done; i++) {
        const d = this.diags.length, u = this.unsup.length, flow = new Map(env.flow);
        t = this.apply(e, sigs[i], env, expected, explicit);
        if (this.diags.length === d && this.unsup.length === u) done = true;
        else if (i < sigs.length - 1) { this.diags.length = d; this.unsup.length = u; env.flow = flow; }
      }
    }
    const cm = callee.type === "ChainExpression" ? callee.expression : callee;
    if (cm.type === "MemberExpression" && this.facts.memberFlags.get(cm)?.view && isNamed(this.facts.types.get(cm.object) ?? ERR, "Borrowed")) t = named("Borrowed", t);
    return t;
  }
  typeArgs(e: Node, env: Env): Ty[] | undefined {
    return (e.typeArguments ?? e.typeParameters)?.params?.map((t: Node) => this.reg.convert(t, this.typeCtx(env), this.parsed));
  }
  objectAssign(e: Node, env: Env): Ty {
    const [target, ...src] = e.arguments;
    const tt = target ? this.infer(target, env) : ERR;
    if (!target || (target.type !== "ObjectExpression" && !isNamed(tt, "Mut"))) this.err(e, "object-assign", "Object.assign onto an existing value");
    src.forEach((s: Node) => this.infer(s, env));
    this.unsupported(e, "Object.assign");
    return ERR;
  }
  // Object.freeze of a literal: the value is the cell's own, so freezing it changes nothing another cell holds
  objectFreeze(e: Node, env: Env, expected: Ty | undefined): Ty {
    const [a] = e.arguments;
    if (e.arguments.length === 1 && (a.type === "ObjectExpression" || a.type === "ArrayExpression")) return this.check(a, env, expected);
    this.err(e, "object-freeze", "Object.freeze takes one object or array literal");
    e.arguments.forEach((x: Node) => this.infer(x.type === "SpreadElement" ? x.argument : x, env));
    return ERR;
  }
  // Apply one signature: rank-1 inference over arguments, callbacks after the arguments that fix their parameters.
  apply(e: Node, sig0: Fn, env: Env, expected: Ty | undefined, explicit?: Ty[]): Ty {
    const { f: sig, tvs } = instantiate(sig0, fresh);
    fresh += sig0.tps.length;
    const tvSet = new Set(tvs);
    // a function that is not a built-in may narrow a value of its type parameter and read it (S9.2)
    const opaque = sig0.flags?.intrinsic ? null : tvSet;
    const m: Subst = new Map();
    if (explicit) {
      if (explicit.length !== tvs.length) this.err(e, "type", `expected ${tvs.length} type arguments, got ${explicit.length}`);
      tvs.forEach((n, i) => explicit[i] && m.set(n, explicit[i]));
    }
    const fixed = new Set(m.keys());
    const widenFree = () => { for (const [k, v] of m) if (!fixed.has(k)) m.set(k, widen(v)); };
    const args: Node[] = e.arguments;
    const paramAt = (i: number): Ty | undefined => sig.ps[i]?.t ?? sig.rest;
    const required = sig.ps.filter((p) => !p.opt).length;
    if (args.length < required && !args.some((a) => a.type === "SpreadElement")) this.err(e, "arity", `expected at least ${required} arguments, got ${args.length}`);
    if (args.length > sig.ps.length && !sig.rest) this.err(e, "arity", `expected at most ${sig.ps.length} arguments, got ${args.length}`);
    this.facts.calls.set(e, { ...this.facts.calls.get(e), sig: { ...sig, decl: sig0.decl ?? sig0, flags: sig0.flags } });
    const argT: (Ty | undefined)[] = [];
    const deferred: number[] = [];
    const cur = (t: Ty) => subst(t, m);
    const fromRet: Subst = new Map();
    if (expected && hasTv(sig.ret, tvSet)) this.reg.unify(sig.ret, expected, fromRet, tvSet);
    const ctxSubst = (t: Ty) => { const cm = new Map(m); for (const [k, v] of fromRet) if (!cm.has(k)) cm.set(k, v); return subst(t, cm); };
    args.forEach((a, i) => {
      const p = paramAt(i);
      if (a.type === "SpreadElement") {
        const st = this.infer(a.argument, env);
        const el = this.reg.iterElem(st);
        if (!el) this.err(a, "type", `spread of non-iterable ${show(st)}`);
        else if (!sig.rest || i < sig.ps.length) this.unsupported(a, "spread argument to a non-rest parameter");
        else if (!this.reg.sub(el, cur(sig.rest))) this.err(a, "type", `spread element ${show(el)} is not assignable to ${show(cur(sig.rest))}`);
        else this.hides(a, el, sig.rest, opaque);
        argT[i] = ERR;
        return;
      }
      if (!p) { this.infer(a, env); return; }
      const lam = (a.type === "ArrowFunctionExpression" || a.type === "FunctionExpression") && a.params.some((q: Node) => !(q.type === "AssignmentPattern" ? q.left : q).typeAnnotation);
      if (lam && hasTv(cur(p), tvSet)) { deferred.push(i); return; }
      const pc = cur(p);
      // an optional parameter takes undefined; a function argument keeps the parameter's own type as its context
      const fnArg = a.type === "ArrowFunctionExpression" || a.type === "FunctionExpression";
      if (!hasTv(pc, tvSet)) { argT[i] = this.check(a, env, sig.ps[i]?.opt && !fnArg ? union([pc, UNDEF]) : pc); return; }
      const t = this.check(a, env, this.ctxOnly(ctxSubst(p), tvSet), true);
      argT[i] = t;
      this.reg.unify(p, t, m, tvSet);
    });
    widenFree();
    for (const i of deferred) {
      const p = paramAt(i)!;
      const pc = ctxSubst(p);
      const ps = this.reg.callSigs(pc)[0];
      if (ps && ps.ps.some((q) => hasTv(q.t, tvSet))) { this.unsupported(args[i], "callback whose parameter types are not inferred before it"); argT[i] = ERR; continue; }
      const ctxRetOk = ps && !hasTv(ps.ret, tvSet);
      const ctx: Ty = ps ? { ...ps, ret: ctxRetOk ? ps.ret : UNKNOWN } : pc;
      const t = this.fnExpr(args[i], env, ctx);
      this.rec(args[i], t);
      argT[i] = t;
      this.reg.unify(p, t, m, tvSet);
      widenFree();
    }
    for (const n of tvs) {
      if (fixed.has(n)) continue;
      const c = m.get(n) ?? fromRet.get(n);
      m.set(n, c ? (m.has(n) ? widen(c) : c) : UNKNOWN);
    }
    args.forEach((a, i) => {
      const p = paramAt(i);
      const t = argT[i];
      if (!p || !t || a.type === "SpreadElement") return;
      const pc = subst(p, m);
      if ((hasTv(p, tvSet) || deferred.includes(i)) && this.expect(a, t, pc) && opaque && hasTv(p, tvSet)) this.hides(a, t, p, opaque);
    });
    return subst(sig.ret, m);
  }
  // A contextual type with unresolved variables replaced by unknown (keeps tuple/record shape for literals).
  ctxOnly(t: Ty, tvs: Set<string>): Ty | undefined {
    const m: Subst = new Map([...tvs].map((n) => [n, UNKNOWN]));
    const r = subst(t, m);
    return r.k === "unknown" ? undefined : r;
  }

  preludeCall(e: Node, name: string, env: Env, expected: Ty | undefined): Ty {
    this.facts.calls.set(e, { prelude: name });
    const args: Node[] = e.arguments;
    const explicit = this.typeArgs(e, env);
    const one = () => { if (args.length !== 1) this.err(e, "arity", `${name} takes one argument`); return args[0]; };
    switch (name) {
      case "mut": {
        const a = one();
        const inner = expected && isNamed(expected, "Mut") ? expected.args[0] : undefined;
        const t = explicit ? this.check(a, env, explicit[0]) : a ? this.check(a, env, inner) : ERR;
        return named("Mut", explicit ? explicit[0] : inner ?? t);
      }
      case "freeze": case "borrow": case "snapshot": {
        const a = one();
        const t = a ? this.infer(a, env) : ERR;
        const want = name === "snapshot" ? "Borrowed" : "Mut";
        if (t.k === "err") return ERR;
        if (!isNamed(t, want)) { this.err(e, "type", `${name} needs a ${want}<T>, got ${show(t)}`); return ERR; }
        return name === "borrow" ? named("Borrowed", t.args[0]) : t.args[0];
      }
      case "state": {
        const a = one();
        const inner = explicit?.[0] ?? (expected && isNamed(expected, "StateCell") ? expected.args[0] : undefined);
        const t = a ? this.check(a, env, inner) : ERR;
        return named("StateCell", inner ?? widen(t));
      }
      case "action": {
        const a = one();
        if (!a || (a.type !== "ArrowFunctionExpression" && a.type !== "FunctionExpression")) { this.unsupported(e, "action(...) of a non-literal function"); return ERR; }
        const ctx = expected && isNamed(expected, "Action") && expected.args[0].k === "tup" ? actionFn(expected.args[0]) : undefined;
        this.actionBodies.add(a);
        // S6.12: the function is synchronous and returns no promise-like
        if (a.async || a.generator) this.err(a, "action-async", `the function given to action(...) is ${a.async ? "async" : "a generator"}; an action is synchronous (S6.12)`);
        const f = this.fnExpr(a, { ...env, fi: { ...env.fi, inAction: true } }, ctx);
        const p = a.async || a.generator ? null : this.promiseIn(f.ret, 0);
        if (p) this.err(a, "action-async", `the function given to action(...) returns ${p}; an action is synchronous (S6.12)`);
        this.rec(a, f);
        return named("Action", { k: "tup", els: f.ps.map((p) => p.t) });
      }
      case "read": {
        // read(s): the value as of this point in the call order; only inside an action body
        const a = one();
        this.inActionOnly(env, e, "read-outside-action", "read(...) is only for an action body; a cell takes the value as a parameter");
        const t = a ? this.infer(a, env) : ERR;
        if (t.k === "err") return ERR;
        if (!isNamed(t, "State")) { this.err(a!, "type", `read needs a State<T>, got ${show(t)}`); return ERR; }
        return t.args[0];
      }
      case "on": {
        if (args.length !== 2) { this.err(e, "arity", "on takes an events handle and an action"); return named("Listener"); }
        const s = this.infer(args[0], env);
        if (s.k === "err") return named("Listener");
        if (!isNamed(s, "Events")) { this.err(args[0], "type", `on needs an Events<T>, got ${show(s)}`); return named("Listener"); }
        this.check(args[1], env, named("Action", { k: "tup", els: [s.args[0]] }));
        return named("Listener");
      }
      case "equals":
        if (args.length !== 2) this.err(e, "arity", "equals takes two arguments");
        args.forEach((a) => this.infer(a, env));
        return BOOL;
    }
    return ERR;
  }

  // ---- statements; return false when the end is unreachable ----
  stmts(list: Node[], env: Env): boolean {
    let live = true;
    for (const s of list) {
      if (!live) { const dead = { ...env, flow: new Map(env.flow), dead: true }; this.stmt(s, dead); continue; }
      live = this.stmt(s, env);
    }
    return live;
  }
  block(list: Node[], env: Env): boolean {
    const inner: Env = { ...env, scope: new Scope(env.scope) };
    this.hoist(list, inner);
    const r = this.stmts(list, inner);
    env.flow = inner.flow;
    return r;
  }
  sub1(s: Node, env: Env): boolean {
    return s.type === "BlockStatement" ? this.block(s.body, env) : this.stmt(s, env);
  }
  stmt(s: Node, env: Env): boolean {
    switch (s.type) {
      case "BlockStatement": return this.block(s.body, env);
      case "EmptyStatement": return true;
      case "ExpressionStatement": {
        const t = this.infer(s.expression, env);
        return t.k !== "never";
      }
      case "VariableDeclaration": {
        for (const d of s.declarations) this.varDecl(d, s.kind, env);
        return true;
      }
      case "FunctionDeclaration": {
        const b = env.scope.get(s.id.name);
        if (b && !b.checked) {
          b.checked = true;
          const f = this.fnExpr(s, { ...env, flow: new Map(env.flow) }, undefined);
          if (b.t.k === "err") b.t = f;
          b.lazy = undefined;
        }
        return true;
      }
      case "ReturnStatement": {
        const t = s.argument ? this.returned(s.argument, env) : UNDEF;
        if (!s.argument && env.fi.retCtx && !this.reg.sub(UNDEF, env.fi.retCtx)) this.err(s, "type", `return without a value from a function returning ${show(env.fi.retCtx)}`);
        env.fi.rets.push(t);
        return false;
      }
      case "ThrowStatement": this.hides(s.argument, this.infer(s.argument, env), UNKNOWN); return false; // a catch takes it as unknown
      case "IfStatement": {
        const [T, F] = this.cond(s.test, env);
        const a: Env = { ...env, flow: T }, b: Env = { ...env, flow: F };
        const la = this.sub1(s.consequent, a);
        const lb = s.alternate ? this.sub1(s.alternate, b) : true;
        if (!la && !lb) return false;
        env.flow = la && lb ? this.join(a.flow, b.flow)! : la ? a.flow : b.flow;
        return true;
      }
      case "WhileStatement": case "DoWhileStatement": case "ForStatement": return this.loop(s, env);
      case "ForOfStatement": {
        if (s.await) { this.unsupported(s, "for await"); return true; }
        const inner: Env = { ...env, scope: new Scope(env.scope) };
        const rt = this.infer(s.right, inner);
        const el = this.reg.iterElem(rt);
        if (!el) this.err(s.right, "type", `for...of over non-iterable ${show(rt)}`);
        this.invalidate(s, inner);
        const head = new Map(inner.flow);
        if (s.left.type === "VariableDeclaration") {
          const d = s.left.declarations[0];
          if (s.left.kind === "var") this.err(s.left, "no-var", "var");
          this.bindPattern(d.id, el ?? ERR, inner, s.left.kind === "const" ? "const" : "let");
        } else this.unsupported(s.left, "for...of over an existing binding");
        this.breaks.push(null);
        this.sub1(s.body, inner);
        this.breaks.pop();
        env.flow = head;
        return true;
      }
      case "ForInStatement": this.unsupported(s, "for...in"); return true;
      case "BreakStatement": case "ContinueStatement":
        if (s.label) this.unsupported(s, "labelled break/continue");
        else if (s.type === "BreakStatement" && !env.dead) this.breaks.at(-1)?.push(new Map(env.flow));
        return false;
      case "TryStatement": {
        const before = new Map(env.flow);
        this.invalidate(s.block, env);
        const pre = new Map(env.flow);
        const a: Env = { ...env, flow: new Map(pre) };
        const la = this.block(s.block.body, a);
        let lb = false;
        const b: Env = { ...env, scope: new Scope(env.scope), flow: new Map(pre) };
        if (s.handler) {
          if (s.handler.param) this.bindPattern(s.handler.param, UNKNOWN, b, "let");
          lb = this.block(s.handler.body.body, b);
        }
        env.flow = la && lb ? this.join(a.flow, b.flow)! : la ? a.flow : lb ? b.flow : before;
        let live = la || lb;
        if (s.finalizer) {
          const f: Env = { ...env, flow: new Map(pre) };
          if (!this.block(s.finalizer.body, f)) live = false;
        }
        return live;
      }
      case "SwitchStatement": return this.switchStmt(s, env);
      case "ClassDeclaration": this.declare(env, s.id.name, ERR, "const", s.id); return true; // no-class (syntax pass)
      case "LabeledStatement": this.unsupported(s, "label"); return true;
      case "TSTypeAliasDeclaration": case "TSInterfaceDeclaration": this.unsupported(s, "local type declaration"); return true;
      default: this.unsupported(s, s.type); return true;
    }
  }
  varDecl(d: Node, kind: string, env: Env) {
    const k: BKind = kind === "const" ? "const" : "let";
    const ann = d.id.typeAnnotation?.typeAnnotation;
    const declared = ann ? this.reg.convert(ann, this.typeCtx(env), this.parsed) : undefined;
    const init: Node | null = d.init;
    const fnInit = init && (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression");
    if (d.id.type === "Identifier" && fnInit && k === "const") {
      // pre-bind so the function can call itself (needs annotations)
      const pre = declared ?? this.annotatedSig(init, env);
      const b = this.declare(env, d.id.name, pre ?? ERR, k, d.id, { fnNode: init });
      if (!pre) b.lazy = () => { this.unsupported(init, "recursive function without a return type"); return ERR; };
      const t = this.check(init, env, declared);
      b.t = declared ?? t;
      b.lazy = undefined;
      return;
    }
    if (!init) {
      if (k === "const") this.err(d, "type", "const without initializer");
      if (!declared) { this.unsupported(d, "let without a type or initializer"); this.bindPattern(d.id, ERR, env, k); return; }
      this.bindPattern(d.id, declared, env, k);
      return;
    }
    const t = this.check(init, env, declared);
    const isMut = init.type === "CallExpression" && init.callee.type === "Identifier" && init.callee.name === "mut" && env.scope.get("mut")?.kind === "prelude";
    if (d.id.type === "Identifier") {
      const b = this.declare(env, d.id.name, declared ?? (k === "let" ? widen(t) : t), k, d.id, { mutOwned: isMut });
      if (k === "let" && declared) env.flow.set("#" + b.id, this.reg.sub(t, declared) ? t : declared);
      if (fnInit) b.fnNode = init;
    } else this.bindPattern(d.id, declared ?? t, env, k);
  }
  invalidate(n: Node, env: Env) {
    for (const name of this.assignedNames(n)) {
      const b = env.scope.get(name);
      if (b) this.dropRoot(env.flow, b);
    }
  }
  loop(s: Node, env: Env): boolean {
    const inner: Env = { ...env, scope: new Scope(env.scope) };
    if (s.type === "ForStatement" && s.init) {
      if (s.init.type === "VariableDeclaration") { if (s.init.kind === "var") this.err(s.init, "no-var", "var"); for (const d of s.init.declarations) this.varDecl(d, s.init.kind, inner); }
      else this.infer(s.init, inner);
    }
    this.invalidate(s, inner);
    const head = new Map(inner.flow);
    let F: Map<string, Ty> | null = null;
    let bodyEnv: Env;
    this.breaks.push(null);
    if (s.type === "DoWhileStatement") {
      bodyEnv = { ...inner, flow: new Map(head) };
      this.sub1(s.body, bodyEnv);
      this.invalidate(s, bodyEnv);
      const [, f] = this.cond(s.test, bodyEnv);
      F = f;
    } else {
      let T = new Map(head);
      if (s.test) { const [t, f] = this.cond(s.test, inner); T = t; F = f; }
      bodyEnv = { ...inner, flow: T };
      this.sub1(s.body, bodyEnv);
      if (s.type === "ForStatement" && s.update) this.infer(s.update, bodyEnv);
    }
    this.breaks.pop();
    const infinite = s.type !== "DoWhileStatement" && !s.test || (s.test?.type === "Literal" && s.test.value === true);
    const brk = this.hasBreak(s.body);
    if (infinite && !brk) return false;
    env.flow = brk || !F ? head : F;
    return true;
  }
  // The flows at the breaks of the innermost switch, or null while a loop is innermost (a loop's exit flow
  // is its head, after invalidate).
  breaks: (Map<string, Ty>[] | null)[] = [];
  // switch: each case is checked as the condition d === test, in the flow where every earlier test was
  // false; a body runs in the flow where its test (or one of the empty cases before it) is true, default
  // where every test is false. rest: the values of d that no case has taken, for exhaustiveness.
  switchStmt(s: Node, env: Env): boolean {
    const d = s.discriminant;
    const dt = this.infer(d, env);
    let rest = dt;
    let none = new Map(env.flow);
    const taken: (Map<string, Ty> | null)[] = [];
    for (const c of s.cases) {
      if (!c.test) { taken.push(null); continue; }
      const eq = { type: "BinaryExpression", operator: "===", left: d, right: c.test, start: c.test.start, end: c.test.end, loc: c.test.loc } as Node;
      // the discriminant is read again for each case; its own problems were reported by the first read
      const nd = this.diags.length, nu = this.unsup.length;
      const [T, F] = this.cond(eq, { ...env, flow: none });
      const inD = (x: Diag) => x.node.start >= d.start && x.node.end <= d.end;
      for (let i = this.diags.length - 1; i >= nd; i--) if (inD(this.diags[i])) this.diags.splice(i, 1);
      for (let i = this.unsup.length - 1; i >= nu; i--) if (inD(this.unsup[i])) this.unsup.splice(i, 1);
      taken.push(T);
      none = F;
      const bt = this.facts.types.get(c.test);
      // cond compares a path with what the earlier cases left; any other discriminant is compared with rest here
      if (bt && !this.pathKey(d, env) && !this.noOverlap(dt, bt) && this.noOverlap(rest, bt))
        this.err(c.test, "type", `case ${show(bt)}: no value of ${show(dt)} is left for it after the earlier cases`);
      if (bt && (bt.k === "lit" || bt.k === "null" || bt.k === "undef")) rest = this.narrowEq(rest, bt, false, false);
    }
    this.rec(d, dt);
    const exits: Map<string, Ty>[] = [];
    let into: Map<string, Ty> | null = null; // the flow into the next body from the cases before it
    this.breaks.push(exits);
    for (const [i, c] of (s.cases as Node[]).entries()) {
      const flow = this.join(into, taken[i] ?? none)!;
      for (const st of c.consequent) if (st.type === "VariableDeclaration" || st.type === "FunctionDeclaration" || st.type === "ClassDeclaration")
        this.err(st, "switch-declaration", "a declaration directly in a case is visible to every case of the switch; put the case's statements in a block { … }");
      if (!c.consequent.length) { into = flow; continue; }
      const inner: Env = { ...env, scope: new Scope(env.scope), flow: new Map(flow) };
      this.hoist(c.consequent, inner);
      const end = this.stmts(c.consequent, inner);
      if (end && i < s.cases.length - 1) this.err(c, "switch-fallthrough", "this case falls through into the next one; end it with break, return, throw or continue");
      into = end ? inner.flow : null;
    }
    this.breaks.pop();
    if (into) exits.push(into);
    if (!s.cases.some((c: Node) => !c.test) && rest.k !== "never") exits.push(none);
    if (!exits.length) return false;
    env.flow = exits.reduce((a, b) => this.join(a, b)!);
    return true;
  }
  // an unlabelled break of this loop (not of a nested loop or switch)
  hasBreak(n: Node): boolean {
    if (n.type === "BreakStatement" && !n.label) return true;
    if (isFn(n) || /^(WhileStatement|DoWhileStatement|ForStatement|ForOfStatement|ForInStatement|SwitchStatement)$/.test(n.type)) return false;
    return kids(n).some((c) => this.hasBreak(c));
  }
}

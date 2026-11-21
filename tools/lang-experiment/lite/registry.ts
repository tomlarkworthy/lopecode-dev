// Declarations (intrinsic, prelude, foreign, user), type-syntax conversion, expansion, member lookup,
// subtyping and inference unification.
import { parse, type Node, type Parsed } from "./parse.ts";
import {
  type Ty, type Fn, type Rec, type Prop, type Param, type Flags, type Subst,
  NUM, STR, BIGINT, NULL, UNDEF, VOID, NEVER, UNKNOWN, OBJECT, ERR, SYMBOL, BOOL,
  union, members, show, subst, named, arr, WRAPPERS, isNamed, propT, tpNames,
} from "./types.ts";
import { INTRINSIC_DECLS, PRELUDE_DECLS, TYPED_ARRAYS, JSX_DECLS } from "./intrinsics.ts";

export type Origin = "intrinsic" | "prelude" | "jsx" | "foreign" | "user";
type Decl = { kind: "alias" | "iface"; tps: string[]; nodes: Node[]; origin: Origin; parsed: Parsed };
export type ValueDecl = { t: Ty; origin: Origin; node: Node; marker: "pure" | "effect" | null; flags?: Flags };
export type TypeCtx = { tps: Set<string>; typeofLookup?: (name: string, node: Node) => Ty | undefined };

const FLAG_NAMES = ["mutates", "fresh", "view", "retains", "banned"] as const;
function flagsOf(p: Parsed, n: Node, origin: Origin): Flags | undefined {
  const f: Flags = {};
  for (const c of p.leading(n)) for (const k of FLAG_NAMES) if (c.text.includes("@" + k)) f[k] = true;
  if (origin === "intrinsic") f.intrinsic = true;
  return Object.keys(f).length ? f : undefined;
}
const KEYWORDS = new Map<string, Ty>([
  ["TSNumberKeyword", NUM], ["TSStringKeyword", STR], ["TSBooleanKeyword", BOOL], ["TSBigIntKeyword", BIGINT],
  ["TSNullKeyword", NULL], ["TSUndefinedKeyword", UNDEF], ["TSVoidKeyword", VOID], ["TSNeverKeyword", NEVER],
  ["TSUnknownKeyword", UNKNOWN], ["TSObjectKeyword", OBJECT], ["TSSymbolKeyword", SYMBOL],
  ["TSAnyKeyword", ERR], // reported as no-any by the syntax pass
]);
const keyName = (k: Node): string | null => (k.type === "Identifier" ? k.name : k.type === "Literal" ? String(k.value) : null);

let DECLS: [Parsed, Parsed, Parsed] | null = null;
let alphaNames = 0;

const ONE_ARG = new Set(["State", "StateCell", "Events", "Mut", "Borrowed"]);
// names convert reads before any declaration
const CONVERT_NAMES = ["Js", "Array", "ReadonlyArray", "Record", "Action", "ValueOf"];
export class Registry {
  types = new Map<string, Decl>();
  values = new Map<string, ValueDecl>();
  strictIndex = true;
  onUnsup: (n: Node, what: string) => void = () => {};
  onErr: (n: Node, rule: string, msg: string) => void = () => {};
  expandMemo = new Map<string, Ty>();
  ifaceMemo = new Map<string, Rec>();
  // while peek runs: the memo entries it added, removed when it ends
  journal: [Map<string, unknown>, string][] | null = null;

  constructor() {
    // the declaration texts are constants and nothing writes to a parsed tree, so they are parsed once
    DECLS ??= [parse(INTRINSIC_DECLS), parse(PRELUDE_DECLS), parse(JSX_DECLS)];
    this.load(DECLS[0], "intrinsic");
    this.load(DECLS[1], "prelude");
    this.load(DECLS[2], "jsx"); // structural, unlike the opaque intrinsic interfaces
  }

  // The type names the checker gives a meaning of its own: declared by the intrinsics, the prelude or JSX,
  // the wrappers, and the names convert reads first. Read before the user's declarations are loaded.
  builtinTypeNames(): Set<string> {
    return new Set([...[...this.types].filter(([, d]) => d.origin !== "user" && d.origin !== "foreign").map(([n]) => n), ...WRAPPERS, ...CONVERT_NAMES]);
  }

  // Top-level type/interface/declare statements of a file. Returns non-declaration statements untouched.
  // skip: declarations not to load (core.ts: a user type with a built-in name).
  load(p: Parsed, origin: Origin, typesOnly = false, skip: Set<Node> = new Set()): Node[] {
    const rest: Node[] = [];
    const fnDecls = new Map<string, Node[]>();
    for (const st of p.program.body as Node[]) {
      const d = st.type === "ExportNamedDeclaration" && st.declaration && /^TS(TypeAlias|Interface)Declaration$/.test(st.declaration.type) ? st.declaration : st;
      if (typesOnly && d.type !== "TSTypeAliasDeclaration" && d.type !== "TSInterfaceDeclaration") { rest.push(st); continue; }
      if (skip.has(d)) continue;
      if (d.type === "TSTypeAliasDeclaration" || d.type === "TSInterfaceDeclaration") {
        const name = d.id.name;
        const tps = tpNames(d.typeParameters);
        const prev = this.types.get(name);
        if (prev && prev.kind === "iface" && d.type === "TSInterfaceDeclaration" && prev.origin === origin) prev.nodes.push(d);
        else this.types.set(name, { kind: d.type === "TSTypeAliasDeclaration" ? "alias" : "iface", tps, nodes: [d], origin, parsed: p });
      } else if (d.type === "TSDeclareFunction") {
        const list = fnDecls.get(d.id.name) ?? [];
        list.push(d);
        fnDecls.set(d.id.name, list);
      } else if (d.type === "VariableDeclaration" && d.declare) {
        for (const v of d.declarations) {
          const ann = v.id.typeAnnotation?.typeAnnotation;
          this.values.set(v.id.name, { t: ann ? this.convert(ann, { tps: new Set() }, p, origin) : UNKNOWN, origin, node: d, marker: marker(p, d), flags: flagsOf(p, d, origin) });
        }
      } else rest.push(st);
    }
    for (const [name, list] of fnDecls) {
      const sigs = list.map((d) => this.sig(d.params, d.returnType?.typeAnnotation, d.typeParameters, { tps: new Set() }, p, origin, flagsOf(p, d, origin)));
      this.values.set(name, { t: sigs.length === 1 ? sigs[0] : { k: "rec", props: new Map(), calls: sigs }, origin, node: list[0], marker: marker(p, list[0]) });
    }
    return rest;
  }

  // Elem is the one JSX type that is not structural: only JSX makes one (h at run time), so a record is not one
  // f's result, with any problem it meets while expanding types left to be reported where the type is used
  peek<T>(f: () => T): T {
    const was = [this.onErr, this.onUnsup, this.journal] as const;
    const journal: [Map<string, unknown>, string][] = [];
    this.onErr = () => {}; this.onUnsup = () => {}; this.journal = journal;
    try { return f(); } finally {
      [this.onErr, this.onUnsup, this.journal] = was;
      for (const [m, k] of journal) m.delete(k);
    }
  }
  isAlias(n: string) {
    const d = this.types.get(n);
    return !!d && !WRAPPERS.has(n) && (d.kind === "alias" || d.origin === "user" || d.origin === "foreign" || (d.origin === "jsx" && n !== "Elem"));
  }

  // ---- type syntax ----
  sig(params: Node[], ret: Node | undefined, tpNode: Node | undefined, ctx: TypeCtx, p: Parsed, origin: Origin, flags?: Flags): Fn {
    const tps = tpNames(tpNode);
    for (const x of tpNode?.params ?? []) if (x.constraint || x.default) this.onUnsup(x, "type parameter constraint/default");
    const inner: TypeCtx = { ...ctx, tps: new Set([...ctx.tps, ...tps]) };
    const ps: Param[] = [];
    let rest: Ty | undefined;
    for (const q of params) {
      if (q.type === "RestElement") {
        const a = q.typeAnnotation?.typeAnnotation ?? q.argument?.typeAnnotation?.typeAnnotation;
        const t = a ? this.convert(a, inner, p, origin) : UNKNOWN;
        rest = t.k === "arr" ? t.el : (this.onUnsup(q, "rest parameter type"), ERR);
      } else if (q.type === "Identifier" || q.type === "ObjectPattern" || q.type === "ArrayPattern" || q.type === "AssignmentPattern") {
        const id = q.type === "AssignmentPattern" ? q.left : q;
        const a = id.typeAnnotation?.typeAnnotation;
        ps.push({ n: id.name ?? "_", t: a ? this.convert(a, inner, p, origin) : (this.onUnsup(q, "untyped parameter in a signature"), ERR), opt: !!id.optional || q.type === "AssignmentPattern" });
      } else this.onUnsup(q, `parameter ${q.type}`);
    }
    return { k: "fn", tps, ps, rest, ret: ret ? this.convert(ret, inner, p, origin) : VOID, flags };
  }

  // a signature node of a type (function type, method, call or construct signature)
  sigOf(n: Node, ctx: TypeCtx, p: Parsed, origin: Origin, flags?: Flags): Fn {
    return this.sig(n.parameters ?? n.params, n.typeAnnotation?.typeAnnotation ?? n.returnType?.typeAnnotation, n.typeParameters, ctx, p, origin, flags);
  }

  convert(n: Node, ctx: TypeCtx, p: Parsed, origin: Origin = "user"): Ty {
    const c = (x: Node) => this.convert(x, ctx, p, origin);
    const kw = KEYWORDS.get(n.type);
    if (kw) return kw;
    switch (n.type) {
      case "TSParenthesizedType": return c(n.typeAnnotation);
      case "TSLiteralType": {
        const l = n.literal;
        if (l.type === "Literal" && ["string", "number", "boolean"].includes(typeof l.value)) return { k: "lit", v: l.value };
        if (l.type === "UnaryExpression" && l.operator === "-" && typeof l.argument.value === "number") return { k: "lit", v: -l.argument.value };
        if (l.type === "TemplateLiteral" && l.expressions.length === 0) return { k: "lit", v: l.quasis[0].value.cooked };
        this.onUnsup(n, "literal type");
        return ERR;
      }
      case "TSUnionType": return union(n.types.map(c));
      case "TSArrayType": return arr(c(n.elementType));
      case "TSTupleType": {
        const els: Ty[] = [];
        for (const e of n.elementTypes) {
          if (/TSNamedTupleMember|TSOptionalType|TSRestType/.test(e.type)) { this.onUnsup(e, e.type); return ERR; }
          els.push(c(e));
        }
        return { k: "tup", els };
      }
      case "TSTypeOperator":
        if (n.operator === "readonly") return c(n.typeAnnotation);
        this.onUnsup(n, `type operator ${n.operator}`);
        return ERR;
      case "TSFunctionType": return this.sigOf(n, ctx, p, origin);
      case "TSTypeLiteral": return this.literal(n.members, ctx, p, origin);
      case "TSTypeQuery": {
        if (n.exprName.type === "Identifier" && ctx.typeofLookup) {
          const t = ctx.typeofLookup(n.exprName.name, n);
          if (t) return t;
        }
        this.onUnsup(n, "typeof type query");
        return ERR;
      }
      case "TSTypeReference": {
        if (n.typeName.type !== "Identifier") { this.onUnsup(n, "qualified type name"); return ERR; }
        const name: string = n.typeName.name;
        const args: Ty[] = (n.typeArguments?.params ?? n.typeParameters?.params ?? []).map(c);
        if (ctx.tps.has(name)) return { k: "tv", n: name };
        if (name === "Js") return UNKNOWN;
        if (name === "Array" || name === "ReadonlyArray") return arr(args[0] ?? UNKNOWN);
        if (name === "Record" && args.length === 2 && args[0].k === "str") return { k: "rec", props: new Map(), index: args[1] };
        if (name === "Action") return named("Action", args[0] ?? { k: "tup", els: [] });
        // the prelude's own generics, whatever a module declares under their names
        if (ONE_ARG.has(name) && args.length !== 1) { this.onErr(n, "type", `${name} takes one type argument, as ${name}<T>`); return ERR; }
        if (WRAPPERS.has(name) || this.types.has(name)) {
          const t = named(name, ...args), d = this.types.get(name);
          // an alias of Mut<T> or Borrowed<T> is that type, so the ownership rules see it
          const e = !WRAPPERS.has(name) && d?.kind === "alias" && d.nodes[0].typeAnnotation?.type === "TSTypeReference" ? this.expand(t) : t;
          return isNamed(e, "Mut") || isNamed(e, "Borrowed") ? e : t;
        }
        if (name === "ValueOf") { this.onUnsup(n, "ValueOf in checked cells"); return ERR; }
        this.onErr(n, "unknown-type", `unknown type ${name}`);
        return ERR;
      }
      default:
        this.onUnsup(n, n.type.replace(/^TS/, "") + " type");
        return ERR;
    }
  }

  literal(ms: Node[], ctx: TypeCtx, p: Parsed, origin: Origin, into?: Rec): Rec {
    const r: Rec = into ?? { k: "rec", props: new Map() };
    const overloads = new Map<string, Fn[]>();
    for (const m of ms) {
      const fl = flagsOf(p, m, origin);
      if (m.type === "TSPropertySignature") {
        const k = keyName(m.key);
        if (m.computed || k === null) { this.onUnsup(m, "computed property signature"); continue; }
        const a = m.typeAnnotation?.typeAnnotation;
        r.props.set(k, { t: a ? this.convert(a, ctx, p, origin) : UNKNOWN, opt: !!m.optional, flags: fl });
      } else if (m.type === "TSMethodSignature") {
        const k = keyName(m.key);
        if (m.computed || k === null || (m.kind && m.kind !== "method")) { this.onUnsup(m, "computed/accessor method signature"); continue; }
        const f = this.sigOf(m, ctx, p, origin, fl);
        const list = overloads.get(k) ?? [];
        list.push(f);
        overloads.set(k, list);
        r.props.set(k, { t: list.length === 1 ? f : { k: "rec", props: new Map(), calls: list }, opt: !!m.optional, flags: fl });
      } else if (m.type === "TSIndexSignature") {
        const kt = m.parameters?.[0]?.typeAnnotation?.typeAnnotation;
        if (kt?.type !== "TSStringKeyword") { this.onUnsup(m, "non-string index signature"); continue; }
        r.index = this.convert(m.typeAnnotation.typeAnnotation, ctx, p, origin);
      } else if (m.type === "TSCallSignatureDeclaration" || m.type === "TSConstructSignatureDeclaration") {
        const f = this.sigOf(m, ctx, p, origin, fl);
        if (m.type === "TSCallSignatureDeclaration") (r.calls ??= []).push(f);
        else (r.ctors ??= []).push(f);
      } else this.onUnsup(m, m.type);
    }
    return r;
  }

  // ---- expansion ----
  expand(t: Ty): Ty {
    if (t.k !== "named" || !this.isAlias(t.n)) return t;
    const key = show(t);
    const hit = this.expandMemo.get(key);
    if (hit) return hit;
    const d = this.types.get(t.n)!;
    if (d.tps.length !== t.args.length && d.tps.length) { this.onUnsup(d.nodes[0], `generic type ${t.n} used with ${t.args.length} arguments`); return ERR; }
    this.expandMemo.set(key, ERR); // a directly self-referential alias expands to ERR (unsupported)
    this.journal?.push([this.expandMemo, key]);
    const m: Subst = new Map(d.tps.map((n, i) => [n, t.args[i]]));
    let out: Ty;
    if (d.kind === "alias") out = subst(this.convert(d.nodes[0].typeAnnotation, { tps: new Set(d.tps) }, d.parsed, d.origin), m);
    else out = subst(this.ifaceRec(t.n), m);
    this.expandMemo.set(key, out);
    return out;
  }
  ifaceRec(name: string): Rec {
    const hit = this.ifaceMemo.get(name);
    if (hit) return hit;
    const d = this.types.get(name)!;
    const r: Rec = { k: "rec", props: new Map() };
    this.ifaceMemo.set(name, r);
    this.journal?.push([this.ifaceMemo, name]);
    const ctx = { tps: new Set(d.tps) };
    for (const node of d.nodes) {
      for (const h of node.extends ?? []) {
        const base = h.expression?.type === "Identifier" ? this.expand(named(h.expression.name)) : ERR;
        if (base.k !== "rec") { this.onUnsup(h, "interface extends a non-object type"); continue; }
        for (const [k, v] of base.props) if (!r.props.has(k)) r.props.set(k, v);
        if (base.index) r.index ??= base.index;
        if (base.calls) r.calls = [...(r.calls ?? []), ...base.calls];
      }
    }
    for (const node of d.nodes) {
      const own = this.literal(node.body.body, ctx, d.parsed, d.origin);
      for (const [k, v] of own.props) r.props.set(k, v);
      if (own.index) r.index = own.index;
      if (own.calls) r.calls = [...(r.calls ?? []), ...own.calls];
      if (own.ctors) r.ctors = own.ctors;
    }
    return r;
  }

  // ---- members ----
  // The declared property (not yet with `undefined` added for optional/index access).
  member(t0: Ty, name: string): Prop | undefined {
    const t = this.expand(t0);
    switch (t.k) {
      case "named": {
        if (t.n === "Mut" || t.n === "Borrowed") return this.member(t.args[0], name);
        if (t.n === "Iterable" || t.n === "ArrayLike") return undefined;
        const d = this.types.get(t.n);
        if (!d) return undefined;
        const r = this.ifaceRec(t.n);
        const p = r.props.get(name);
        if (!p) return undefined;
        const m: Subst = new Map(d.tps.map((n, i) => [n, t.args[i] ?? UNKNOWN]));
        return { ...p, t: subst(p.t, m) };
      }
      case "rec": {
        const p = t.props.get(name);
        if (p) return p;
        if (t.index) return { t: this.strictIndex ? union([t.index, UNDEF]) : t.index, opt: false };
        return undefined;
      }
      case "arr": return this.member(named("Array", t.el), name);
      case "tup": return name === "length" ? { t: { k: "lit", v: t.els.length }, opt: false } : this.member(named("Array", union(t.els)), name);
      case "str": return this.member(named("String"), name);
      case "num": return this.member(named("Number"), name);
      case "lit":
        return this.member(typeof t.v === "string" ? STR : typeof t.v === "number" ? NUM : named("Boolean"), name);
      case "union":
        if (t.ts.every((x) => x.k === "lit" && typeof x.v === "boolean")) return this.member(named("Boolean"), name);
        return undefined;
      default: return undefined;
    }
  }

  isTypedArray = (t: Ty) => t.k === "named" && TYPED_ARRAYS.includes(t.n);

  // Element type of `for...of` / spread / Iterable<T>, or undefined if not iterable.
  iterElem(t0: Ty): Ty | undefined {
    const t = this.expand(t0);
    switch (t.k) {
      case "arr": return t.el;
      case "tup": return union(t.els);
      case "str": case "lit": return typeof (t as any).v === "number" || typeof (t as any).v === "boolean" ? undefined : STR;
      case "err": return ERR;
      case "named":
        if (t.n === "Iterable" || t.n === "ArrayLike") return t.args[0];
        if (t.n === "Mut" || t.n === "Borrowed") return this.iterElem(t.args[0]);
        if (t.n === "Map") return { k: "tup", els: [t.args[0], t.args[1]] };
        if (t.n === "Set") return t.args[0];
        if (this.isTypedArray(t)) return NUM;
        // a match is an array of the whole match and each group, undefined for a group that did not take part
        if (t.n === "RegExpMatchArray") return union([STR, UNDEF]);
        return undefined;
      case "union": {
        const es = t.ts.map((x) => this.iterElem(x));
        return es.every((e) => e) ? union(es as Ty[]) : undefined;
      }
      default: return undefined;
    }
  }

  callSigs(t0: Ty): Fn[] {
    const t = this.expand(t0);
    if (t.k === "fn") return [t];
    if (t.k === "rec") return t.calls ?? [];
    if (t.k === "named" && (t.n === "Mut" || t.n === "Borrowed")) return this.callSigs(t.args[0]);
    return [];
  }

  // ---- subtyping (values are immutable: covariant everywhere except function parameters, Mut, State) ----
  sub(s: Ty, t: Ty, seen: Set<string> = new Set()): boolean {
    if (s === t || t.k === "unknown" || s.k === "err" || t.k === "err" || s.k === "never") return true;
    const S = (a: Ty, b: Ty) => this.sub(a, b, seen);
    if ((s.k === "named" && this.isAlias(s.n)) || (t.k === "named" && this.isAlias(t.n))) {
      const key = show(s) + " <: " + show(t);
      if (seen.has(key)) return true;
      seen.add(key);
      return S(this.expand(s), this.expand(t));
    }
    if (s.k === "union") return s.ts.every((m) => S(m, t));
    if (s.k === "named" && (s.n === "Mut" || s.n === "Borrowed") && !isNamed(t, s.n)) return S(s.args[0], t);
    if (t.k === "union") return t.ts.some((m) => S(s, m));
    if (s.k === "tv") return t.k === "tv" && t.n === s.n;
    switch (t.k) {
      case "num": return s.k === "num" || (s.k === "lit" && typeof s.v === "number");
      case "str": return s.k === "str" || (s.k === "lit" && typeof s.v === "string");
      case "lit": return s.k === "lit" && s.v === t.v;
      case "void": return s.k === "void" || s.k === "undef";
      case "null": case "undef": case "bigint": case "symbol": case "never": return s.k === t.k;
      case "object": return ["rec", "arr", "tup", "fn", "named", "object"].includes(s.k);
      case "arr": return (s.k === "arr" && S(s.el, t.el)) || (s.k === "tup" && s.els.every((e) => S(e, t.el)));
      case "tup": return s.k === "tup" && s.els.length === t.els.length && s.els.every((e, i) => S(e, t.els[i]));
      case "fn": return this.callSigs(s).some((f) => this.fnSub(f, t, seen));
      case "rec": {
        if (["null", "undef", "void"].includes(s.k)) return false;
        if (s.k === "named" && ["State", "StateCell", "Action"].includes(s.n)) return false; // nominal
        const se = this.expand(s);
        for (const [k, p] of t.props) {
          const sp = this.member(se, k);
          if (!sp) { if (p.opt) continue; return false; }
          if (sp.flags?.banned || (!p.opt && sp.opt)) return false;
          // a spread, rest or clone copies only own enumerable properties; a member from a prototype is not one
          if (!p.opt && !p.flags?.intrinsic && (se.k !== "rec" || sp.flags?.intrinsic)) return false;
          if (!S(propT(sp), propT(p))) return false;
        }
        if (t.index) {
          if (se.k !== "rec") return false;
          for (const [, p] of se.props) if (p.flags?.banned || !S(propT(p), t.index)) return false;
          if (se.index && !S(se.index, t.index)) return false;
        }
        for (const c of t.calls ?? []) if (!this.callSigs(se).some((f) => this.fnSub(f, c, seen))) return false;
        return true;
      }
      case "named": {
        if (t.n === "Iterable" || t.n === "ArrayLike") {
          const e = this.iterElem(s);
          return !!e && (t.n === "Iterable" || s.k !== "named" || !["Map", "Set"].includes((s as any).n)) && S(e, t.args[0]);
        }
        if (s.k !== "named" || s.n !== t.n) return false;
        if (t.n === "Mut" || t.n === "State") return S(s.args[0], t.args[0]) && S(t.args[0], s.args[0]);
        if (t.n === "Action") return S(t.args[0], s.args[0]);
        return t.args.every((a, i) => S(s.args[i] ?? UNKNOWN, a));
      }
      default: return false;
    }
  }
  fnSub(s: Fn, t: Fn, seen: Set<string>): boolean {
    if (s.tps.length || t.tps.length) {
      // generic on both sides with as many type parameters: compared with both renamed to the same fresh names
      if (s.tps.length !== t.tps.length) return false;
      const fresh = s.tps.map(() => ({ k: "tv", n: `$a${++alphaNames}` }) as Ty);
      const open = (f: Fn) => subst({ ...f, tps: [] }, new Map(f.tps.map((n, i) => [n, fresh[i]]))) as Fn;
      return this.fnSub(open(s), open(t), seen);
    }
    const required = s.ps.filter((p) => !p.opt).length;
    if (required > t.ps.length + (t.rest ? Infinity : 0)) return false;
    for (let i = 0; i < s.ps.length; i++) {
      const tp = t.ps[i]?.t ?? t.rest;
      if (!tp) break;
      if (!this.sub(tp, s.ps[i].t, seen)) return false;
    }
    if (t.rest && s.rest && !this.sub(t.rest, s.rest, seen)) return false;
    return t.ret.k === "void" || this.sub(s.ret, t.ret, seen);
  }

  // ---- inference: collect candidates for type variables in `tvs` by matching parameter p against argument a ----
  unify(p: Ty, a: Ty, m: Subst, tvs: Set<string>, depth = 0): void {
    if (depth > 12 || a.k === "err") return;
    const U = (x: Ty, y: Ty) => this.unify(x, y, m, tvs, depth + 1);
    if (p.k === "tv") {
      if (tvs.has(p.n)) m.set(p.n, m.has(p.n) ? union([m.get(p.n)!, a]) : a);
      return;
    }
    if (a.k === "named" && this.isAlias(a.n)) return U(p, this.expand(a));
    if (p.k === "named" && this.isAlias(p.n)) return U(this.expand(p), a);
    if (p.k === "union") {
      const tvM = p.ts.filter((x) => x.k === "tv" && tvs.has(x.n));
      const others = p.ts.filter((x) => !tvM.includes(x));
      for (const x of members(a)) {
        const shape = others.find((q) => q.k === x.k && (q.k !== "named" || (x as any).n === q.n) || (q.k === "arr" && x.k === "tup"));
        if (shape && this.hasAnyTv(shape, tvs)) U(shape, x);
        else if (others.some((q) => this.sub(x, q))) continue;
        else if (tvM.length === 1) U(tvM[0], x);
      }
      return;
    }
    if (a.k === "union" && p.k !== "named") { for (const x of a.ts) U(p, x); return; }
    if (a.k === "named" && (a.n === "Mut" || a.n === "Borrowed") && !isNamed(p, a.n)) return U(p, a.args[0]);
    switch (p.k) {
      case "arr":
        if (a.k === "arr") U(p.el, a.el);
        else if (a.k === "tup") a.els.forEach((e) => U(p.el, e));
        else if (a.k === "named" && (a.n === "Iterable" || a.n === "ArrayLike")) U(p.el, a.args[0]);
        return;
      case "tup": if (a.k === "tup") p.els.forEach((e, i) => a.els[i] && U(e, a.els[i])); return;
      case "fn": {
        const f = this.callSigs(a)[0];
        if (!f) return;
        p.ps.forEach((q, i) => f.ps[i] && U(q.t, f.ps[i].t));
        U(p.ret, f.ret);
        return;
      }
      case "rec": {
        const ae = this.expand(a);
        for (const [k, q] of p.props) { const ap = this.member(ae, k); if (ap) U(q.t, ap.t); }
        if (p.index && ae.k === "rec") { for (const [, ap] of ae.props) U(p.index, propT(ap)); if (ae.index) U(p.index, ae.index); }
        return;
      }
      case "named": {
        if (p.n === "Iterable" || p.n === "ArrayLike") { const e = this.iterElem(a); if (e) U(p.args[0], e); return; }
        if (a.k === "named" && a.n === p.n) p.args.forEach((x, i) => a.args[i] && U(x, a.args[i]));
        return;
      }
    }
  }
  hasAnyTv(t: Ty, tvs: Set<string>): boolean {
    return show(t).split(/[^\w']+/).some((w) => tvs.has(w));
  }
}

function marker(p: Parsed, n: Node): "pure" | "effect" | null {
  for (const c of p.leading(n)) {
    if (!c.block) continue;
    if (/^\*\s*pure\s*$/.test(c.text.trim())) return "pure";
    if (/^\*\s*effect\s*$/.test(c.text.trim())) return "effect";
  }
  return null;
}
// the type names a top-level type or interface may not take (S1.10)
export function builtinTypeNames(): string[] {
  return [...new Registry().builtinTypeNames()].sort();
}

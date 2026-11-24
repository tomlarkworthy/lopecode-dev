// FROZEN FIXTURE (2026-11-22, switch4): lite/registry.ts as it was before the rg, cp and tc cells were switched on.
// Only the differentials and tests compare against it; nothing shipped imports it, and the build does not reach it.
// Changed since: the expansion and quiet keys add exactSig (holes step 5, 2026-11-22), and are typeKey(t), in full,
// not show(t) (holes step 8, 2026-11-22), as rgExpand and rgQuietGo.
// Declarations (intrinsic, prelude, foreign, user), type-syntax conversion and expansion. Member lookup,
// subtyping and inference unification are SoundScript cells (subtype.ss.ts), bound here to this Registry.
import { parse, type Node, type Parsed } from "./parse.ts";
import {
  type Ty, type Fn, type Rec, type Prop, type Param, type Flags, type Subst,
  NUM, STR, BIGINT, NULL, UNDEF, VOID, NEVER, UNKNOWN, OBJECT, ERR, SYMBOL, BOOL,
  union, show, subst, named, arr, WRAPPERS, isNamed, tpNames, typeKey,
  type RegOps, type DeclOps, builtinNamesOf, isAliasWith, memberWith, callSigsWith, iterElemWith, subWith, memberOfWith, unifyWith,
} from "../../../types.ts";
import { INTRINSIC_DECLS, PRELUDE_DECLS, TYPED_ARRAYS, JSX_DECLS, FN_OWN_MEMBERS } from "../../../intrinsics.ts";

export type Origin = "intrinsic" | "prelude" | "jsx" | "foreign" | "user";
type Decl = { kind: "alias" | "iface"; tps: string[]; nodes: Node[]; origin: Origin; parsed: Parsed };
export type ValueDecl = { t: Ty; origin: Origin; node: Node; marker: "pure" | "effect" | null; flags?: Flags };
export type TypeCtx = { tps: Set<string>; typeofLookup?: (name: string, node: Node) => Ty | undefined };

// DELIBERATE CHANGE (2026-11-24, x1, H): @plain, a built-in whose result must be plain data (live rg-sig.ss.ts)
const FLAG_NAMES = ["mutates", "fresh", "view", "retains", "banned", "plain"] as const;
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
    return builtinNamesOf([...this.types]);
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
  // what isAlias and member read: the declarations (subtype.ss.ts)
  decls: DeclOps = { decl: (n) => this.types.get(n), expand: (t) => this.expand(t), ifaceRec: (n) => this.ifaceRec(n), strictIndex: () => this.strictIndex, at: (ts, i) => ts[i] };
  isAlias = isAliasWith(this.decls);

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
        // DELIBERATE CHANGE (2026-11-23, a9): a use of a user alias not loaded ([type-cycle]) says why; the cell is still rejected
        const unloaded = origin === "user" && (p.program.body as Node[]).some((st) => { const d = st.type === "ExportNamedDeclaration" && st.declaration ? st.declaration : st; return (d.type === "TSTypeAliasDeclaration" || d.type === "TSInterfaceDeclaration") && d.id.name === name; });
        // DELIBERATE CHANGE (2026-11-24, t1): an interface too, and the message names [banned-member] (live rg-convert.ss.ts)
        this.onErr(n, "unknown-type", unloaded ? `type ${name} cannot be used: it is not loaded: it is defined by itself ([type-cycle]) or declares a member no type may declare ([banned-member])` : `unknown type ${name}`);
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
    const key = typeKey(t);
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
  member = memberWith(this.decls);

  isTypedArray = (t: Ty) => t.k === "named" && TYPED_ARRAYS.includes(t.n);

  // ---- subtyping, call signatures, iteration, unification (subtype.ss.ts) ----
  // what the SoundScript cells take from the Registry: its declarations, and object identity
  ops: RegOps = { expand: (t) => this.expand(t), isAlias: (n) => this.isAlias(n), member: (t, n) => this.member(t, n), isTypedArray: (t) => this.isTypedArray(t), same: (a, b) => a === b, at: (ts, i) => ts[i], fresh: () => ++alphaNames, fnOwn: (n) => this.fnOwn(n) };
  // DELIBERATE CHANGE (2026-11-24, x1, C): a member every function value has (live rg-registry.ts fnOwn)
  fnOwn(n: string): boolean { return FN_OWN_MEMBERS.has(n); }
  // DELIBERATE CHANGE (2026-11-24, y1): w1's memoised plain walk is gone with the width test it served (subtype.ss.ts takesRecord)
  callSigs = callSigsWith(this.ops);
  // Element type of `for...of` / spread / Iterable<T>, or undefined if not iterable.
  iterElem = iterElemWith(this.ops);
  subOps = subWith(this.ops, this.iterElem, this.callSigs);
  unifyOps = unifyWith(this.ops, this.subOps, this.iterElem, this.callSigs);
  memberOf = memberOfWith(this.ops);
  sub(s: Ty, t: Ty, seen?: Set<string>): boolean {
    // the scan memberOf skips would record pairs in a seen of the caller's, and convert aliases, which may report
    if (!seen && this.quiet(s) && this.quiet(t) && this.memberOf(s, t)) return true;
    return this.subOps(s, t, seen ?? new Set());
  }
  // alias keys whose expansion, and that of every alias it reaches, reports nothing (conversion is deterministic)
  quietKeys = new Set<string>();
  // expanding t, or any alias it reaches, reports no problem
  quiet(t: Ty): boolean {
    const seen = new Set<string>();
    const go = (x: Ty): boolean => {
      switch (x.k) {
        case "named": {
          if (!this.isAlias(x.n)) return x.args.every(go);
          const key = typeKey(x);
          if (this.quietKeys.has(key) || seen.has(key)) return true;
          if (seen.size > 1000) return false;
          seen.add(key);
          const e = this.expandMemo.get(key) ?? this.trial(x);
          return !!e && e.k !== "err" && go(e);
        }
        case "arr": return go(x.el);
        case "tup": return x.els.every(go);
        case "union": return x.ts.every(go);
        case "rec": return [...x.props.values()].every((p) => go(p.t)) && (!x.index || go(x.index)) && [...(x.calls ?? []), ...(x.ctors ?? [])].every(go);
        case "fn": return x.ps.every((p) => go(p.t)) && go(x.ret);
        default: return true;
      }
    };
    const ok = go(t);
    if (ok) for (const k of seen) this.quietKeys.add(k);
    return ok;
  }
  // t expanded with nothing kept: its expansion, or null when expanding it reports a problem
  trial(t: Ty): Ty | null {
    let loud = false;
    const e = this.peek(() => { this.onUnsup = () => void (loud = true); this.onErr = () => void (loud = true); return this.expand(t); });
    return loud ? null : e;
  }
  // inference: collect candidates for type variables in `tvs` by matching parameter p against argument a
  unify(p: Ty, a: Ty, m: Subst, tvs: Set<string>, depth = 0): void {
    this.unifyOps(p, a, m, tvs, depth);
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

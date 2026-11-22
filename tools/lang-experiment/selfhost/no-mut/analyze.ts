// No-Mut census for one source. The live checker (lite/core.ts runCheck over a linkMd copy whose owCheckIn first hands
// the cell's (R, F, T) to a hook, as selfhost/late-code does), and per cell:
//   writes: every member assignment, update, delete, mutating method call (F.memberFlags .mutates) and Object.assign
//           onto an existing value; the receiver's root classified into groups a..h, with a captured flag (f)
//   passes: every argument the checker counts as given to a parameter typed Mut (owMutParamArg)
//   mutParams: every function parameter whose binding type is Mut (explicit or through an alias), with what the
//           function does with it
//   explicit: every TSTypeReference named Mut in the source text, by position (parsed separately: the checker's tree
//           does not visit types)
import { runCheck, type Sources } from "../../lite/core.ts";
import { linkMd } from "../../lite/infer-ss.ts";
import * as T from "../../lite/types.ts";
import { TS, TSX } from "../../lite/infer/frozen/ts/parse.ts";

let SINK: ((R: any, F: any, Tr: any) => void) | null = null;
const lateHook = (R: any, F: any, Tr: any) => { if (SINK) SINK(R, F, Tr); };
// owCheckIn exactly as lite/infer/ow-entry.ss.ts has it (read 2026-11-22 23:30), after lateHook
const owCheckInHooked = (owBindingOfFn: any, owCaptures: any, owCaptureErrs: any, owPlacement: any, owLateUses: any, owActionEscapes: any, ixOut: any, lateHook: any) => (R: any, F: any, T: any) => {
  lateHook(R, F, T);
  const O = { T, F, R };
  const W = { errs: null, seen: new Set(), unsup: null };
  const caps = owCaptures(O, W);
  const byFn = owBindingOfFn(F);
  owCaptureErrs(O, W, caps, byFn);
  owPlacement(O, W);
  owLateUses(O, W, caps, byFn);
  return { diags: ixOut(W.errs), actions: owActionEscapes(O), unsup: ixOut(W.unsup), gap: T.other };
};
const L: any = linkMd({ owCheckIn: owCheckInHooked } as any, { lateHook });

// group of a write's receiver root:
//   a        a local bound to a literal (no spread) or `new` with no non-primitive argument, written through its own name
//   g-fresh  a local bound to an intrinsic marked fresh (slice, map, Array.from, structuredClone, snapshot)
//   g-copy   a local bound to a spread literal or a `new` given a non-primitive argument (new Map(m), [...xs])
//   g-ret    the result of an intrinsic that is not fresh (returns its receiver or a part of it), directly or via a local
//   b        a second local bound directly to an a/g-fresh/g-copy local (const b = a), same function
//   b2       an alias of an alias
//   c        a parameter typed Mut (of a nested function, or of the function a cell returns)
//   d        the result of a call of a user function, directly or bound to a local
//   e        a field or element of something (m.a.push, m.get(k)!.push, a destructured or for-of element)
//   h        other (a global, this, a let whose sources differ in kind, ...)
// f (captured) is a separate flag: the write is in a function other than the one that declares the root binding
export type Group = "a" | "g-fresh" | "g-copy" | "g-ret" | "b" | "b2" | "c" | "d" | "e" | "h";
const RANK: Record<Group, number> = { a: 0, "g-fresh": 1, "g-copy": 2, b: 3, b2: 4, c: 5, d: 6, e: 7, "g-ret": 8, h: 9 };
export type Origin = { g: Group; captured: boolean; cParam?: "cellfn" | "nested"; callee?: string; why: string; root?: string };
export type WriteRep = { line: number; how: string; group: Group; captured: boolean; capKind: string | null; cParam?: string; callee?: string; why: string; root?: string; recvMut: boolean; fnClass: string };
export type PassRep = { line: number; callee: string; argGroup: Group; captured: boolean; root?: string };
export type ParamRep = { line: number; name: string; fnLine: number; fnClass: string; fnName: string; explicit: boolean; tShow: string; typed: boolean; writes: string[]; reads: string[]; recursesWithIt: boolean; passedOn: number; returnsIt: boolean };
export type RetRep = { line: number; fnName: string; fnClass: string; explicit: boolean; tShow: string };
export type ExplicitRep = { line: number; pos: string; detail: string; inCell: string | null };
export type CellRep = {
  name: string; line: number; status: string; rules: string[]; reached: boolean; at: number; end: number;
  writes: WriteRep[]; passes: PassRep[]; params: ParamRep[]; rets: RetRep[]; explicit: ExplicitRep[]; aliasIs: string[]; aliasHas: string[];
};

const isFn = (n: any) => n && (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression" || n.type === "FunctionDeclaration");
const WRAP = new Set(["ParenthesizedExpression", "TSNonNullExpression", "TSAsExpression", "TSSatisfiesExpression", "ChainExpression", "TSTypeAssertion"]);
const strip = (x: any) => { while (x && WRAP.has(x.type)) x = x.expression; return x; };

function analyzeCell(R: any, F: any, Tr: any) {
  const O = { T: Tr, F, R };
  const RQ = R.quiet ?? R;
  const OQ = { T: Tr, F, R: RQ };
  const W = { errs: null, seen: new Set(), unsup: null };
  const byFn: Map<number, number> = L.owBindingOfFn(F);
  const encl = (n: any) => L.owEncl(O, n);
  const isMutT = (t: any) => t !== undefined && T.isNamed(t, "Mut");
  const bindingAt = (n: any) => L.owBindingAt(O, n);
  const kept = (f: any) => f.nid !== Tr.fn.nid && L.owKept(OQ, byFn, f);
  // the function a cell returns as its value: the cell function's expression body, or the argument of its return
  const cellValueFns = new Set<number>();
  { const fp = L.ixFnParts(Tr.fn); const b = fp?.body; const s = b && strip(b); if (s && isFn(s)) cellValueFns.add(s.nid); }
  const fnClass = (g: any): string => g.nid === Tr.fn.nid ? "cell" : cellValueFns.has(g.nid) ? "cellfn" : L.owHelper(O, byFn, g) !== undefined ? "helper" : (() => { const p = Tr.parent.get(g.nid); return p && p.type === "CallExpression" && p.callee.nid !== g.nid && L.owNonRetainingArg(OQ, p, L.owArgIndex(p.arguments, g)) ? "callback" : kept(g) ? "kept" : "other"; })();
  const fnName = (g: any): string => { const id = byFn.get(g.nid); const b = id === undefined ? undefined : F.bindings.get(id); return b?.name ?? (cellValueFns.has(g.nid) ? "<cell value fn>" : `<fn@${g.line}>`); };
  const sigOf = (c: any) => F.calls.get(c.nid)?.sig ?? null;
  const intrinsic = (c: any) => !!sigOf(c)?.flags?.intrinsic;
  const freshCall = (c: any) => { const s = sigOf(c); return s !== null && !!s.flags?.intrinsic && !!s.flags.fresh && !s.flags.view; };
  const calleeName = (c: any): string => { const k = strip(c.callee); if (k?.type === "Identifier") return k.name; if (k?.type === "MemberExpression" && !k.computed) return "." + k.property.name; return "?"; };
  const declOf = (b: any) => Tr.byNid.get(b.nid);
  const inside = (b: any, f: any) => L.owInside(O, b, f);
  const worst = (xs: Origin[]): Origin => xs.reduce((m, x) => (RANK[x.g] > RANK[m.g] ? x : m));

  // the origin of a value expression evaluated in function g; alias depth counts locals bound to locals
  function originExpr(x0: any, g: any, depth: number, seen: Set<number>): Origin {
    const x = strip(x0);
    if (!x) return { g: "h", captured: false, why: "none" };
    switch (x.type) {
      case "ArrayExpression": case "ObjectExpression": {
        const spread = (x.type === "ArrayExpression" ? x.elements : x.properties).some((e: any) => e && e.type === "SpreadElement");
        return { g: spread ? "g-copy" : "a", captured: false, why: spread ? "spread literal" : "literal" };
      }
      case "NewExpression": {
        const copy = x.arguments.some((a: any) => { const t = F.types.get(a.nid); return a.type === "SpreadElement" || (t !== undefined && !T.isPrimitive(t) && t.k !== "fn"); });
        return { g: copy ? "g-copy" : "a", captured: false, why: copy ? `new ${x.callee?.name ?? "?"}(non-primitive)` : `new ${x.callee?.name ?? "?"}` };
      }
      case "CallExpression": {
        if (intrinsic(x)) {
          if (freshCall(x)) return { g: "g-fresh", captured: false, why: `fresh ${calleeName(x)}` };
          // a method whose result has its receiver's type returns the receiver (sort, fill, set); otherwise a part of it (get, find, pop)
          const k = strip(x.callee);
          if (k?.type === "MemberExpression") { const rt = F.types.get(x.nid), ot = F.types.get(k.object.nid); const ou = ot !== undefined && isMutT(ot) ? ot.args[0] : ot; if (rt !== undefined && ou !== undefined && T.show(rt) !== T.show(ou)) return { g: "e", captured: false, why: `element via ${calleeName(x)}`, root: rootName(x) }; }
          return { g: "g-ret", captured: false, why: `intrinsic ${calleeName(x)}` };
        }
        const pre = F.calls.get(x.nid)?.prelude ?? null;
        if (pre !== null) return { g: pre === "snapshot" || pre === "structuredClone" ? "g-fresh" : "g-ret", captured: false, why: `prelude ${pre}` };
        return { g: "d", captured: false, callee: calleeName(x), why: `call ${calleeName(x)}` };
      }
      case "ConditionalExpression": return worst([originExpr(x.consequent, g, depth, seen), originExpr(x.alternate, g, depth, seen)]);
      case "LogicalExpression": return worst([originExpr(x.left, g, depth, seen), originExpr(x.right, g, depth, seen)]);
      case "MemberExpression": return { g: "e", captured: false, why: "member", root: rootName(x) };
      case "Identifier": {
        // a local bound to another name: an alias of what that name is
        const b = bindingAt(x);
        if (b === undefined) return { g: "h", captured: false, why: "unbound " + x.name };
        const t = originBinding(b, x, g, depth + 1, seen);
        const g2: Group = t.g === "a" || t.g === "g-fresh" || t.g === "g-copy" ? "b" : t.g === "b" || t.g === "b2" ? "b2" : t.g;
        return { ...t, g: g2, why: `alias of ${b.name} (${t.why})` };
      }
      case "AwaitExpression": return { g: "h", captured: false, why: "await" };
      default: return { g: "h", captured: false, why: x.type };
    }
  }
  function rootName(x: any): string { let c = strip(x); while (c && (c.type === "MemberExpression" || c.type === "CallExpression")) c = strip(c.type === "MemberExpression" ? c.object : c.callee); return c?.type === "Identifier" ? c.name : c?.type ?? "?"; }
  // the origin of a binding referred to at ref r (in function g)
  function originBinding(b: any, r: any, g: any, depth: number, seen: Set<number>): Origin {
    const captured = !inside(b, encl(r));
    const o = originOwn(b, depth, seen);
    return { ...o, captured: captured || o.captured, root: b.name };
  }
  function originOwn(b: any, depth: number, seen: Set<number>): Origin {
    if (b.kind === "global" || b.kind === "prelude" || b.kind === "fn") return { g: "h", captured: false, why: b.kind };
    if (b.kind === "param") {
      if (b.cellParam) return { g: "h", captured: false, why: "cell input" };
      const d = declOf(b); const f = d === undefined ? undefined : encl(d);
      return { g: "c", captured: false, cParam: f !== undefined && cellValueFns.has(f.nid) ? "cellfn" : "nested", why: "param" };
    }
    if (seen.has(b.id)) return { g: "h", captured: false, why: "cycle" };
    seen = new Set([...seen, b.id]);
    const d = declOf(b);
    if (d === undefined) return { g: "h", captured: false, why: "no decl" };
    const p = Tr.parent.get(d.nid);
    const fnOfDecl = encl(d);
    const sources: Origin[] = [];
    if (p !== undefined && p.type === "VariableDeclarator" && p.id.nid === d.nid) {
      if (p.init !== null) sources.push(originExpr(p.init, fnOfDecl, depth, seen));
      else { const dl = Tr.parent.get(p.nid), s = dl && Tr.parent.get(dl.nid); if (s && (s.type === "ForOfStatement" || s.type === "ForInStatement") && s.left.nid === dl.nid) sources.push({ g: "e", captured: false, why: "for-of element" }); }
    } else {
      // destructured, a for-of / for-in variable, a catch parameter
      let q = p; while (q !== undefined && (q.type === "Property" || q.type === "ObjectPattern" || q.type === "ArrayPattern" || q.type === "AssignmentPattern" || q.type === "RestElement")) q = Tr.parent.get(q.nid);
      if (q !== undefined && q.type === "VariableDeclarator") sources.push({ g: "e", captured: false, why: "destructured" });
      else if (q !== undefined && q.type === "VariableDeclaration") { const s = Tr.parent.get(q.nid); sources.push({ g: s && (s.type === "ForOfStatement" || s.type === "ForInStatement") ? "e" : "h", captured: false, why: s?.type === "ForOfStatement" ? "for-of element" : "decl " + (s?.type ?? "?") }); }
      else sources.push({ g: "h", captured: false, why: "decl " + (q?.type ?? p?.type ?? "?") });
    }
    if (b.kind === "let") for (const r of Tr.refs.get(b.id) ?? []) {
      const a = Tr.parent.get(r.nid);
      if (a !== undefined && a.type === "AssignmentExpression" && a.left.nid === r.nid && a.operator === "=") {
        const o = originExpr(a.right, encl(a), depth, seen);
        sources.push({ ...o, captured: o.captured || !inside(b, encl(a)) });
      }
    }
    if (!sources.length) return { g: "h", captured: false, why: "no source" };
    const o = worst(sources);
    const capAny = sources.some((s) => s.captured);
    return { ...o, captured: capAny || o.captured };
  }

  // a write's receiver x, at write node w, in function g
  function classifyRecv(x0: any, w: any): Origin {
    const g = encl(w);
    const x = strip(x0);
    if (!x) return { g: "h", captured: false, why: "none" };
    if (x.type === "Identifier") {
      const b = bindingAt(x);
      if (b === undefined) return { g: "h", captured: false, why: "unbound" };
      return originBinding(b, x, g, 0, new Set());
    }
    if (x.type === "MemberExpression") { const root = strip(x.object); let rb: any; let c = root; while (c && (c.type === "MemberExpression" || c.type === "CallExpression")) c = strip(c.type === "MemberExpression" ? c.object : c.callee); if (c?.type === "Identifier") rb = bindingAt(c); return { g: "e", captured: rb !== undefined && !inside(rb, g), why: "nested", root: rootName(x) }; }
    if (x.type === "CallExpression") {
      const o = originExpr(x, g, 0, new Set());
      // a call's result written directly: a user call is d; an intrinsic's g-ret / g-fresh / g-copy temporary
      if (o.g === "d") return o;
      if (o.g === "g-ret") { const rn = rootName(x); let c = strip(x); while (c && (c.type === "MemberExpression" || c.type === "CallExpression")) c = strip(c.type === "MemberExpression" ? c.object : c.callee); const rb = c?.type === "Identifier" ? bindingAt(c) : undefined; return { ...o, captured: rb !== undefined && !inside(rb, g), root: rn }; }
      return o;
    }
    if (x.type === "ArrayExpression" || x.type === "ObjectExpression" || x.type === "NewExpression") return { g: "a", captured: false, why: "temporary" };
    return { g: "h", captured: false, why: x.type };
  }
  const capKind = (w: any, o: Origin): string | null => o.captured ? fnClass(encl(w)) : null;

  const writes: WriteRep[] = [], passes: PassRep[] = [];
  const push = (w: any, recv: any, how: string) => {
    const o = classifyRecv(recv, w);
    const rt = F.types.get(strip(recv)?.nid);
    writes.push({ line: w.line, how, group: o.g, captured: o.captured, capKind: capKind(w, o), cParam: o.cParam, callee: o.callee, why: o.why, root: o.root, recvMut: isMutT(rt), fnClass: fnClass(encl(w)) });
  };
  for (const n of Tr.all) {
    if (n.type === "AssignmentExpression" && strip(n.left)?.type === "MemberExpression") push(n, strip(n.left).object, (strip(n.left).computed ? "index" : "member") + "-assign");
    else if (n.type === "UpdateExpression" && strip(n.argument)?.type === "MemberExpression") push(n, strip(n.argument).object, "update");
    else if (n.type === "UnaryExpression" && n.operator === "delete" && strip(n.argument)?.type === "MemberExpression") push(n, strip(n.argument).object, "delete");
    else if (n.type === "CallExpression") {
      const c = strip(n.callee);
      if (c?.type === "MemberExpression" && F.memberFlags.get(c.nid)?.mutates) push(n, c.object, "method:" + (c.computed ? "[]" : c.property.name));
      else if (c?.type === "MemberExpression" && strip(c.object)?.type === "Identifier" && strip(c.object).name === "Object" && !c.computed && c.property.name === "assign" && n.arguments[0] && strip(n.arguments[0]).type !== "ObjectExpression") push(n, n.arguments[0], "Object.assign");
      n.arguments.forEach((a: any, i: number) => {
        if (!L.owMutParamArg(O, n, i)) return;
        const o = classifyRecv(a, n);
        passes.push({ line: n.line, callee: calleeName(n), argGroup: o.g, captured: o.captured, root: o.root });
      });
    }
  }
  // parameters typed Mut and functions returning Mut
  const params: ParamRep[] = [], rets: RetRep[] = [];
  for (const f of Tr.fns) {
    const fp = L.ixFnParts(f);
    if (fp === null) continue;
    const cls = fnClass(f);
    const ft = F.types.get(f.nid);
    if (ft !== undefined && ft.k === "fn" && f.nid !== Tr.fn.nid) {
      let r = ft.ret;
      if (r && r.k === "named" && (r.n === "Promise" || r.n === "Generator") && r.args[0]) r = r.args[0];
      if (isMutT(r)) rets.push({ line: f.line, fnName: fnName(f), fnClass: cls, explicit: fp.returnType !== null, tShow: T.show(ft.ret) });
    }
    for (const p of fp.params) {
      const id = p.type === "AssignmentPattern" ? p.left : p;
      if (id.type !== "Identifier") continue;
      const bid = F.bindingOf.get(id.nid), b = bid === undefined ? undefined : F.bindings.get(bid);
      if (b === undefined || !isMutT(b.t)) continue;
      const ws: string[] = [], rs: string[] = [];
      let rec = false, passedOn = 0, returnsIt = false;
      for (const r of Tr.refs.get(b.id) ?? []) {
        const par = Tr.parent.get(r.nid);
        if (par?.type === "ReturnStatement" || (par && isFn(par) && par.body?.nid === r.nid)) returnsIt = true;
        if (par?.type === "MemberExpression" && par.object.nid === r.nid) {
          const up = Tr.parent.get(par.nid);
          const nm = par.computed ? "[]" : par.property.name;
          if (up?.type === "CallExpression" && up.callee.nid === par.nid) (F.memberFlags.get(par.nid)?.mutates ? ws : rs).push("method:" + nm);
          else if (up?.type === "AssignmentExpression" && up.left.nid === par.nid) ws.push(par.computed ? "index-assign" : "member-assign");
          else if (up?.type === "UpdateExpression") ws.push("update");
          else if (up?.type === "MemberExpression" || up?.type === "CallExpression") { // a write further down: m.a.push
            let cur = up, last = par; while (cur && cur.type === "MemberExpression" && cur.object.nid === last.nid) { last = cur; cur = Tr.parent.get(cur.nid); }
            if (cur?.type === "CallExpression" && cur.callee.nid === last.nid && last.type === "MemberExpression" && F.memberFlags.get(last.nid)?.mutates) ws.push("nested-method:" + (last.computed ? "[]" : last.property.name));
            else if (cur?.type === "AssignmentExpression" && cur.left.nid === last.nid) ws.push("nested-assign");
            else rs.push("read:" + nm);
          } else rs.push("read:" + nm);
        }
        if (par?.type === "CallExpression" && par.callee.nid !== r.nid) {
          const i = L.owArgIndex(par.arguments, r);
          if (L.owMutParamArg(O, par, i)) { passedOn++; const k = strip(par.callee); const kb = k?.type === "Identifier" ? bindingAt(k) : undefined; if (kb && kb.fnNode === f.nid) rec = true; if (k?.type === "Identifier" && k.name === fnName(f)) rec = true; }
        }
      }
      const ann = id.typeAnnotation?.typeAnnotation;
      const explicit = ann !== undefined && ann !== null && ann.type === "TSTypeReference" && ann.typeName?.name === "Mut";
      params.push({ line: id.line, name: b.name, fnLine: f.line, fnClass: cls, fnName: fnName(f), explicit, typed: ann != null, tShow: T.show(b.t), writes: ws, reads: rs, recursesWithIt: rec, passedOn, returnsIt });
    }
  }
  return { at: Tr.fn.start, end: Tr.fn.end, writes, passes, params, rets };
}

// ---- explicit Mut in the source text, by position (the TS parser the checker uses; every key walked) ----
const TRANSPARENT = new Set(["TSUnionType", "TSParenthesizedType", "TSIntersectionType", "TSOptionalType", "TSRestType", "TSTypeAnnotation"]);
export type ExplicitAll = { pos: string; detail: string; start: number; end: number; line: number }[];
export function explicitMuts(src: Sources): { list: ExplicitAll; aliasIs: Set<string>; aliasHas: Set<string>; refs: { name: string; start: number }[] } {
  const P = src.tsx ? TSX : TS;
  const prog: any = P.parse(src.cells, { ecmaVersion: "latest", sourceType: "module", locations: true } as any);
  const parent = new Map<any, any>();
  const out: ExplicitAll = [];
  const refs: { name: string; start: number }[] = [];
  const decls: { name: string; node: any; body: any }[] = [];
  (function walk(n: any, p: any) {
    if (!n || typeof n.type !== "string") return;
    parent.set(n, p);
    if (n.type === "TSTypeAliasDeclaration") decls.push({ name: n.id.name, node: n, body: n.typeAnnotation });
    if (n.type === "TSInterfaceDeclaration") decls.push({ name: n.id.name, node: n, body: n.body });
    if (n.type === "TSTypeReference" && n.typeName?.type === "Identifier") refs.push({ name: n.typeName.name, start: n.start });
    for (const k in n) { if (k === "loc") continue; const v = n[k]; if (Array.isArray(v)) v.forEach((x) => walk(x, n)); else if (v && typeof v === "object" && typeof v.type === "string") walk(v, n); }
  })(prog, null);
  for (const r of collect(prog, (n) => n.type === "TSTypeReference" && n.typeName?.type === "Identifier" && n.typeName.name === "Mut")) {
    let cur = r, p = parent.get(r);
    const path: string[] = [];
    while (p && (p.type.startsWith("TS") && !["TSTypeAliasDeclaration", "TSInterfaceDeclaration", "TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "TSTypeAssertion"].includes(p.type))) {
      if (!TRANSPARENT.has(p.type)) path.push(p.type === "TSTypeParameterInstantiation" ? `arg-of:${parent.get(p)?.typeName?.name ?? parent.get(p)?.type}` : p.type);
      cur = p; p = parent.get(p);
    }
    const owner = p;
    // innermost structural context
    const inner = path[0] ?? "";
    let inFnType = path.some((x) => x === "TSFunctionType" || x === "TSConstructorType" || x === "TSMethodSignature");
    for (let q = p; q && !inFnType; q = parent.get(q)) {
      if (q.type === "TSFunctionType" || q.type === "TSConstructorType" || q.type === "TSMethodSignature" || q.type === "TSCallSignatureDeclaration") inFnType = true;
      if (isFn(q) || q.type === "VariableDeclarator" || q.type === "Program" || q.type === "TSTypeAliasDeclaration" || q.type === "TSInterfaceDeclaration") break;
    }
    const inField = path.some((x) => x === "TSPropertySignature" || x === "TSIndexSignature");
    const inArg = inner.startsWith("arg-of") || inner === "TSArrayType" || inner === "TSTupleType" || inner === "TSTypeOperator";
    let ownerPos = "other";
    let detail = owner?.type ?? "?";
    if (owner && (owner.type === "Identifier" || owner.type === "ObjectPattern" || owner.type === "ArrayPattern" || owner.type === "RestElement" || owner.type === "AssignmentPattern")) {
      let id = owner, q = parent.get(owner);
      if (q?.type === "AssignmentPattern") { id = q; q = parent.get(q); }
      if (isFn(q) && q.params.includes(id)) ownerPos = "param";
      else if (q?.type === "VariableDeclarator") { ownerPos = "local"; const i = q.init; detail = i == null ? "no initializer" : i.type === "ArrayExpression" ? (i.elements.length ? "array literal" : "empty array") : i.type === "NewExpression" ? `new ${i.callee?.name ?? "?"}` : i.type === "ObjectExpression" ? "object literal" : i.type; }
      else if (q?.type === "TSParameterProperty") ownerPos = "param";
      else ownerPos = "other:" + (q?.type ?? "?");
      if (ownerPos === "param") detail = topCell(q, parent) === q ? "param of a cell" : "param";
    } else if (owner && isFn(owner)) ownerPos = "return";
    else if (owner && (owner.type === "NewExpression" || owner.type === "CallExpression")) ownerPos = "type-arg-of-call";
    else if (owner && (owner.type === "TSTypeAliasDeclaration" || owner.type === "TSInterfaceDeclaration")) ownerPos = "alias";
    else if (owner && (owner.type === "TSAsExpression" || owner.type === "TSSatisfiesExpression" || owner.type === "TSTypeAssertion")) ownerPos = "cast";
    let pos: string;
    if (inFnType) pos = "in-function-type";
    else if (inField) pos = "field";
    else if (inArg || ownerPos === "type-arg-of-call") pos = "type-arg";
    else if (ownerPos === "param") pos = detail === "param of a cell" ? "param-cell" : "param-nested";
    else if (ownerPos === "alias") pos = "alias-body";
    else pos = ownerPos;
    out.push({ pos, detail: `${ownerPos}${ownerPos === "local" ? " = " + detail : ""}${path.length ? " via " + path.join(">") : ""}`, start: r.start, end: r.end, line: r.loc.start.line });
  }
  // aliases and interfaces: aliasIs (the body is Mut<…> through unions/parens, or such an alias), aliasHas (holds one anywhere)
  const holdsMut = (body: any, names: Set<string>) => collect(body, (n) => n.type === "TSTypeReference" && n.typeName?.type === "Identifier" && (n.typeName.name === "Mut" || names.has(n.typeName.name))).length > 0;
  const topIs = (body: any, names: Set<string>): boolean => {
    if (!body) return false;
    if (TRANSPARENT.has(body.type)) return (body.types ?? [body.typeAnnotation]).some((x: any) => topIs(x, names));
    return body.type === "TSTypeReference" && body.typeName?.type === "Identifier" && (body.typeName.name === "Mut" || names.has(body.typeName.name));
  };
  const aliasIs = new Set<string>(), aliasHas = new Set<string>();
  for (let ch = true; ch; ) { ch = false; for (const d of decls) if (!aliasIs.has(d.name) && d.node.type === "TSTypeAliasDeclaration" && topIs(d.body, aliasIs)) { aliasIs.add(d.name); ch = true; } }
  for (let ch = true; ch; ) { ch = false; for (const d of decls) if (!aliasHas.has(d.name) && holdsMut(d.body, new Set([...aliasHas, ...aliasIs]))) { aliasHas.add(d.name); ch = true; } }
  return { list: out, aliasIs, aliasHas, refs };
}
function collect(n: any, pred: (n: any) => boolean, acc: any[] = []): any[] {
  if (!n || typeof n.type !== "string") return acc;
  if (pred(n)) acc.push(n);
  for (const k in n) { if (k === "loc") continue; const v = n[k]; if (Array.isArray(v)) v.forEach((x) => collect(x, pred, acc)); else if (v && typeof v === "object" && typeof v.type === "string") collect(v, pred, acc); }
  return acc;
}
// the top-level cell function containing fn q (the init of a top-level declarator)
function topCell(q: any, parent: Map<any, any>): any {
  let top = q;
  for (let p = parent.get(q); p; p = parent.get(p)) if (isFn(p)) top = p;
  return top;
}

export type SourceRep = { ok: boolean; cells: CellRep[]; outside: ExplicitRep[]; aliasIs: string[]; aliasHas: string[] };
export function analyzeSource(src: Sources): SourceRep {
  const got = new Map<number, ReturnType<typeof analyzeCell>>();
  const errs: string[] = [];
  SINK = (R, F, Tr) => { try { const a = analyzeCell(R, F, Tr); got.set(a.at, a); } catch (x) { errs.push((x as Error).stack ?? String(x)); } };
  let ex: ReturnType<typeof explicitMuts>;
  try { ex = explicitMuts(src); } catch (x) { ex = { list: [], aliasIs: new Set(), aliasHas: new Set(), refs: [] }; }
  try {
    const run = runCheck(L.mdCheckSources, src, {});
    if (errs.length) throw new Error("analyzer threw: " + errs[0]);
    const spans: { at: number; end: number; name: string }[] = [];
    const cells: CellRep[] = run.result.cells.map((c, i) => {
      const at = run.spans[i]?.at ?? -1, a = got.get(at);
      const end = a?.end ?? -1;
      spans.push({ at, end, name: c.name });
      const inSpan = (s: number) => a !== undefined && s >= a.at && s < a.end;
      const explicit = ex.list.filter((m) => inSpan(m.start)).map((m) => ({ line: m.line, pos: m.pos, detail: m.detail, inCell: c.name }));
      const names = new Set(ex.refs.filter((r) => inSpan(r.start)).map((r) => r.name));
      return {
        name: c.name, line: c.line, status: c.status, rules: [...new Set(c.errors.map((e) => e.rule))], reached: a !== undefined, at, end,
        writes: a?.writes ?? [], passes: a?.passes ?? [], params: a?.params ?? [], rets: a?.rets ?? [], explicit,
        aliasIs: [...names].filter((n) => ex.aliasIs.has(n)), aliasHas: [...names].filter((n) => ex.aliasHas.has(n) && !ex.aliasIs.has(n)),
      };
    });
    const outside = ex.list.filter((m) => !spans.some((s) => s.end >= 0 && m.start >= s.at && m.start < s.end)).map((m) => ({ line: m.line, pos: m.pos, detail: m.detail, inCell: null }));
    return { ok: run.result.ok, cells, outside, aliasIs: [...ex.aliasIs], aliasHas: [...ex.aliasHas] };
  } finally { SINK = null; }
}

// Rule set R (2026-11-22, the owner's decision): code that runs after a function has given a value may not use what the
// cell can still write. R-Y: in a generator, a Mut-typed local, or a let whose type is not primitive, declared before a
// yield is not used after it ([mut-yield]). R-A: the same across an await, in a function whose values may be seen before
// it ends ([mut-await]); since r2 every nested function, and a binding whose type holds a Mut anywhere. R-K, a function the cell keeps captures no Mut, no local whose type holds one (k1, 2026-11-23) and no let, is in owCaptureErrs. "After" is as
// selfhost/late-code measured it: later in the text, a write whose expression holds the point, or inside a loop around
// the point when the binding is not declared in that loop's body; a call of a function whose captures read the binding
// is a use of it at the call.

// a binding R-Y and R-A follow: a local whose type holds a Mut anywhere (owMutDeep, r2), or a let whose type is not
// primitive (a cell input, a global, a prelude name and a function declaration are not). d1 (2026-11-24): not one that
// holds a FetchResponse, which no other code can reach (S3.19), so reading its body after a point changes nothing seen
export const owLateCand = (owLocalHoldsMut, isPrimitive, owIter) => (O: OwCtx, b: IxBinding): boolean =>
  owIter(O.R, b.t) !== "FetchResponse" && (owLocalHoldsMut(O, b) || (!b.cellParam && b.kind === "let" && !isPrimitive(b.t)));
// g's values may be seen before g ends: g is a generator, or g is nested in the cell (r2: every nested function, awaited
// or not; whether its promise is awaited is not followed). Only a plain async cell's own body is not visible
export const owVisibleFn = (ixFnParts) => (O: OwCtx, byFn: Map<number, number>, g: AstNode): boolean => {
  const fp = ixFnParts(g);
  return (fp !== null && fp.generator) || g.nid !== O.T.fn.nid;
};
// the points of g after which its values may have been seen: its yields, and its awaits when g is visible
export const owLatePoints = (owEncl, owVisibleFn, ixFnParts) => (O: OwCtx, byFn: Map<number, number>, g: AstNode): AstNode[] => {
  const fp = ixFnParts(g);
  if (fp === null || (!fp.async && !fp.generator)) return [];
  const aw = fp.async && owVisibleFn(O, byFn, g);
  return O.T.all.filter((n) => owEncl(O, n).nid === g.nid && (n.type === "YieldExpression" || (aw && (n.type === "AwaitExpression" || (n.type === "ForOfStatement" && n.await)))));
};
export type OwUse = { readonly at: AstNode; readonly write: boolean };
// b's uses: its references, then each call of a function whose captures read b (write: that function writes b)
export const owUsesOf = (owAssignedRef, owWriteRef, owIsCallee) => (O: OwCtx, caps: Map<number, OwCap>, byFn: Map<number, number>, b: IxBinding): OwUse[] => {
  const direct = (O.T.refs.get(b.id) ?? []).map((r): OwUse => ({ at: r, write: owAssignedRef(O, r) || owWriteRef(O, r) }));
  const calls = [...caps].flatMap(([fnid, c]): OwUse[] => {
    const hid = c.read.includes(b.id) ? byFn.get(fnid) : undefined, hb = hid === undefined ? undefined : O.F.bindings.get(hid);
    if (hb === undefined) return [];
    return (O.T.refs.get(hb.id) ?? []).flatMap((r): OwUse[] => {
      const p = O.T.parent.get(r.nid);
      return p !== undefined && owIsCallee(O, r) ? [{ at: p, write: c.wmut.includes(b.id) || c.let.includes(b.id) }] : [];
    });
  });
  return [...direct, ...calls];
};
// the call, assignment, update or delete a write through r is made by: up through members, patterns and properties
export const owWriteAt = () => (O: OwCtx, r: AstNode): AstNode | null => {
  let cur = r;
  for (let p = O.T.parent.get(cur.nid); p !== undefined; p = O.T.parent.get(cur.nid)) {
    if (p.type === "CallExpression" || p.type === "AssignmentExpression" || p.type === "UpdateExpression" || (p.type === "UnaryExpression" && p.operator === "delete")) return p;
    const up = (p.type === "MemberExpression" && p.object.nid === cur.nid) || p.type === "ArrayPattern" || p.type === "ObjectPattern" || p.type === "Property" || p.type === "AssignmentPattern";
    if (!up) return null;
    cur = p;
  }
  return null;
};
// a loop's body
export const owLoopBody = () => (l: AstNode): AstNode | null => {
  switch (l.type) {
    case "ForStatement": case "ForOfStatement": case "ForInStatement": case "WhileStatement": case "DoWhileStatement": return l.body;
    default: return null;
  }
};
// the loops around n inside g, innermost first (not through a function)
export const owLoopsOut = (isFnNode, owLoopBody) => (O: OwCtx, n: AstNode, g: AstNode): AstNode[] => {
  const out: Mut<AstNode[]> = [];
  for (let p = O.T.parent.get(n.nid); p !== undefined && p.nid !== g.nid && !isFnNode(p); p = O.T.parent.get(p.nid)) if (owLoopBody(p) !== null) out.push(p);
  return out;
};
// a use u of a binding declared at d is after the point p of g: later in the text (a for await's iterable is before it),
// a write whose expression holds p, or in a loop around p whose body does not declare it (captured: d is outside g)
export const owAfter = (owWriteAt, owLoopsOut, owLoopBody) => (O: OwCtx, g: AstNode, d: AstNode, captured: boolean, u: OwUse, p: AstNode): boolean => {
  if (!captured && d.start >= p.start) return false;
  const r = u.at, inside = (a: AstNode, b: AstNode) => a.start >= b.start && a.end <= b.end;
  const right = p.type === "ForOfStatement" ? p.right : null, inRight = right !== null && inside(r, right);
  if (r.start >= (right === null ? p.end : right.end) && !inRight) return true;
  const we = u.write ? owWriteAt(O, r) : null;
  if (we !== null && inside(p, we)) return true;
  const l = [...(right === null ? [] : [p]), ...owLoopsOut(O, p, g)].find((x) => inside(r, x) && !(x.nid === p.nid && inRight));
  const body = l === undefined ? null : owLoopBody(l);
  return l !== undefined && (captured || body === null || !inside(d, body));
};
// what to do instead, by what the binding holds
export const owLateMsg = (show, isNamed, owMutDeep, owStripMut) => (O: OwCtx, b: IxBinding, p: AstNode): string => {
  const w0 = owMutDeep(O.R, b.t), top = isNamed(b.t, "Mut");
  const what = top ? `Mut ${b.name}` : w0 !== null ? `${b.name}, whose type holds ${w0},` : `let ${b.name} of type ${show(b.t)}`;
  const at = p.type === "YieldExpression" ? "a yield" : "an await in a function whose values may be seen before it ends";
  const w = p.type === "YieldExpression" ? "yield" : "await";
  return `${what} is declared before ${at} and used after it, and the code after it runs once a value has been given; declare it in the loop body that holds the ${w}, or build the value in a helper call (const v = make(k)); to only read it there, bind it under its plain type before the ${w} (const c: ${show(owStripMut(O.R, b.t))} = ...) and read c${w0 !== null ? "" : "; a let of a primitive type may be used across it"}`;
};
// R-Y and R-A over every function of the cell with a point, each binding owLateCand takes, declared in g before a
// point or read by g from an encloser (then only uses inside g count); one report per binding and g, at its first use after
export const owLateUses = (owLatePoints, owLateCand, owUsesOf, owAfter, owLateMsg, owEncl, owErr) => (O: OwCtx, W: OwW, caps: Map<number, OwCap>, byFn: Map<number, number>): void => {
  for (const g of O.T.fns) {
    const ps: AstNode[] = owLatePoints(O, byFn, g);
    if (!ps.length) continue;
    for (const id of O.T.refs.keys()) {
      const b = O.F.bindings.get(id), d = b === undefined ? undefined : O.T.byNid.get(b.nid);
      if (b === undefined || d === undefined || !owLateCand(O, b)) continue;
      const captured = owEncl(O, d).nid !== g.nid;
      if (captured && !(caps.get(g.nid)?.read ?? []).includes(b.id)) continue;
      for (const u of owUsesOf(O, caps, byFn, b)) {
        if (u.at.nid === b.nid || (captured && !(u.at.start >= g.start && u.at.end <= g.end))) continue;
        const p = ps.find((x) => owAfter(O, g, d, captured, u, x));
        if (p === undefined) continue;
        owErr(W, u.at, p.type === "YieldExpression" ? "mut-yield" : "mut-await", owLateMsg(O, b, p));
        break;
      }
    }
  }
};
// R-M (2026-11-23, m1 step 2): the const bindings of the cell bound to memo(...), the memoised functions it knows (S2.13)
export const owMemoFns = () => (O: OwCtx): Set<number> => {
  const out: Mut<Set<number>> = new Set();
  for (const n of O.T.all) {
    if (n.type !== "VariableDeclarator" || n.init === null || n.id.type !== "Identifier" || n.init.type !== "CallExpression" || O.F.calls.get(n.init.nid)?.prelude !== "memo") continue;
    const b = O.F.bindings.get(O.F.bindingOf.get(n.id.nid) ?? -1);
    if (b !== undefined && b.kind === "const") out.add(b.id);
  }
  return out;
};
// R-M: a Mut local, of the function that makes the call, named in an argument of a call of a memoised function the cell
// knows (owMemoFns) is not written after that call ("after" as owAfter): a miss froze it in place (S2.13). Not seen: the
// local under a second name, and a memoised function that comes from another cell, where the write throws at run time
export const owMemoArgs = (owMemoFns, owEncl, owUsesOf, owAfter, owWriteAt, owErr, isNamed) => (O: OwCtx, W: OwW, caps: Map<number, OwCap>, byFn: Map<number, number>): void => {
  const memos = owMemoFns(O), inside = (a: AstNode, b: AstNode) => a.start >= b.start && a.end <= b.end;
  if (!memos.size) return;
  // a name inside snapshot(…) in the argument gives the memoised function a copy
  const snaps = O.T.all.filter((n) => n.type === "CallExpression" && O.F.calls.get(n.nid)?.prelude === "snapshot");
  const given = (r: AstNode, a: AstNode) => inside(r, a) && !snaps.some((s) => inside(r, s) && inside(s, a));
  for (const c of O.T.all) {
    if (c.type !== "CallExpression" || c.callee.type !== "Identifier" || !memos.has(O.F.bindingOf.get(c.callee.nid) ?? -1)) continue;
    const g = owEncl(O, c), name = c.callee.name;
    for (const [id, rs] of O.T.refs) {
      const b = O.F.bindings.get(id), d = b === undefined ? undefined : O.T.byNid.get(b.nid);
      if (b === undefined || d === undefined || b.cellParam || !(b.mutOwned || isNamed(b.t, "Mut")) || owEncl(O, d).nid !== g.nid) continue;
      if (!rs.some((r) => c.arguments.some((a) => given(r, a)) && owEncl(O, r).nid === g.nid)) continue;
      const u = owUsesOf(O, caps, byFn, b).find((x: OwUse) => x.write && owAfter(O, g, d, false, x, c));
      if (u === undefined) continue;
      const w = u.at.type === "CallExpression" ? u.at : owWriteAt(O, u.at);
      owErr(W, u.at, w !== null && w.type === "CallExpression" ? "mutating-method" : "member-write", `${b.name} is written after it was given to the memoised function ${name}, which froze it in place, so the write would throw; write it before the call, or give ${name} a copy (snapshot(${b.name}))`);
    }
  }
};
// R-P (p1, 2026-11-23): n publishes a value to a holder while its function still runs (S4.11): a State's set or update,
// called or read as a value (const st = s.set, [f].forEach(s.set)); an action called with arguments, or passed to a call
// that may call it. A memoised function is not one: a miss whose arguments reach a function stores nothing (S2.13)
export const owPubNode = (owIsState, ixUm, isNamed, unwrap, owArgIndex) => (O: OwCtx, n: AstNode): boolean => {
  const isAct = (x: AstNode) => { const t = O.F.types.get(x.nid); return t !== undefined && ixUm(O.R, t).some((m) => isNamed(unwrap(m), "Action")); };
  const p = O.T.parent.get(n.nid);
  if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier" && (n.property.name === "set" || n.property.name === "update")) return owIsState(O, n.object);
  if (n.type === "CallExpression") return n.arguments.length > 0 && isAct(n.callee);
  return (n.type === "Identifier" || n.type === "MemberExpression") && p !== undefined && (p.type === "CallExpression" || p.type === "NewExpression") && owArgIndex(p.arguments, n) >= 0 && isAct(n);
};
// R-P: the points of each function after which a value it published may be seen: a publish (owPubNode) in its own body;
// a call of a helper bound to a const or declared with function, at each call; a callback a built-in calls at once, at
// that call. A publish in a kept function is a point of that function only
export const owPubPoints = (owPubNode, owEnclFn, owCallsAtOnce, owDeclaredBy, owIsCallee) => (O: OwCtx): Map<number, AstNode[]> => {
  const out: Mut<Map<number, AstNode[]>> = new Map(), seen: Mut<Set<string>> = new Set();
  const todo: Mut<AstNode[]> = O.T.all.filter((n) => owPubNode(O, n));
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    const e = owEnclFn(O, n) ?? O.T.fn, k = `${e.nid}:${n.nid}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.set(e.nid, [...(out.get(e.nid) ?? []), n]);
    const p = O.T.parent.get(e.nid);
    if (p === undefined || e.nid === O.T.fn.nid) continue;
    if (p.type === "CallExpression" && (p.callee.nid === e.nid || owCallsAtOnce(O, p, e))) { todo.push(p); continue; }
    const b = owDeclaredBy(O, p, e);
    if (b !== undefined && b.fnNode === e.nid) for (const r of O.T.refs.get(b.id) ?? []) { const c = O.T.parent.get(r.nid); if (c !== undefined && owIsCallee(O, r)) todo.push(c); }
  }
  return out;
};
// R-P: a point as the message names it: the name called or read (s.set, put0, sq), or the call's callee
export const owPubWhat = () => (p: AstNode): string => {
  const n = p.type === "CallExpression" ? p.callee : p;
  if (n.type === "Identifier") return `${n.name}(…)`;
  if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier") return n.object.type === "Identifier" ? `${n.object.name}.${n.property.name}${p.type === "CallExpression" ? "(…)" : ""}` : `….${n.property.name}(…)`;
  return "a call";
};
// R-P: a local whose type holds a Mut (or a Mut the function owns), declared in g before a point of g or read by g from
// an encloser, is not written after the point ("after" as owAfter; a call of a helper that writes it, and passing it
// to a Mut parameter, are writes): a function published there may read it through a read-only name (S4.10)
export const owPubWrites = (owPubPoints, owPubWhat, owLocalHoldsMut, owUsesOf, owAfter, owWriteAt, owEncl, owErr, isNamed) => (O: OwCtx, W: OwW, caps: Map<number, OwCap>, byFn: Map<number, number>): void => {
  const pts = owPubPoints(O);
  for (const g of [O.T.fn, ...O.T.fns]) {
    const ps = pts.get(g.nid) ?? [];
    if (!ps.length) continue;
    for (const id of O.T.refs.keys()) {
      const b = O.F.bindings.get(id), d = b === undefined ? undefined : O.T.byNid.get(b.nid);
      if (b === undefined || d === undefined || b.cellParam || !(b.mutOwned || isNamed(b.t, "Mut") || owLocalHoldsMut(O, b))) continue;
      const captured = owEncl(O, d).nid !== g.nid;
      if (captured && !(caps.get(g.nid)?.read ?? []).includes(b.id)) continue;
      for (const u of owUsesOf(O, caps, byFn, b)) {
        if (!u.write || (captured && !(u.at.start >= g.start && u.at.end <= g.end))) continue;
        const p = ps.find((x) => owAfter(O, g, d, captured, u, x));
        if (p === undefined) continue;
        const w = u.at.type === "CallExpression" ? u.at : owWriteAt(O, u.at);
        owErr(W, u.at, w !== null && w.type === "CallExpression" ? "mutating-method" : "member-write", `${b.name} is written after a value is published at ${owPubWhat(p)} in the same run of this function; a function published there may read ${b.name} through a read-only name (S4.10) and would see the write (S4.11); finish every write to ${b.name} before ${owPubWhat(p)}`);
        break;
      }
    }
  }
};
// f1 (2026-11-23, S4.12): a type that holds a function: a function type, a record with a call or construct signature,
// an Action, at any depth (an alias expanded once per key; past 400 parts it is taken to hold none: this check is
// ergonomics, the run-time throw is the guarantee)
export const owTyFn = (owTyKids, typeKey) => (R: IxRegCore, t0: Ty): boolean => {
  const seen: Mut<Set<string>> = new Set(), todo: Mut<Ty[]> = [t0];
  let n = 0;
  for (let t = todo.pop(); t !== undefined && n < 400; t = todo.pop()) {
    n++;
    if (t.k === "fn" || (t.k === "rec" && ((t.calls ?? []).length > 0 || (t.ctors ?? []).length > 0))) return true;
    if (t.k !== "named") { todo.push(...owTyKids(t)); continue; }
    if (t.n === "Action") return true;
    if (!R.isAlias(t.n)) { todo.push(...t.args); continue; }
    const key = typeKey(t);
    if (!seen.has(key)) { seen.add(key); todo.push(R.expand(t)); }
  }
  return false;
};
// f1: a function the argument a makes in g: a function literal, one inside an array, object, conditional or
// parenthesised argument, or the value of a const of g bound to such an expression
export const owMadeFn = (owEncl) => (O: OwCtx, g: AstNode, a: AstNode): AstNode | null => {
  const todo: Mut<AstNode[]> = [a], seen: Mut<Set<number>> = new Set();
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (seen.has(n.nid)) continue;
    seen.add(n.nid);
    if (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression") return n;
    if (n.type === "ArrayExpression") for (const e of n.elements) { if (e !== null) todo.push(e.type === "SpreadElement" ? e.argument : e); }
    else if (n.type === "ObjectExpression") { for (const p of n.properties) if (p.type === "SpreadElement") todo.push(p.argument); else if (p.type === "Property") todo.push(p.value); }
    else if (n.type === "ConditionalExpression") todo.push(n.consequent, n.alternate);
    else if (n.type === "ParenthesizedExpression" || n.type === "TSAsExpression" || n.type === "TSSatisfiesExpression" || n.type === "TSNonNullExpression") { const e = n.expression; if (e !== null) todo.push(e); }
    else if (n.type === "Identifier") {
      const b = O.F.bindings.get(O.F.bindingOf.get(n.nid) ?? -1), d = b === undefined ? undefined : O.T.byNid.get(b.nid);
      const v = d === undefined ? undefined : O.T.parent.get(d.nid), decl = v === undefined ? undefined : O.T.parent.get(v.nid);
      if (d !== undefined && v !== undefined && v.type === "VariableDeclarator" && v.init !== null && decl !== undefined && decl.type === "VariableDeclaration" && decl.kind === "const" && owEncl(O, d).nid === g.nid) todo.push(v.init);
    }
  }
  return null;
};
// f1 (S4.12): a state's set, or an action called, given at a parameter whose type holds a function (owTyFn) a function
// the calling function makes (owMadeFn): the run-time freeze throws there (prelude noBodyFn), so the checker says so
export const owFnPubs = (owIsState, owMadeFn, owTyFn, owEncl, ixUm, isNamed, unwrap, owErr) => (O: OwCtx, W: OwW): void => {
  for (const n of O.T.all) {
    if (n.type !== "CallExpression" || n.arguments.length === 0) continue;
    const c = n.callee, t = O.F.types.get(c.nid);
    const key = c.type === "MemberExpression" && !c.computed && c.property.type === "Identifier" ? c.property.name : "";
    const set = (key === "set" || key === "update") && c.type === "MemberExpression" && owIsState(O, c.object);
    if (!set && !(t !== undefined && ixUm(O.R, t).some((m) => isNamed(unwrap(m), "Action")))) continue;
    const sig = O.F.calls.get(n.nid)?.sig ?? null, d = sig === null ? null : sig.decl ?? sig;
    const ot = set && c.type === "MemberExpression" ? O.F.types.get(c.object.nid) : undefined;
    const st = ot === undefined ? undefined : ixUm(O.R, ot).map((m) => unwrap(m)).find((m) => isNamed(m, "State"));
    const what = c.type === "Identifier" ? `${c.name}(…)` : c.type === "MemberExpression" && c.object.type === "Identifier" ? `${c.object.name}.${key}` : "this call";
    // update's argument is called at once: what it returns is given (an arrow with an expression body)
    const args = key !== "update" ? n.arguments : n.arguments.flatMap((a) => (a.type === "ArrowFunctionExpression" && a.body.type !== "BlockStatement" ? [a.body] : []));
    args.forEach((a, i) => {
      const dp = st !== undefined && st.k === "named" ? st.args[0] : d === null ? undefined : i < d.ps.length ? d.ps[i]?.t : d.rest;
      const m = a.type === "SpreadElement" || dp === undefined || !owTyFn(O.R, dp) ? null : owMadeFn(O, owEncl(O, n), a);
      if (m !== null) owErr(W, m, "fn-publish", `a function made in this function is given to ${what} while the function still runs; at run time that throws (S4.12), since the function could still write what it reads. Give data and make the function where the value is read, or make the function in a cell of its own and take that cell as an input`);
    });
  }
};

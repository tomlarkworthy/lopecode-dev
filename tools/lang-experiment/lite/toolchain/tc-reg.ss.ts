// fnreg.ts fnRegEdits over the typed tree: for each function a cell's function makes, the cell locals it captures, as
// insertions bracketed by /*ss+*/ ... /*ss-*/ (ss_closure around a function, ss_methods around an object literal with
// methods). Names are compared as fnreg.ts compares them: by
// name, not by scope.

// the brackets, written in two pieces: a cell's source may not hold them (tcCompileChecked)
export const tcREG_OPEN = () => "/*" + "ss+*/";
export const tcREG_CLOSE = () => "/*" + "ss-*/";
// the names a binding pattern binds
export const tcPatNames = () => (p: AstNode | null): string[] => {
  const out: Mut<string[]> = [];
  const todo: Mut<(AstNode | null)[]> = [p];
  for (let q = todo.pop(); q !== undefined; q = todo.pop()) {
    if (q === null) continue;
    if (q.type === "Identifier") out.push(q.name);
    else if (q.type === "ObjectPattern") for (const x of q.properties) todo.push(x.type === "RestElement" ? x.argument : x.type === "Property" ? x.value : null);
    else if (q.type === "ArrayPattern") todo.push(...q.elements);
    else if (q.type === "AssignmentPattern") todo.push(q.left);
    else if (q.type === "RestElement") todo.push(q.argument);
  }
  return out;
};
export const tcDeclNames = (tcPatNames) => (ds: AstNode[]): string[] => ds.flatMap((d) => (d.type === "VariableDeclarator" ? tcPatNames(d.id) : []));
// the names a list of statements declares at its own level (let, const, function; with vars, var anywhere below but not in a function)
export const tcLevelNames = (tcDeclNames, tcPatNames, kidsOf) => (body: AstNode[], vars: boolean): string[] => {
  const out: Mut<string[]> = [];
  for (const s of body) {
    if (s.type === "VariableDeclaration" && s.kind !== "var") out.push(...tcDeclNames(s.declarations));
    if (s.type === "FunctionDeclaration") out.push(...tcPatNames(s.id));
    if (!vars) continue;
    const todo: Mut<AstNode[]> = [s];
    for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
      if (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression" || n.type === "FunctionDeclaration") continue;
      if (n.type === "VariableDeclaration" && n.kind === "var") out.push(...tcDeclNames(n.declarations));
      todo.push(...kidsOf(n));
    }
  }
  return out;
};
export const tcWith = () => (b: Set<string>, xs: string[]): Set<string> => new Set([...b, ...xs]);
// freeIn at a binding pattern: it binds its names and reads its defaults and computed keys
export const tcFreePat = () => (p: AstNode, b: Set<string>): TcFreeItem[] => {
  const x = (n: AstNode | null): TcFreeItem => ({ n, b, pat: false });
  const q = (n: AstNode | null): TcFreeItem => ({ n, b, pat: true });
  if (p.type === "Identifier") return [];
  if (p.type === "ObjectPattern") return p.properties.flatMap((r) => (r.type === "RestElement" ? [q(r.argument)] : r.type === "Property" ? [...(r.computed ? [x(r.key)] : []), q(r.value)] : []));
  if (p.type === "ArrayPattern") return p.elements.map(q);
  if (p.type === "AssignmentPattern") return [q(p.left), x(p.right)];
  if (p.type === "RestElement") return [q(p.argument)];
  return [x(p)];
};
// freeIn at a function: its parameters, its expression name and (for a block body) its body's level names and vars are bound
export const tcFreeFn = (tcPatNames, tcLevelNames, tcWith) => (n: AstNode, b: Set<string>): TcFreeItem[] => {
  if (n.type !== "ArrowFunctionExpression" && n.type !== "FunctionExpression" && n.type !== "FunctionDeclaration") return [];
  const own = n.type === "FunctionDeclaration" ? [] : tcPatNames(n.id);
  const pb = tcWith(b, [...n.params.flatMap((p) => tcPatNames(p)), ...own]);
  const ps = n.params.map((p): TcFreeItem => ({ n: p, b: pb, pat: true }));
  const body = n.body;
  if (body.type !== "BlockStatement") return [...ps, { n: body, b: pb, pat: false }];
  const bb = tcWith(pb, tcLevelNames(body.body, true));
  return [...ps, ...body.body.map((s): TcFreeItem => ({ n: s, b: bb, pat: false }))];
};
// freeIn at a block, a switch, a for or a catch clause: the names it binds; null at any other node
export const tcFreeScoped = (tcDeclNames, tcPatNames, tcLevelNames, tcWith, kidsOf) => (n: AstNode, b: Set<string>): TcFreeItem[] | null => {
  const x = (k: AstNode | null, s: Set<string>): TcFreeItem => ({ n: k, b: s, pat: false });
  if (n.type === "BlockStatement" || n.type === "StaticBlock") {
    const bb = tcWith(b, tcLevelNames(n.body, false));
    return n.body.map((s) => x(s, bb));
  }
  if (n.type === "SwitchStatement") {
    const cs = n.cases.flatMap((c) => (c.type === "SwitchCase" ? [c] : []));
    const bb = tcWith(b, tcLevelNames(cs.flatMap((c) => c.consequent), false));
    return [x(n.discriminant, b), ...cs.flatMap((c) => [x(c.test, bb), ...c.consequent.map((s) => x(s, bb))])];
  }
  if (n.type === "ForStatement" || n.type === "ForInStatement" || n.type === "ForOfStatement") {
    const head = n.type === "ForStatement" ? n.init : n.left;
    const bb = tcWith(b, head !== null && head.type === "VariableDeclaration" && head.kind !== "var" ? tcDeclNames(head.declarations) : []);
    return kidsOf(n).map((k) => x(k, bb));
  }
  if (n.type === "CatchClause") {
    const bb = tcWith(b, tcPatNames(n.param));
    return [{ n: n.param, b: bb, pat: true }, x(n.body, bb)];
  }
  return null;
};
// freeIn, one work item: the free name it reads, if any, and the items under it
export const tcFreeStep = (tcFreePat, tcFreeFn, tcFreeScoped, kidsOf) => (e: TcFreeItem): { readonly ref: string | null; readonly next: TcFreeItem[] } => {
  const n = e.n, b = e.b;
  const x = (k: AstNode | null): TcFreeItem => ({ n: k, b, pat: false });
  const go = (next: TcFreeItem[]) => ({ ref: null, next });
  if (n === null) return go([]);
  if (e.pat) return go(tcFreePat(n, b));
  if (n.type === "Identifier") return { ref: b.has(n.name) ? null : n.name, next: [] };
  if (n.type === "MemberExpression") return go([x(n.object), ...(n.computed ? [x(n.property)] : [])]);
  if (n.type === "Property") return go([...(n.computed ? [x(n.key)] : []), x(n.value)]);
  if (n.type === "LabeledStatement") return go([x(n.body)]);
  if (n.type === "BreakStatement" || n.type === "ContinueStatement" || n.type === "MetaProperty" || n.type === "ThisExpression" || n.type === "Super") return go([]);
  if (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression" || n.type === "FunctionDeclaration") return go(tcFreeFn(n, b));
  const scoped = tcFreeScoped(n, b);
  if (scoped !== null) return go(scoped);
  if (n.type === "VariableDeclarator") return go([{ n: n.id, b, pat: true }, x(n.init)]);
  if (n.type === "AssignmentExpression") return go([{ n: n.left, b, pat: n.left.type !== "Identifier" }, x(n.right)]);
  return go(kidsOf(n).map(x));
};
// the free names of a node: references no binding inside it declares
export const tcFreeIn = (tcFreeStep) => (root: AstNode): string[] => {
  const free: Mut<Set<string>> = new Set();
  const todo: Mut<TcFreeItem[]> = [{ n: root, b: new Set(), pat: false }];
  for (let e = todo.pop(); e !== undefined; e = todo.pop()) {
    const s = tcFreeStep(e);
    if (s.ref !== null) free.add(s.ref);
    todo.push(...s.next);
  }
  return [...free];
};
// the cell locals a function captures, sorted
export const tcRegCaps = (tcFreeIn) => (f: AstNode, locals: Set<string>): string[] =>
  tcFreeIn(f).filter((x) => locals.has(x)).toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0));
// (ss_i) => the i-th capture's current value; ss_i < 0: the count. e1 (2026-11-23): the parameter was i, which a
// capture named i read instead of itself; ss_i is a reserved name (messages.ss.ts emittedName), so no capture has it
export const tcThunk = () => (cs: string[]): string =>
  `(ss_i) => ss_i < 0 ? ${cs.length} : ${cs.slice(0, -1).map((c, i) => `ss_i === ${i} ? ${c} : `).join("")}${cs[cs.length - 1] ?? ""}`;
// a method's key as the object literal makes it (fnreg.ts keyOf): a BigInt literal's key is its value's digits in
// base 10, which the tree keeps as written (0x10n is "0x10"), so it is read through BigInt
export const tcRegKey = () => (k: AstNode): string =>
  k.type === "Identifier" ? k.name : k.type === "Literal" ? (k.bigint !== null ? String(BigInt(k.bigint)) : String(k.value)) : "";
// the names a node binds: a function's parameters and name, a declarator's, a catch clause's parameter
export const tcBindsAt = (tcPatNames) => (n: AstNode): string[] => {
  if (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression" || n.type === "FunctionDeclaration") return [...n.params.flatMap((p) => tcPatNames(p)), ...tcPatNames(n.id)];
  return n.type === "VariableDeclarator" ? tcPatNames(n.id) : n.type === "CatchClause" ? tcPatNames(n.param) : [];
};
// the cell function's nodes in preorder with their parents and depths, and the cell's locals: the names its inner
// functions, declarators and catch clauses bind, and a parameter of the cell function the cell assigns
export const tcRegWalk = (tcBindsAt, tcPatNames, kidsOf) => (cellFn: AstNode): { readonly all: TcRegNode[]; readonly locals: Set<string> } => {
  const all: Mut<TcRegNode[]> = [];
  const locals: Mut<Set<string>> = new Set(), assigned: Mut<Set<string>> = new Set();
  const todo: Mut<TcRegNode[]> = [{ n: cellFn, parent: null, depth: 0 }];
  for (let e = todo.pop(); e !== undefined; e = todo.pop()) {
    const n = e.n;
    all.push(e);
    if (n.nid !== cellFn.nid) for (const x of tcBindsAt(n)) locals.add(x);
    if (n.type === "AssignmentExpression" && n.left.type === "Identifier") assigned.add(n.left.name);
    if (n.type === "UpdateExpression" && n.argument.type === "Identifier") assigned.add(n.argument.name);
    for (const k of kidsOf(n).toReversed()) todo.push({ n: k, parent: n, depth: e.depth + 1 });
  }
  const own = cellFn.type === "ArrowFunctionExpression" || cellFn.type === "FunctionExpression" ? cellFn.params.flatMap((p) => tcPatNames(p)) : [];
  for (const p of own) if (assigned.has(p)) locals.add(p);
  return { all, locals };
};
// an object literal whose methods capture: ss_methods(obj, "m", thunk, ...)
export const tcRegMethods = (tcRegCaps, tcThunk, tcRegKey, tcREG_OPEN, tcREG_CLOSE) => (n: AstNode, depth: number, locals: Set<string>, names: TcRegNames): TcRegHit => {
  if (n.type !== "ObjectExpression") return { edits: [] };
  const ms = n.properties.flatMap((p) => (p.type === "Property" && p.method && !p.computed
    ? [{ key: tcRegKey(p.key), cs: tcRegCaps(p.value, locals), start: p.value.start }] : []));
  const reg = ms.filter((m) => m.cs.length > 0);
  if (reg.length === 0) return { edits: [] };
  const list = reg.map((m) => `${JSON.stringify(m.key)}, ${tcThunk(m.cs)}`).join(", ");
  const open: TcRegEdit = { at: n.start, depth, end: false, text: `${tcREG_OPEN}${names.methods}(${tcREG_CLOSE}`, use: "methods" };
  const close: TcRegEdit = { at: n.end, depth, end: true, text: `${tcREG_OPEN}, ${list})${tcREG_CLOSE}`, use: null };
  return { edits: [open, close] };
};
// the edits at one node of the walk: a capturing function (a declaration at the start of its block: it is hoisted)
export const tcRegAt = (tcRegMethods, tcRegCaps, tcThunk, tcREG_OPEN, tcREG_CLOSE) => (e: TcRegNode, locals: Set<string>, names: TcRegNames): TcRegHit => {
  const n = e.n, p = e.parent, depth = e.depth;
  if (p === null) return { edits: [] };
  if (n.type === "ObjectExpression") return tcRegMethods(n, depth, locals, names);
  if (n.type !== "ArrowFunctionExpression" && n.type !== "FunctionExpression" && n.type !== "FunctionDeclaration") return { edits: [] };
  // a method, getter or setter is registered by its object literal (ss_methods) or not at all
  if ((p.type === "Property" && (p.method || p.kind !== "init") && p.value.nid === n.nid) || p.type === "MethodDefinition") return { edits: [] };
  const cs = tcRegCaps(n, locals);
  if (cs.length === 0) return { edits: [] };
  const block = n.type === "FunctionDeclaration" && p.type === "BlockStatement";
  const at = block ? p.start + 1 : n.start;
  if (n.type === "FunctionDeclaration") {
    const id = n.id.type === "Identifier" ? n.id.name : "";
    return { edits: [{ at, depth: block ? depth : depth - 1, end: false, text: `${tcREG_OPEN}${names.closure}(${id}, ${tcThunk(cs)});${tcREG_CLOSE}`, use: "closure" }] };
  }
  const open: TcRegEdit = { at: n.start, depth, end: false, text: `${tcREG_OPEN}${names.closure}(${tcREG_CLOSE}`, use: "closure" };
  return { edits: [open, { at: n.end, depth, end: true, text: `${tcREG_OPEN}, ${tcThunk(cs)})${tcREG_CLOSE}`, use: null }] };
};
// e1 (2026-11-23), S9.8: each call of the prelude's cast gets its type's shape as a second argument, the shapes the
// check kept in source order. With no shapes (a cell compiled without its check) there is no edit, and cast fails each
// value; a count that differs from the calls is a gap, so no call is given another call's shape
export const tcCastEdits = (parseTree, tcGlobalRefStarts, kidsOf, tcREG_OPEN, tcREG_CLOSE) => (typed: string, shapes: readonly unknown[]): TcEdit[] => {
  if (shapes.length === 0) return [];
  const p = parseTree(`(${typed})`, false);
  if (!p.ok) throw new Error(`tc-gap: a typed cell function that does not parse: ${p.message}`);
  const free = new Set(tcGlobalRefStarts(p.ast.program, "cast"));
  const calls: Mut<AstNode[]> = [];
  const todo: Mut<AstNode[]> = [p.ast.program];
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (n.type === "CallExpression" && n.callee.type === "Identifier" && free.has(n.callee.start)) calls.push(n);
    for (const k of kidsOf(n)) todo.push(k);
  }
  if (calls.length !== free.size || calls.length !== shapes.length) throw new Error(`tc-gap: ${free.size} references to cast, ${calls.length} of them calls, and ${shapes.length} shapes from the check`);
  return calls.toSorted((a, b) => (a.type === "CallExpression" && b.type === "CallExpression" ? a.callee.start - b.callee.start : 0)).map((c, i) => {
    const end = c.type === "CallExpression" ? (c.arguments.at(-1) ?? c.callee).end : c.end;
    return { from: end - 1, to: end - 1, text: `${tcREG_OPEN}, ${JSON.stringify([shapes[i]]).slice(1, -1)}${tcREG_CLOSE}` };
  });
};
// x1 (2026-11-24): fnreg.ts guardEdits over the typed tree, the async guard (freeze.ts guardAsync): each async
// function's body declares ss_g; each await, and each yield of an async generator, leaves and resumes it; each argument
// of a call of a member named then or finally is bound. Depth k + 0.5 encloses the edits tcRegAt makes at the same position
export const tcGuardEdits = (kidsOf, tcREG_OPEN, tcREG_CLOSE) => (cellFn: AstNode, o: string): TcRegEdit[] => {
  const wrap = (a: AstNode, depth: number, open: string, close: string): TcRegEdit[] =>
    [{ at: a.start, depth, end: false, text: tcREG_OPEN + open + tcREG_CLOSE, use: "out" }, { at: a.end, depth, end: true, text: tcREG_OPEN + close + tcREG_CLOSE, use: null }];
  const ed: Mut<TcRegEdit[]> = [];
  const todo: Mut<{ readonly n: AstNode; readonly inAsync: boolean; readonly depth: number }[]> = [{ n: cellFn, inAsync: false, depth: 0 }];
  for (let e = todo.pop(); e !== undefined; e = todo.pop()) {
    const n = e.n, d = e.depth;
    const fn = n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression" || n.type === "FunctionDeclaration" ? n : null;
    if (fn !== null && fn.async && fn.body.type !== "BlockStatement") ed.push(...wrap(fn.body, d + 0.5, `(async () => { const ss_g = ${o}.enter(); try { return (`, `); } finally { ${o}.exit(ss_g); } })()`));
    else if (fn !== null && fn.async && fn.body.type === "BlockStatement" && fn.body.body.length > 0)
      ed.push({ at: fn.body.start + 1, depth: d + 0.5, end: false, text: `${tcREG_OPEN}const ss_g = ${o}.enter(); try {${tcREG_CLOSE}`, use: "out" }, { at: fn.body.end - 1, depth: d + 0.5, end: true, text: `${tcREG_OPEN}} finally { ${o}.exit(ss_g); }${tcREG_CLOSE}`, use: null });
    if (n.type === "AwaitExpression") ed.push(...wrap(n, d, `${o}.back(ss_g, `, ")"), ...wrap(n.argument, d + 0.5, `${o}.away(ss_g, `, ")"));
    if (n.type === "YieldExpression" && e.inAsync) ed.push(...wrap(n, d, `${o}.resumed(ss_g, `, ")"), ...wrap(n.argument, d + 0.5, `${o}.left(ss_g, ${o}.back(ss_g, await ${o}.away(ss_g, `, ")))"));
    // a yield with no operand is an Other node of the tree
    if (n.type === "Other" && n.kind === "YieldExpression" && e.inAsync) ed.push(...wrap(n, d, `${o}.resumed(ss_g, `, ` ${o}.left(ss_g, void 0))`));
    const m = n.type === "CallExpression" && n.callee.type === "MemberExpression" ? n.callee : null, key = m === null ? null : m.property;
    if (n.type === "CallExpression" && m !== null && key !== null && (m.computed ? key.type === "Literal" && (key.value === "then" || key.value === "finally") : key.type === "Identifier" && (key.name === "then" || key.name === "finally")))
      for (const a of n.arguments) if (a.type !== "SpreadElement") ed.push(...wrap(a, d + 0.5, `${o}.bind(`, ")"));
    for (const k of kidsOf(n).toReversed()) todo.push({ n: k, inAsync: fn !== null ? fn.async : e.inAsync, depth: d + 1 });
  }
  return ed;
};
// open part 6 (HO, S3.21): the index and length writes of a typed cell function (the checker's ixHoleSite targets), in
// the order of their targets, each with its depth in the tree as tcGuardEdits counts it
export const tcHoleSites = (kidsOf) => (cellFn: AstNode): TcHoleSite[] => {
  const out: Mut<TcHoleSite[]> = [];
  const todo: Mut<{ readonly n: AstNode; readonly depth: number }[]> = [{ n: cellFn, depth: 0 }];
  for (let e = todo.pop(); e !== undefined; e = todo.pop()) {
    const n = e.n, t = n.type === "AssignmentExpression" ? n.left : n.type === "UpdateExpression" ? n.argument : null;
    if (t !== null && t.type === "MemberExpression" && (t.computed || (t.property.type === "Identifier" && t.property.name === "length"))) out.push({ n, t, depth: e.depth });
    for (const k of kidsOf(n)) todo.push({ n: k, depth: e.depth + 1 });
  }
  return out.toSorted((a, b) => a.t.start - b.t.start);
};
// the tokens of src between from and to, at their positions in src
export const tcTokensIn = (tcLexed) => (src: string, from: number, to: number): TcToken[] =>
  tcLexed(src.slice(from, to), 1e9).map((k) => ({ label: k.label, start: k.start + from, end: k.end + from }));
// one write as a call of freeze.ts holeWrites: R[I] = V is o.put(R, I, V), R[I] op= V o.putOp(o.at(R, I), "op", V), R[I]++
// o.putUp(R, I, 1, false), and R.length the same with putLen, lenAt and putLenUp. Each token the call replaces is kept
// in an ss: comment, so the source reads back; a comment or a parenthesis among them is not compiled
export const tcHoleEdit = (tcTokensIn, tcREG_OPEN, tcREG_CLOSE) => (src: string, comments: AstComment[], s: TcHoleSite, o: string): TcRegEdit[] => {
  const n = s.n, t = s.t, d = s.depth, add = (x: string) => (x === "" ? "" : tcREG_OPEN + x + tcREG_CLOSE);
  if (t.type !== "MemberExpression" || (n.type !== "AssignmentExpression" && n.type !== "UpdateExpression")) return [];
  const len = !t.computed || (t.property.type === "Literal" && t.property.value === "length"), pre = n.type === "UpdateExpression" && n.prefix;
  const toks = tcTokensIn(src, t.object.end, n.type === "AssignmentExpression" ? n.right.start : n.end), rb = toks.find((k) => k.label === "]" && k.start >= t.property.end);
  const lb = toks.find((k) => k.label === "[" || (len && k.label === ".")) ?? { start: -1, end: -1 }, hide = "/*" + "ss:";
  const opTok = toks.find((k) => k.start >= t.end && k.label !== ")");
  const opEnd = pre ? n.end : opTok !== undefined && ["=", "_=", "++/--"].includes(opTok.label) ? opTok.end : -1, cut = len ? lb.start : rb?.start ?? -1;
  const ok = (a: number, b: number, n0: number) => a >= 0 && tcTokensIn(src, a, b).length === n0 && !comments.some((c) => c.end > a && c.start < b);
  // open part 7: a parenthesized target, (xs[0]) = 2, has its parentheses kept in the ss: comments
  const lead = tcTokensIn(src, n.start, t.start), opens = lead.filter((k) => k.label === "(").length;
  if (cut < 0 || opEnd < 0 || !ok(cut, opEnd, (len && t.computed ? 3 : len ? 2 : 1) + (pre ? 0 : 1) + opens) || lead.length !== opens + (pre ? 1 : 0))
    throw new Error("tc-gap: an index or length write with a comment among its tokens");
  const op = n.type === "AssignmentExpression" ? n.operator : "", up = n.type === "UpdateExpression" ? `, ${n.operator === "++" ? 1 : -1}, ${pre})` : "";
  const fn = op === "=" ? (len ? "putLen(" : "put(") : op !== "" ? `putOp(${o}.${len ? "lenAt" : "at"}(` : len ? "putLenUp(" : "putUp(";
  const mid = op === "=" ? ", " : op !== "" ? `), ${JSON.stringify(op.slice(0, -1))}, ` : "";
  const e = (at: number, end: boolean, text: string, use: string | null = null): TcRegEdit => ({ at, depth: d, end, text, use });
  const head = lead.length > 0 ? [e(n.start, false, hide), e(t.start, false, "*/" + add(`${o}.${fn}`), "out")] : [e(n.start, false, add(`${o}.${fn}`), "out")];
  const index = len ? [] : [e(lb.start, true, hide), e(lb.end, true, "*/" + add(", "))];
  return [...head, ...index, e(cut, true, add(mid) + hide), e(opEnd, true, "*/" + add(up)), ...(op === "" ? [] : [e(n.end, true, add(")"))])];
};
// the registrations of a typed cell function, as edits to its text in their final order (at one position: ends deepest
// first, then starts outermost first), and the runtime cells they call, in the order closure, methods
export const tcFnRegs = (parseTree, tcRegWalk, tcRegAt, tcGuardEdits, tcHoleSites, tcHoleEdit) => (typed: string, names: TcRegNames, holes: readonly boolean[]): TcRegs => {
  const p = parseTree(`(${typed})`, false);
  if (!p.ok) throw new Error(`tc-gap: a typed cell function that does not parse: ${p.message}`);
  const prog = p.ast.program;
  const st = prog.type === "Program" ? prog.body[0] : undefined;
  if (st === undefined || st.type !== "ExpressionStatement") throw new Error("tc-gap: a typed cell function that is not one expression");
  const w = tcRegWalk(st.expression);
  const hits = w.all.map((e) => tcRegAt(e, w.locals, names));
  const guard = names.out === undefined ? [] : tcGuardEdits(st.expression, names.out);
  // open part 6 (HO): each index or length write the check marks (every one when the marks do not match the writes)
  const sites = names.out === undefined ? [] : tcHoleSites(st.expression), o = names.out ?? "";
  const ho = sites.flatMap((h, i) => (sites.length === holes.length && holes[i] === false ? [] : tcHoleEdit(p.ast.src, p.ast.comments, h, o)));
  const es = [...hits.flatMap((h) => h.edits), ...guard, ...ho]
    .toSorted((a, b) => a.at - b.at || (a.end === b.end ? (a.end ? b.depth - a.depth : a.depth - b.depth) : a.end ? -1 : 1));
  const uses = ["closure", "methods", "out"].filter((u) => es.some((e) => e.use === u));
  return { edits: es.map((e) => ({ from: e.at - 1, to: e.at - 1, text: e.text })), uses };
};

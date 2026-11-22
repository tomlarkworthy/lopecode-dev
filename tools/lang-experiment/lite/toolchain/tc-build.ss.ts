// ss-toolchain.ts compileCell: one SoundScript cell to the Observable variables that run it. A cell's body is a list
// of parts, so the inputs are listed in order of first use without writing the body twice.

export const tcT = () => (text: string): TcPart => ({ k: "text", text });
export const tcR = () => (input: string): TcPart => ({ k: "in", input });
export const tcM = () => (input: string): TcPart => ({ k: "mention", input });
// ojsCell: `[viewof ]<name> = <body>` and the variables Observable's compiler makes of it; a viewof input is $0, $1, …
export const tcBuiltOf = (tcSTATE_VALUE) => (name: string, view: boolean, block: boolean, parts: TcPart[]): TcBuilt => {
  const order: Mut<string[]> = [];
  for (const p of parts) if (p.k !== "text" && !order.includes(p.input)) order.push(p.input);
  const inputs = order;
  const views: readonly string[] = inputs.filter((i) => i.startsWith("viewof "));
  const spell = (i: string) => (views.includes(i) ? `$${views.indexOf(i)}` : i);
  let text = "", js = "";
  for (const p of parts) {
    if (p.k === "text") { text += p.text; js += p.text; }
    else if (p.k === "in") { text += p.input; js += spell(p.input); }
  }
  const own = { name: view ? `viewof ${name}` : name, inputs, definition: `function _${name}(${inputs.map(spell).join(",")}) ${block ? js : `{return (${js});}`}` };
  return { text: `${own.name} = ${text}`, vars: view ? [own, { name, inputs: ["Generators", own.name], definition: tcSTATE_VALUE }] : [own], key: null, ref: false };
};
// a cell the checker does not accept: its source kept in the header; the definition only raises the messages
export const tcRejectedCell = (tcBuiltOf, tcVariableName, tcLANG, tcHeader, tcIn, tcT, tcR) => (text: string, key: string, why: string[], ref: boolean, IN: Map<string, string>): TcBuilt =>
  tcBuiltOf(tcVariableName(key), ref, false, [tcR(tcIn(IN, "rejected")), tcT(`(${tcLANG}${tcHeader({ d: text, rejected: why })}${JSON.stringify(key)}, ${JSON.stringify(why)}, `), tcR(tcIn(IN, "release")), tcT("(this))")]);
export const tcTypeCell = (tcBuiltOf, tcVariableName, tcLANG, tcHeader, tcT) => (text: string, id: AstNode): TcBuilt => {
  if (id.type !== "Identifier") throw new Error("tc-gap: a type declaration whose name is not an identifier");
  return tcBuiltOf(tcVariableName(`type ${id.name}`), false, false, [tcT(`void ${tcLANG}${tcHeader({ d: text })}0`)]);
};
export const tcDeclOf = () => (st: AstNode): AstNode | null => (st.type === "ExportNamedDeclaration" ? st.declaration : st);
// the cell's function: a function declaration, or the one const/let declarator's function initializer
export const tcFnOf = () => (d: AstNode | null): AstNode | null => {
  if (d === null) return null;
  if (d.type === "FunctionDeclaration") return d;
  if (d.type !== "VariableDeclaration" || d.kind === "var" || d.declarations.length !== 1) return null;
  const x = d.declarations[0];
  if (x === undefined || x.type !== "VariableDeclarator" || x.init === null) return null;
  return x.init.type === "ArrowFunctionExpression" || x.init.type === "FunctionExpression" ? x.init : null;
};
export const tcIdName = () => (id: AstNode | null): string | null => (id !== null && id.type === "Identifier" ? id.name : null);
export const tcDeclaredIn = (tcIdName) => (d: AstNode | null): string | null => {
  if (d === null) return null;
  if (d.type === "FunctionDeclaration") return tcIdName(d.id);
  const x = d.type === "VariableDeclaration" ? d.declarations[0] : undefined;
  return x !== undefined && x.type === "VariableDeclarator" ? tcIdName(x.id) : null;
};
// the statement kinds compileChecked tells apart, met as an Other node
export const tcStatementKinds = () => new Set(["ExportNamedDeclaration", "TSTypeAliasDeclaration", "TSInterfaceDeclaration", "FunctionDeclaration", "VariableDeclaration", "VariableDeclarator"]);
// erasesToJs: the TypeScript form commentTypes leaves in the code, named
export const tcModifierAt = (nodeKind) => (n: AstNode): string => {
  const prop = (k: string) => n.type === "Other" && n.props.some((p) => p.key === k && p.value !== null && p.value !== false && p.value !== 0 && p.value !== "");
  if ((n.type === "VariableDeclarator" && n.definite === true) || prop("definite")) return "definite assignment `!:`";
  const kind = nodeKind(n);
  if (kind === "TSParameterProperty") return "a parameter property";
  if (kind === "TSEnumDeclaration") return "enum";
  if (kind === "TSModuleDeclaration") return "namespace";
  const mod = (n.type === "ClassDeclaration" && n.abstract === true) || (n.type === "MethodDefinition" && (n.abstract === true || n.override === true)) ||
    (n.type === "PropertyDefinition" && n.override === true) || (n.type === "TSConstructorType" && n.abstract) ||
    ((n.type === "TSDeclareFunction" || n.type === "VariableDeclaration") && n.declare === true);
  return mod || prop("accessibility") || prop("abstract") || prop("declare") || prop("override") ? "a class member modifier" : "";
};
export const tcErasesToJs = (tcJsErrorOf, tcModifierAt, kidsOf) => (typed: string, fn: AstNode): void => {
  const err = tcJsErrorOf(`(${typed})`);
  if (err === null) return;
  const todo: Mut<AstNode[]> = [fn];
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    const what = tcModifierAt(n);
    if (what !== "") throw new Error(`unsupported: ${what} (${err})`);
    for (const k of kidsOf(n).toReversed()) todo.push(k);
  }
  throw new Error(`unsupported: TypeScript syntax that does not erase to JavaScript (${err})`);
};
// the globals the body reads, in order of first use
export const tcGlobalsInOrder = (tcGlobalRefStarts) => (prog: AstNode, names: string[]): string[] =>
  names.map((g) => ({ g, at: Math.min(...tcGlobalRefStarts(prog, g)) })).filter((x) => x.at < Infinity).toSorted((a, b) => a.at - b.at).map((x) => x.g);
// a parameter's argument: the State handle, a capability's input, compileFor over ss_compile, or a crossing
export const tcArgParts = (tcCaps, tcIn, tcT, tcR) => (p: TcParam, cell: string, refs: string[], IN: Map<string, string>, mod: string): TcPart[] => {
  const input = p.refTyped ? `viewof ${p.name}` : tcCaps.includes(p.name) ? tcIn(IN, p.name) : p.name;
  if (p.name === "compile")
    return [tcR(tcIn(IN, "compileFor")), tcT("("), tcR(input), tcT(`, ${JSON.stringify(cell)}, {`), ...refs.flatMap((x, i) => [tcT(`${i > 0 ? ", " : ""}${JSON.stringify(x)}: `), tcR(x)]), tcT("})")];
  const b = p.boundary;
  if (b === null) return [tcR(input)];
  const shape = JSON.stringify(b.shape);
  if (b.ref) return [tcR(tcIn(IN, "viewRef")), tcT("("), tcR(input), tcT(`, ${shape}, ${JSON.stringify(p.name)})`)];
  return [tcR(tcIn(IN, "cross")), tcT("("), tcR(input), tcT(`, ${shape}, ${JSON.stringify(`${cell}.${p.name}`)}, ${mod})`)];
};
export const tcArgsParts = (tcArgParts, tcT) => (info: TcInfo, refs: string[], IN: Map<string, string>, mod: string): TcPart[] =>
  info.params.flatMap((p, i) => [...(i > 0 ? [tcT(", ")] : []), ...tcArgParts(p, info.name, refs, IN, mod)]);
// the cell's expression, in text order: ref/events(this|module, name, [args], fn[, invalidation]), listen((fn)(args), …), or (fn)(args)
export const tcExprParts = (tcArgsParts, tcIn, tcT, tcR, tcM) => (kind: string, info: TcInfo, refs: string[], IN: Map<string, string>, mod: string, globals: string[], regs: string[], inner: string): TcPart[] => {
  const args = tcArgsParts(info, refs, IN, mod), name = JSON.stringify(info.name), seen = [...globals, ...regs].map(tcM);
  if (kind === "ref" || kind === "events")
    return [tcR(tcIn(IN, kind)), tcT(`(${kind === "ref" ? "this" : mod}, ${name}, [`), ...args, tcT("], "), ...seen, tcT(inner), ...(kind === "events" ? [tcT(", "), tcR("invalidation")] : []), tcT(")")];
  if (kind === "listener") return [tcR(tcIn(IN, "listen")), tcT("("), ...seen, tcT(`(${inner})(`), ...args, tcT(`), ${name}, `), tcR("invalidation"), tcT(`, ${mod})`)];
  // a plain cell's value is deep-frozen as it leaves the cell (freeze.ts out)
  return [tcR(tcIn(IN, "out")), tcT("("), ...seen, tcT(`(${inner})(`), ...args, tcT("))")];
};
// after the checks and the erasure: the inputs, the kind and the definition
export const tcAssemble = (tcPrelude, tcOjsInputGlobals, tcGlobalRefStarts, tcGlobalsInOrder, mdPreludeCalls, tcExprParts, tcBuiltOf, tcVariableName, tcLANG, tcHeader, tcIn, tcINPUTS, tcT, tcR, tcFnRegs, tcApplyEdits) =>
  (text: string, fn: AstNode, info: TcInfo, prog: AstNode, typed: string, ctx: TcCtx): TcBuilt => {
    const IN = ctx.inputs ?? tcINPUTS;
    const used = tcPrelude.filter((n) => tcGlobalRefStarts(prog, n).length > 0);
    // Map, Set and URL in the body are the runtime's freezable SsMap, SsSet and SsURL
    const classes: [string, string][] = [["Map", "SsMap"], ["Set", "SsSet"], ["URL", "SsURL"]];
    const bound: [string, string][] = [...used.filter((n) => tcIn(IN, n) !== n).map((n): [string, string] => [n, n]), ...classes.filter(([g]) => tcGlobalRefStarts(prog, g).length > 0)];
    const globals = tcGlobalsInOrder(prog, [...tcOjsInputGlobals, ...used.filter((n) => tcIn(IN, n) === n)]);
    const kind = info.returnsRef ? "ref" : info.generator && ctx.events.has(info.name) ? "events" : mdPreludeCalls(fn, "on").size > 0 ? "listener" : "cell";
    const refs = [...new Set(info.compiles.flatMap((s) => s.refs))];
    // each function the cell makes registers the locals it captures (fnreg.ts), in a re-parse of `(typed)`: prog is of the uncommented text
    const reg = tcFnRegs(typed, { closure: tcIn(IN, "closure"), methods: tcIn(IN, "methods") });
    const inner = `${tcLANG}${tcHeader({ h: text.slice(0, fn.start), t: text.slice(fn.end) })}${tcApplyEdits(typed, reg.edits)}`;
    const expr = tcExprParts(kind, info, refs, IN, JSON.stringify(ctx.module), globals, reg.uses.map((u) => tcIn(IN, u)), inner);
    const block = bound.length > 0;
    const parts = block ? [tcT("{ const "), ...bound.flatMap(([n, c], i) => [tcT(`${i > 0 ? ", " : ""}${n} = `), tcR(tcIn(IN, c))]), tcT("; return "), ...expr, tcT("; }")] : expr;
    const b = tcBuiltOf(tcVariableName(info.name), kind === "ref", block, parts);
    return { text: b.text, vars: b.vars, key: info.name, ref: kind === "ref" };
  };
// compileChecked: a cell the checker accepted (or one compiled with no module context)
export const tcCompileChecked = (tcMustParse, tcDeclOf, tcFnOf, tcDeclaredIn, tcIdName, tcTypeCell, tcStatementKinds, nodeKind, tcInfosOf, tcLowered, tcKeepJsx, tcCommentTypes, tcErasesToJs, tcAssemble, tcLANG) =>
  (text: string, tsx: boolean, ctx: TcCtx): TcBuilt => {
    for (const m of ["/*" + "ss", tcLANG]) if (text.includes(m)) throw new Error(`cell source contains the reserved text ${m}`);
    const prog = tcMustParse(text, tsx).program;
    const body = prog.type === "Program" ? prog.body : [];
    const st = body[0];
    if (body.length !== 1 || st === undefined) throw new Error("a cell is exactly one top-level statement");
    const d = tcDeclOf(st);
    if (st.type === "Other" && tcStatementKinds.has(st.kind)) throw new Error(`tc-gap: a top-level ${st.kind} met as an Other node`);
    if (d !== null && d.type === "Other" && tcStatementKinds.has(d.kind)) throw new Error(`tc-gap: a declaration ${d.kind} met as an Other node`);
    if (d !== null && (d.type === "TSTypeAliasDeclaration" || d.type === "TSInterfaceDeclaration")) return tcTypeCell(text, d.id);
    const fn = tcFnOf(d);
    if (d !== null && d.type === "VariableDeclaration" && d.declarations.length > 1)
      throw new Error(`one editor cell holds one cell; write ${d.declarations.map((x) => (x.type === "VariableDeclarator" ? tcIdName(x.id) ?? "" : "")).join(" and ")} as separate cells`);
    if (fn === null) throw new Error(`unsupported top-level statement (${nodeKind(st)}); a cell is a top-level function, const or let`);
    const declared = tcDeclaredIn(d);
    const info = (declared !== null && ctx.facts !== null ? ctx.facts.get(declared) : undefined) ?? tcInfosOf(tsx ? tcLowered(text, false) : text)[0];
    if (info === undefined) throw new Error("not a cell");
    const fnSrc = text.slice(fn.start, fn.end);
    const lowered = tsx ? tcKeepJsx(fnSrc) : fnSrc;
    const ct = tcCommentTypes(`(${lowered})`);
    const typed = ct.text.slice(1, -1);
    tcErasesToJs(typed, fn);
    return tcAssemble(text, fn, info, ct.ast.program, typed, ctx);
  };
export const tcTryCompile = (tcCompileChecked) => (text: string, tsx: boolean, ctx: TcCtx): { readonly built: TcBuilt | null; readonly err: unknown } => {
  try { return { built: tcCompileChecked(text, tsx, ctx), err: null }; } catch (e) { return { built: null, err: e }; }
};
// build: with a module context, a cell that does not parse, does not compile or is not accepted compiles to rejectedCell
export const tcBuild = (tcCompileChecked, tcTryCompile, tcRejectedCell, tcIsDuplicateKey, tcNameOf, tcINPUTS) => (text: string, tsx: boolean, ctx: TcCtx, nameHint: string | null): TcBuilt => {
  const accepted = ctx.accepted;
  if (accepted === null) return tcCompileChecked(text, tsx, ctx);
  const IN = ctx.inputs ?? tcINPUTS;
  const hinted = nameHint !== null && tcIsDuplicateKey(nameHint) && ctx.why !== null ? ctx.why.get(nameHint) : undefined;
  if (nameHint !== null && hinted !== undefined && tcNameOf(text) !== nameHint) return tcRejectedCell(text, nameHint, hinted, false, IN);
  const r = tcTryCompile(text, tsx, ctx);
  const out = r.built;
  if (out === null) {
    const msg = messageOf(r.err);
    const name = tcNameOf(text) ?? nameHint;
    if (msg.startsWith("tc-gap:") || name === null) throw r.err;
    return tcRejectedCell(text, name, (ctx.why !== null ? ctx.why.get(name) : undefined) ?? [`[compile] ${msg}`], false, IN);
  }
  if (out.key === null || accepted.has(out.key)) return out;
  return tcRejectedCell(text, out.key, (ctx.why !== null ? ctx.why.get(out.key) : undefined) ?? ["[rejected] not accepted by the checker"], out.ref, IN);
};
export const tcCompileCell = (tcBuild) => (text: string, tsx: boolean, ctx: TcCtx, nameHint: string | null): TcVar[] => tcBuild(text, tsx, ctx, nameHint).vars;
export const tcCompileCellText = (tcBuild) => (text: string, tsx: boolean, ctx: TcCtx, nameHint: string | null): string => tcBuild(text, tsx, ctx, nameHint).text;
export const tcCompileModule = (tcSplitCells, tcContextOf, tcCompileCell) => (src: string, tsx: boolean, accepted: Set<string> | null): TcVar[] => {
  const texts = tcSplitCells(src, tsx);
  const ctx = tcContextOf(texts, tsx, accepted);
  return texts.flatMap((t) => tcCompileCell(t, tsx, ctx, null));
};

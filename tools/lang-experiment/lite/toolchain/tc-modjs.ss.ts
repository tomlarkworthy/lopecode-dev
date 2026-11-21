// module-js.ts moduleJs and syntaxStub, and ss-toolchain.ts fromObservableVariables: plain JavaScript (an exported
// notebook module, a compiled definition) read on the typed tree of the TypeScript parser. A text that parser does not
// read is not covered.

export const tcLitStr = () => (n: AstNode | null | undefined): string | null => (n !== null && n !== undefined && n.type === "Literal" && typeof n.value === "string" ? n.value : null);
// an array of string literals, or null
export const tcStrings = (tcLitStr) => (n: AstNode | null | undefined): string[] | null => {
  if (n === null || n === undefined || n.type !== "ArrayExpression") return null;
  const out: Mut<string[]> = mut([]);
  for (const e of n.elements) { const s = tcLitStr(e); if (s === null) return null; out.push(s); }
  return freeze(out);
};
export const tcPropName = () => (n: AstNode): string | null => (n.type === "MemberExpression" && n.property.type === "Identifier" ? n.property.name : null);
// one call of the module's define function: a $def(pid, name, inputs, _fn) variable, or an import main.define(name, ["module M", "@variable"], (_, v) => v.import(...))
export const tcModuleCall = (tcLitStr, tcStrings, tcPropName) => (n: AstNode, consts: Map<string, string>): { readonly v: TcModuleVar | null; readonly i: TcModuleImport | null } => {
  if (n.type !== "CallExpression") return { v: null, i: null };
  const [a0, a1, a2, a3] = n.arguments;
  if (n.callee.type === "Identifier" && n.callee.name === "$def" && a3 !== undefined && a3.type === "Identifier") {
    const pid = tcLitStr(a0), definition = consts.get(a3.name);
    if (pid === null || definition === undefined) throw new Error("tc-gap: a $def call without a string pid or a const definition");
    return { v: { pid, name: tcLitStr(a1), inputs: tcStrings(a2) ?? [], definition }, i: null };
  }
  const s = tcStrings(a1), m = s !== null ? s[0] : undefined;
  if (tcPropName(n.callee) !== "define" || s === null || s[1] !== "@variable" || m === undefined || !m.startsWith("module ")) return { v: null, i: null };
  const call = a2 !== undefined && a2.type === "ArrowFunctionExpression" ? a2.body : null;
  if (call === null || call.type !== "CallExpression" || tcPropName(call.callee) !== "import") return { v: null, i: null };
  const args: Mut<string[]> = mut([]);
  for (const a of call.arguments) { const x = tcLitStr(a); if (x !== null) args.push(x); }
  const remote = args[0], local = args.at(-1);
  if (remote === undefined || local === undefined) throw new Error("tc-gap: an import call with no string argument");
  return { v: null, i: { from: m.slice(7), remote, local } };
};
export const tcModuleJs = (parseTree, tcModuleCall, childrenOf) => (src: string): { readonly variables: TcModuleVar[]; readonly imports: TcModuleImport[] } => {
  const p = parseTree(src, false);
  if (!p.ok) throw new Error(`tc-gap: a module the typed parse does not read: ${p.message}`);
  const body = p.ast.program.type === "Program" ? p.ast.program.body : [];
  const consts: Mut<Map<string, string>> = mut(new Map());
  for (const st of body) if (st.type === "VariableDeclaration") for (const d of st.declarations) if (d.type === "VariableDeclarator" && d.id.type === "Identifier" && d.init !== null) consts.set(d.id.name, src.slice(d.init.start, d.init.end));
  const known = freeze(consts);
  const variables: Mut<TcModuleVar[]> = mut([]), imports: Mut<TcModuleImport[]> = mut([]);
  const todo: Mut<AstNode[]> = mut([]);
  for (const st of body.toReversed()) if (st.type === "ExportDefaultDeclaration") todo.push(st.declaration);
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    const r = tcModuleCall(n, known);
    if (r.v !== null) variables.push(r.v);
    if (r.i !== null) imports.push(r.i);
    for (const k of childrenOf(n).toReversed()) todo.push(k.node);
  }
  return { variables: freeze(variables), imports: freeze(imports) };
};
// throw Object.assign(new SyntaxError(message), {_sourceExpression: ...}): the message, or null
export const tcStubMessage = (tcPropName) => (n: AstNode): string | null => {
  const a = n.type === "ThrowStatement" ? n.argument : null;
  if (a === null || a.type !== "CallExpression" || a.callee.type !== "MemberExpression" || tcPropName(a.callee) !== "assign") return null;
  const o = a.callee.object, e = a.arguments[0], props = a.arguments[1];
  if (o.type !== "Identifier" || o.name !== "Object" || e === undefined || e.type !== "NewExpression" || e.callee.type !== "Identifier" || e.callee.name !== "SyntaxError") return null;
  if (props === undefined || props.type !== "ObjectExpression" || !props.properties.some((p) => p.type === "Property" && p.key.type === "Identifier" && p.key.name === "_sourceExpression")) return null;
  const m = e.arguments[0];
  return m !== undefined && m.type === "Literal" ? String(m.value) : "undefined";
};
export const tcSyntaxStub = (parseTree, tcStubMessage, childrenOf) => (definition: string): string | null => {
  const p = parseTree(`(${definition})`, false);
  if (!p.ok) throw new Error(`tc-gap: a definition the typed parse does not read: ${p.message}`);
  const todo: Mut<AstNode[]> = mut([p.ast.program]);
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    const m = tcStubMessage(n);
    if (m !== null) return m;
    for (const k of childrenOf(n).toReversed()) todo.push(k.node);
  }
  return null;
};

// ownThis: `this` or `arguments` read by the function itself, not by a function or class body inside it
export const tcOwnThis = (childrenOf) => (body: AstNode): string | null => {
  const todo: Mut<AstNode[]> = mut([body]);
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (n.type === "ThisExpression") return "this";
    if (n.type === "Identifier" && n.name === "arguments") return "arguments";
    if (n.type === "FunctionExpression" || n.type === "FunctionDeclaration" || n.type === "ClassBody") continue;
    for (const k of childrenOf(n).toReversed()) todo.push(k.node);
  }
  return null;
};
// `return (x);`: the span of the parentheses around the whole argument, from the tokens after `return`; null when none
export const tcReturnParens = (tcLexed) => (src: string, from: number, to: number): { readonly start: number; readonly end: number } | null => {
  const toks = tcLexed(src.slice(from, to), 1e9).slice(1);
  const region = toks.at(-1)?.label === ";" ? toks.slice(0, -1) : toks;
  const open = region[0], close = region.at(-1);
  if (open === undefined || close === undefined || open.label !== "(" || close.label !== ")") return null;
  let depth = 0;
  for (let i = 0; i < region.length; i++) {
    const t = region[i];
    if (t === undefined) continue;
    if (t.label === "(") depth++;
    if (t.label === ")") depth--;
    if (depth === 0) return i === region.length - 1 ? { start: from + open.start, end: from + close.end } : null;
  }
  return null;
};
// a candidate text reads back as one const of a function of the wanted kind whose body is the slice
export const tcReadsBack = (parseTree) => (text: string, generator: boolean, block: boolean): string | null => {
  const p = parseTree(text, true);
  if (!p.ok) return p.message;
  const st = p.ast.program.type === "Program" ? p.ast.program.body : [];
  const s0 = st[0], d0 = s0 !== undefined && s0.type === "VariableDeclaration" && s0.declarations.length === 1 ? s0.declarations[0] : undefined;
  const init = st.length === 1 && d0 !== undefined && d0.type === "VariableDeclarator" ? d0.init : null;
  const fn = init !== null && (generator ? init.type === "FunctionExpression" : init.type === "ArrowFunctionExpression") ? init : null;
  const bodyBlock = fn !== null && (fn.type === "FunctionExpression" || fn.type === "ArrowFunctionExpression") && fn.body.type === "BlockStatement";
  const ok = fn !== null && bodyBlock === block && s0 !== undefined && s0.end === text.length;
  return ok ? null : "it reads back as a different cell";
};
// why the variables have no SoundScript form, before the definition is read
export const tcObsRefusal = (tcIdentOk, tcRuntimeInputs, tcCaps, tcIn, tcINPUTS) => (vars: TcObsVar[]): string | null => {
  if (vars.length === 0) return "the text compiles to no variable";
  const names = vars.map((v) => v.name ?? "");
  if (names.some((n) => n.startsWith("viewof "))) return "a viewof cell has no SoundScript form";
  if (names.some((n) => n.startsWith("mutable ") || n.startsWith("initial "))) return "a mutable cell has no SoundScript form";
  if (names.some((n) => n.startsWith("module ")) || vars.some((v) => v.inputs.includes("@variable"))) return "an import has no SoundScript form";
  const v = vars[0];
  if (vars.length !== 1 || v === undefined) return `the text compiles to ${vars.length} variables; a SoundScript cell is one`;
  if (v.name === null || v.name === "") return "an anonymous cell has no SoundScript form; a SoundScript cell is named";
  if (!tcIdentOk(v.name)) return `the cell name ${v.name} is not an identifier`;
  const bad = v.inputs.find((i) => !tcIdentOk(i));
  if (bad !== undefined) return `the cell takes ${bad}, which a SoundScript parameter cannot name`;
  const rt = v.inputs.find((i) => tcRuntimeInputs.has(i));
  if (rt !== undefined) return `the cell takes ${rt}, the input compiled SoundScript cells take for the runtime's ${tcRuntimeInputs.get(rt) ?? ""}`;
  const cap = v.inputs.find((i) => tcCaps.includes(i) && tcIn(tcINPUTS, i) !== i);
  return cap !== undefined ? `the cell takes ${cap}, which as a SoundScript parameter is the ${cap} capability` : null;
};
// the definition as a function of its inputs that reads no `this`: its node in the parse of `(definition)`, or why not
export const tcObsFunction = (tcJsErrorOf, parseTree, tcOwnThis) => (definition: string, inputs: string[]): { readonly fn: AstNode | null; readonly src: string; readonly reason: string } => {
  const err = tcJsErrorOf(definition);
  if (err !== null) return { fn: null, src: "", reason: `the definition does not parse: ${err}` };
  const p = parseTree(`(${definition})`, false);
  if (!p.ok) throw new Error(`tc-gap: a definition the typed parse does not read: ${p.message}`);
  const s0 = p.ast.program.type === "Program" ? p.ast.program.body[0] : undefined;
  const fn = s0 !== undefined && s0.type === "ExpressionStatement" ? s0.expression : null;
  if (fn === null || fn.end !== definition.length + 1 || (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression")) return { fn: null, src: "", reason: "the definition is not a function" };
  if (fn.params.length !== inputs.length || fn.params.some((q, i) => q.type !== "Identifier" || q.name !== inputs[i])) return { fn: null, src: "", reason: "the definition's parameters are not its inputs" };
  const own = tcOwnThis(fn.body);
  return own !== null ? { fn: null, src: "", reason: `the definition reads ${own}, which a SoundScript cell's arrow function does not have` } : { fn, src: p.ast.src, reason: "" };
};
// the texts to try, in order: Observable's compiler writes an expression cell as {return (<expression>);}
export const tcObsCandidates = (tcReturnParens) => (fn: AstNode, src: string, head: string, params: string, expression: boolean | null): { readonly texts: string[]; readonly block: boolean } => {
  if (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression") return { texts: [], block: false };
  const body = fn.body, slice = (a: number, b: number) => src.slice(a, b);
  const r0 = body.type === "BlockStatement" && body.body.length === 1 ? body.body[0] : undefined;
  const ret = r0 !== undefined && r0.type === "ReturnStatement" && r0.argument !== null ? tcReturnParens(src, r0.start, r0.end) : null;
  const asExpr = ret !== null && expression !== false;
  const block = fn.generator || (body.type === "BlockStatement" && !asExpr);
  if (fn.generator) return { texts: [`${head}function* ${params} ${slice(body.start, body.end)};`], block };
  if (body.type !== "BlockStatement") return { texts: [`${head}${params} => ${slice(body.start, body.end)};`], block };
  if (ret !== null && asExpr) return { texts: [`${head}${params} => ${slice(ret.start + 1, ret.end - 1)};`, `${head}${params} => (${slice(ret.start + 1, ret.end - 1)});`], block };
  return { texts: [`${head}${params} => ${slice(body.start, body.end)};`], block };
};
export const tcFromObservableVariables = (tcObsRefusal, tcObsFunction, tcObsCandidates, tcReadsBack) => (vars: TcObsVar[], expression: boolean | null): TcTranslated => {
  const refused = tcObsRefusal(vars);
  const v = vars[0];
  if (refused !== null || v === undefined) return { text: null, reason: refused ?? "" };
  const f = tcObsFunction(v.definition, v.inputs);
  const fn = f.fn;
  if (fn === null || (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression")) return { text: null, reason: f.reason };
  const c = tcObsCandidates(fn, f.src, `const ${v.name ?? ""} = ${fn.async ? "async " : ""}`, `(${v.inputs.join(", ")})`, expression);
  let why = "";
  for (const text of c.texts) {
    const no = tcReadsBack(text, fn.generator, c.block);
    if (no === null) return { text, reason: null };
    why = no;
  }
  return { text: null, reason: `the translation does not parse as SoundScript: ${why}` };
};

// ss-toolchain.ts parseCompiled, compiledKind and decompileVariable: a compiled definition read back on the typed parse
// of `(definition)`. Positions in the result are the definition's; inside, the wrapped text's (one more).

// the runtime cell a call calls by its name or its input, when it is one of names
export const tcRtCall = (tcIn, tcINPUTS) => (n: AstNode | null, names: string[]): string | null => {
  if (n === null || n.type !== "CallExpression") return null;
  const c = n.callee;
  if (c.type !== "Identifier") return null;
  return names.find((x) => c.name === x || c.name === tcIn(tcINPUTS, x)) ?? null;
};
// the header's JSON: d (the whole source), h and t (the text around the function)
export const tcHeaderOf = () => (text: string): TcHeader => {
  const v = JSON.parse(text);
  const field = (k: string): string | null => {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
    const x = k === "d" ? ("d" in v ? v.d : null) : k === "h" ? ("h" in v ? v.h : null) : "t" in v ? v.t : null;
    return typeof x === "string" ? x : null;
  };
  return { d: field("d"), h: field("h"), t: field("t"), text };
};
// the call whose callee or an argument starts at pos, with the node around it
export const tcCallAt = (childrenOf) => (root: AstNode, pos: number): { readonly call: AstNode; readonly fn: AstNode; readonly up: AstNode | null } | null => {
  const todo: Mut<{ readonly n: AstNode; readonly up: AstNode | null }[]> = mut([{ n: root, up: null }]);
  for (let e = todo.pop(); e !== undefined; e = todo.pop()) {
    const n = e.n;
    if (n.type === "CallExpression") {
      const a = n.callee.start === pos ? n.callee : n.arguments.find((x) => x.start === pos);
      if (a !== undefined) return { call: n, fn: a, up: e.up };
    }
    for (const k of childrenOf(n).toReversed()) todo.push({ n: k.node, up: n });
  }
  return null;
};
// outside the function: whether anything reads a runtime cell, and the ref names of compileFor(input, "name", {"ref": ref})
export const tcOutside = (tcRtCall, tcRuntimeInputs, childrenOf) => (root: AstNode, fnNid: number): { readonly ss: boolean; readonly refs: string[] } => {
  let ss = false;
  const refs: Mut<string[]> = mut([]);
  const todo: Mut<AstNode[]> = mut([root]);
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (n.nid === fnNid) continue;
    if ((n.type === "Identifier" && tcRuntimeInputs.has(n.name)) || tcRtCall(n, ["cross", "viewRef", "compileFor"]) !== null) ss = true;
    const o = n.type === "CallExpression" && tcRtCall(n, ["compileFor"]) !== null ? n.arguments[2] : undefined;
    if (o !== undefined && o.type === "ObjectExpression")
      for (const p of o.properties) if (p.type === "Property" && p.key.type === "Literal") refs.push(String(p.key.value));
    for (const k of childrenOf(n).toReversed()) todo.push(k.node);
  }
  return { ss, refs: freeze(refs) };
};
export const tcParseCompiled = (parseTree, tcLangOf, tcLANG, tcHeaderOf, tcCallAt, tcOutside, tcRtCall) => (definition: string): TcCompiled | null => {
  if (tcLangOf(definition) !== "ss") return null;
  const p = parseTree(`(${definition})`, false);
  if (!p.ok) throw new Error(`tc-gap: a definition the typed parse does not read: ${p.message}`);
  const cs = p.ast.comments;
  const at = cs.findIndex((c) => c.block && `/*${c.text}*/` === tcLANG);
  const mark = cs[at], head = cs[at + 1];
  if (mark === undefined) throw new Error("tc-gap: no block marker comment");
  if (head === undefined || head.start !== mark.end || !head.text.startsWith("ss^")) throw new Error("SoundScript variable without a header comment");
  const header = tcHeaderOf(head.text.slice(3));
  const found = tcCallAt(p.ast.program, head.end);
  const out = tcOutside(p.ast.program, found === null ? -1 : found.fn.nid);
  const comments = cs.map((c) => ({ block: c.block, text: c.text, start: c.start - 1, end: c.end - 1 }));
  if (found === null) return { comments, header, headerEnd: head.end - 1, fnEnd: -1, hasFn: false, callee: null, name: null, refs: out.refs };
  const { call, fn, up } = found;
  const calleeNid = call.type === "CallExpression" ? call.callee.nid : -1;
  const listen = fn.nid === calleeNid && up !== null && up.type === "CallExpression" && tcRtCall(up, ["listen"]) !== null && up.arguments[0] !== undefined && up.arguments[0].nid === call.nid ? up : null;
  const rt = tcRtCall(call, ["ref", "events", "rejected"]);
  const callee: TcShape | null = fn.nid === calleeNid ? (listen !== null ? "listen" : out.ss ? "apply" : "plain") : rt === "ref" ? "ref" : rt === "events" ? "events" : rt === "rejected" ? "rejected" : null;
  const holder = listen !== null ? listen : callee === "ref" || callee === "events" ? call : null;
  const named = holder !== null && holder.type === "CallExpression" ? holder.arguments[1] : undefined;
  const name = named !== undefined && named.type === "Literal" && typeof named.value === "string" ? named.value : null;
  return { comments, header, headerEnd: head.end - 1, fnEnd: fn.end - 1, hasFn: true, callee, name, refs: out.refs };
};
export const tcKinds = () => new Map([["plain", "cell"], ["apply", "cell"], ["listen", "listener"], ["ref", "ref"], ["events", "events"]]);
export const tcCompiledKind = (tcParseCompiled, tcKinds) => (definition: string): TcKind | null => {
  const p = tcParseCompiled(definition);
  return p === null || p.callee === null ? null : { callee: p.callee, kind: tcKinds.get(p.callee) ?? null, refs: p.refs };
};
// the cell source a variable holds: the header's d, or h + the function with each kept comment put back + t
export const tcDecompileVariable = (tcParseCompiled, tcUnesc, tcUnkeep) => (definition: string): string | null => {
  const p = tcParseCompiled(definition);
  if (p === null) return null;
  if (p.header.d !== null) return p.header.d;
  if (!p.hasFn) throw new Error("SoundScript variable whose marker opens no call");
  if (p.header.h === null || p.header.t === null) throw new Error("tc-gap: a header without h and t");
  let end = p.fnEnd;
  for (const c of p.comments) if (c.start === end && c.block && (c.text === "ss>" || c.text.startsWith("ss:"))) end = c.end;
  let out = "", at = p.headerEnd, inJsx = false;
  for (const c of p.comments) {
    if (c.start < p.headerEnd || c.end > end || !c.block) continue;
    if (inJsx) { if (c.text === "ss>") { inJsx = false; at = c.end; } continue; }
    if (c.text.startsWith("ss<")) { out += definition.slice(at, c.start) + tcUnkeep(c.text.slice(3)); inJsx = true; }
    else if (c.text.startsWith("ss:")) { out += definition.slice(at, c.start) + tcUnesc(c.text.slice(3)); at = c.end; }
  }
  return p.header.h + out + definition.slice(at, end) + p.header.t;
};
export const tcDecompileModule = (tcDecompileVariable) => (definitions: string[]): string => {
  const out: Mut<string[]> = mut([]);
  for (const d of definitions) { const s = tcDecompileVariable(d); if (s !== null) out.push(s); }
  return freeze(out).join("\n\n") + "\n";
};

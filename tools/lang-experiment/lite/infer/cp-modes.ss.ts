// complete.ts completionsAt by the kind of position: a JSX attribute, a type, the cell's parameter list, and a
// member or name, which a checked copy of the module with the placeholder at the cursor answers.

export const CP_KEYWORDS = () => "const let return if else for of in while do break continue switch case default function true false null undefined typeof async await yield try catch finally throw".split(" ");
// the types a cell may name: the prelude's, JSX's, the handle and ownership types, and the library generics
export const cpTypeNames = (cpDeclared) => (preludeDecls: string, jsxDecls: string): string[] =>
  [...new Set([...cpDeclared(preludeDecls), ...cpDeclared(jsxDecls), "Action", "StateCell", "Mut", "Borrowed", "Array", "ReadonlyArray", "Map", "Set", "Promise", "Generator", "Record", "number", "string", "boolean", "bigint", "unknown", "null", "undefined", "void", "readonly"])]
    .filter((n) => n !== "FetchResponse" && n !== "Child");
// pick: the options whose label starts with the typed word, sorted by label when asked
export const cpPick = () => (from: number, to: number, mode: CpMode, options: CpOption[], prefix: string): CpResult =>
  ({ from, to, mode, options: options.filter((o) => o.label.startsWith(prefix)) });
export const cpByLabel = () => (xs: CpOption[]): CpOption[] => xs.toSorted((a, b) => a.label.localeCompare(b.label));
// <tag attr…: the tag's declared attributes not given yet, children never; null when the tag is not declared
export const cpJsxOptions = (cpMemberNames, cpGivenAttrs, cpNodeOf, cpByLabel, named, show) => (reg: CpReg, at: CpTreeAt, before: string, tag: CpLzNode): CpOption[] | null => {
  const b = tag.kids.find((k) => k.name === "JSXBuiltin"), id = b === undefined ? undefined : cpNodeOf(at, before, b)?.kids[0];
  const p = id === undefined ? undefined : reg.member(named("IntrinsicElements"), before.slice(id.from, id.to));
  if (p === undefined) return null;
  const have = cpGivenAttrs(at, before, tag);
  const opts: Mut<CpOption[]> = [];
  for (const n of cpMemberNames(reg, reg.expand(p.t))) {
    if (n === "children" || have.has(n)) continue;
    const q = reg.member(p.t, n);
    opts.push({ label: n, type: "property", detail: q === undefined ? "" : show(q.t) });
  }
  return cpByLabel(opts);
};
// in a type: the type names, and those the module's other cells declare
export const cpTypeOptions = (cpDeclared, cpByLabel) => (typeNames: string[], cells: string[], at: number): CpOption[] => {
  const own = cells.flatMap((c, i) => (i === at ? [] : cpDeclared(c)));
  const names = [...new Set([...typeNames, ...own])];
  return cpByLabel(names.map((n) => ({ label: n, type: "type", detail: own.includes(n) ? "type in this module" : "prelude" })));
};
// a cell in another language must be annotated (S11.2), so it is inserted with its colon
export const cpOutsideOption = () => (n: string, ann: string | null): CpOption =>
  ({ label: n, type: "variable", detail: ann !== null && ann !== "" ? `other language: ${ann}` : "other language: annotate its type", apply: `${n}: ${ann ?? ""}` });
// in the parameter list: the other cells with their types, the capabilities, the cells in other languages
export const cpParamOptions = (cpOutsideOption, cpByLabel) => (H: CpHost, caps: Map<string, string>, cells: string[], at: number, self: string | null, params: string[], outside: CpOutside[], prefix: string): CpOption[] => {
  const types = new Map(H.cellTypes(cells.filter((c, i) => i !== at).join("\n\n")) ?? []);
  const opts: Mut<CpOption[]> = [];
  for (const [n, t] of types) if (n !== self && !params.includes(n)) opts.push({ label: n, type: "variable", detail: `cell: ${t}` });
  for (const [n, t] of caps) if (!params.includes(n) && !types.has(n)) opts.push({ label: n, type: "variable", detail: `capability: ${t}` });
  for (const o of outside) {
    const n = o.name;
    if (n === self || params.includes(n) || types.has(n) || caps.has(n) || !n.startsWith(prefix)) continue;
    opts.push(cpOutsideOption(n, H.annotate(n)));
  }
  return cpByLabel(opts);
};
// the copies of the cell with the placeholder where the typed word is; the last: an unclosed `if (` takes a body
export const cpVariants = (cpPH, cpAfterWord) => (text: string, before: string, offset: number, closers: string[]): string[] => {
  const after = cpAfterWord(text.slice(offset)), cl = closers.join("");
  return [before + cpPH + after, before + cpPH + cl + ";", before + cpPH + ";" + cl, before + cpPH + cl.replace(")", ") {}")];
};
// names: the bindings in scope and the keywords not among them, by label
export const cpNameOptions = (cpScopeNames, CP_KEYWORDS, cpByLabel) => (reg: CpReg, names: IxScopeName[], inAction: boolean): CpOption[] => {
  const list = cpScopeNames(reg, names, inAction);
  const kw = CP_KEYWORDS.filter((k) => !list.some((x) => x.label === k)).map((k) => ({ label: k, type: "keyword" }));
  return cpByLabel([...list, ...kw]);
};
// the first copy of the module whose check reaches the placeholder answers: members, or names in scope
export const cpProbeOptions = (cpVariants, cpMembersOf, cpNameOptions, cpPick) => (H: CpHost, cells: string[], at: number, offset: number, from: number, before: string, closers: string[], member: boolean, prefix: string): CpResult => {
  for (const v of cpVariants(cells[at] ?? "", before, offset, closers)) {
    const got = H.probe(cells.map((c, i) => (i === at ? v : c)).join("\n\n"), member);
    if (got === null) continue;
    const f = got.found;
    if (f.k === "member") return cpPick(from, offset, "member", cpMembersOf(got.reg, f.t) ?? [], prefix);
    return cpPick(from, offset, "name", cpNameOptions(got.reg, f.names, f.inAction), prefix);
  }
  return { from, to: offset, options: [], mode: member ? "member" : "name" };
};
// completionsAt: the options at offset of cell at, and the range the chosen one replaces
export const cpCompletionsAt = (cpWordEnd, cpScan, cpNoOffer, cpTagAt, cpJsxOptions, cpHeadOf, cpTypeAt, cpTypeOptions, cpParamListAt, cpSelfName, cpParamOptions, cpIsMember, cpProbeOptions, cpPick) =>
  (H: CpHost, E: CpConst, cells: string[], at: number, offset: number, tsx: boolean, outside: CpOutside[]): CpResult => {
    const text = cells[at] ?? "";
    const prefix = cpWordEnd(text.slice(0, offset));
    const from = offset - prefix.length, before = text.slice(0, from);
    const none: CpResult = { from, to: offset, options: [], mode: "none" };
    const path = H.treeAt(before, from), sc = cpScan(before, path);
    if (sc.quoted || cpNoOffer(before, path)) return none;
    const tag = tsx ? cpTagAt(before, path) : null;
    if (tag !== null) { const o = cpJsxOptions(H.fresh(), H.treeAt, before, tag); return o === null ? none : cpPick(from, offset, "jsx", o, prefix); }
    const head = cpHeadOf(H.treeAt, before);
    if (cpTypeAt(path, head)) return cpPick(from, offset, "type", cpTypeOptions(E.typeNames, cells, at), prefix);
    const params = cpParamListAt(before, path, head);
    if (params !== null) return cpPick(from, offset, "param", cpParamOptions(H, E.caps, cells, at, cpSelfName(before, head), params, outside, prefix), prefix);
    const member = cpIsMember(path);
    if (!member && prefix === "") return { from, to: offset, options: [], mode: "name" };
    return cpProbeOptions(H, cells, at, offset, from, before, sc.closers, member, prefix);
  };

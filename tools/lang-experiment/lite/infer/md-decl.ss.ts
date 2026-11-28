// incr2 (D1): the owner of a type declaration's problems. Every user type declaration is converted once per check
// (core.ts declDiags), so what it reports does not depend on which cell expands it first; each cell that names the
// declaration, or names a declaration that names it, gets those problems.

// every name an Identifier or JSXIdentifier under n holds
export const mdNamesIn = (childrenOf) => (n: AstNode): Set<string> => {
  const out: Mut<Set<string>> = new Set();
  const walk = (x: AstNode): void => {
    if (x.type === "Identifier" || x.type === "JSXIdentifier") out.add(x.name);
    for (const k of childrenOf(x)) walk(k.node);
  };
  walk(n);
  return out;
};
// the module's type declarations by name, each with the reports inside its statement (a name declared twice, as an
// interface merged, is one entry with both statements' names and reports)
export const mdDecls = (mdNamesIn) => (program: AstNode, diags: IxDiag[], src: string): Map<string, MdDecl> => {
  const out: Mut<Map<string, MdDecl>> = new Map();
  for (const st of program.type === "Program" ? program.body : []) {
    const d = st.type === "ExportNamedDeclaration" && st.declaration !== null ? st.declaration : st;
    if ((d.type !== "TSTypeAliasDeclaration" && d.type !== "TSInterfaceDeclaration") || d.id.type !== "Identifier") continue;
    const mine = diags.filter((x) => st.start <= x.start && x.start < st.end);
    const was = out.get(d.id.name);
    const refs = new Set([...(was?.refs ?? []), ...mdNamesIn(d)]);
    const text = `${was?.text ?? ""}${src.slice(st.start, st.end)}\n`;
    out.set(d.id.name, { name: d.id.name, start: was?.start ?? st.start, end: was?.end ?? st.end, text, refs, diags: [...(was?.diags ?? []), ...mine] });
  }
  return out;
};
// the problems of every declaration a cell reaches from the names it holds, in the order of the declarations' text
export const mdDeclDiagsOf = () => (D: Map<string, MdDecl>, names: Set<string>): IxDiag[] => {
  if ([...D.values()].every((d) => d.diags.length === 0)) return [];
  const seen: Mut<Set<string>> = new Set();
  const todo = [...names].filter((n) => D.has(n));
  while (todo.length) {
    const n = todo.pop() ?? "";
    if (seen.has(n)) continue;
    seen.add(n);
    for (const r of D.get(n)?.refs ?? []) if (D.has(r) && !seen.has(r)) todo.push(r);
  }
  const ds = [...D.values()].filter((d) => seen.has(d.name)).toSorted((a, b) => a.start - b.start).flatMap((d) => d.diags);
  const keys: Mut<Set<string>> = new Set();
  return ds.filter((x) => { const k = `${x.start}:${x.end}:${x.rule}:${x.msg}`; if (keys.has(k)) return false; keys.add(k); return true; });
};
// the record with a declaration's problems added after the cell's own: errors, unsupported items and their spans
export const mdDeclAdd = (mdDedupe) => (X: MdCtx, rec: MdCellRec, ds: IxDiag[]): MdCellRec => {
  if (ds.length === 0) return rec;
  const err = ds.filter((x) => x.rule !== "unsupported"), uns = ds.filter((x) => x.rule === "unsupported");
  const errors = mdDedupe([...rec.errors, ...err.map((x) => ({ rule: x.rule, line: X.line(x.start), msg: x.msg }))]);
  const unsupported = mdDedupe([...rec.unsupported, ...uns.map((x) => ({ rule: "unsupported", line: X.line(x.start), msg: x.msg }))]);
  const status: MdStatus = errors.length ? "rejected" : unsupported.length ? "unsupported" : rec.status;
  return { ...rec, errors, unsupported, status, ch: [...rec.ch, ...err], chUnsup: [...rec.chUnsup, ...uns] };
};

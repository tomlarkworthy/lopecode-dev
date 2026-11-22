// ss-toolchain.ts splitCells and what one cell's compiled form depends on in its module: the generators, the
// generators some cell takes as Events, the cells the check accepted and why the others were not; and the editor's
// three states of a cell.

// a file's cell texts in order, leading comments included; a statement of several declarators is one text each
export const tcSplitCells = (tcMustParse, leadingComments) => (src: string, tsx: boolean): string[] => {
  const ast = tcMustParse(src, tsx);
  const out: Mut<string[]> = [];
  let end = 0;
  for (const st of ast.program.type === "Program" ? ast.program.body : []) {
    const first = leadingComments(ast, st.start)[0];
    const start = first !== undefined ? first.start : st.start;
    const decl = st.type === "ExportNamedDeclaration" ? st.declaration : st;
    const ds = decl !== null && decl.type === "VariableDeclaration" && decl.declarations.length > 1 ? decl.declarations : [];
    const d0 = ds[0];
    if (d0 === undefined) out.push(src.slice(start, st.end));
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i];
      if (d !== undefined) out.push((i > 0 ? "" : src.slice(start, st.start)) + src.slice(st.start, d0 === undefined ? st.start : d0.start) + src.slice(d.start, d.end) + ";");
    }
    end = st.end;
  }
  if (ast.comments.some((c) => c.start >= end)) throw new Error("a comment after the last cell has no cell to belong to");
  return out;
};
export const tcContextOfFacts = () => (infos: TcInfo[], accepted: Set<string> | null, facts: Map<string, TcInfo> | null, why: Map<string, string[]> | null): TcCtx => {
  const generators = new Set(infos.filter((c) => c.generator).map((c) => c.name));
  const events = new Set(infos.flatMap((c) => c.params.filter((p) => p.eventsTyped && generators.has(p.name)).map((p) => p.name)));
  return { generators, events, accepted, facts, why, inputs: null, module: null };
};
// contextOf: the facts parsed from each text; a text whose facts do not parse gives none
export const tcContextOf = (tcInfosOf, tcLowered, tcContextOfFacts) => (texts: string[], tsx: boolean, accepted: Set<string> | null): TcCtx => {
  const infos: Mut<TcInfo[]> = [];
  for (const t of texts) {
    try { infos.push(...tcInfosOf(tsx ? tcLowered(t, false) : t)); } catch (e) { messageOf(e); }
  }
  return tcContextOfFacts(infos, accepted, null, null);
};
// the cells a check accepts: ok, with no errors, and parsed
export const tcAcceptedOf = () => (r: TcCheck): Set<string> =>
  new Set(r.cells.filter((c) => c.status === "ok" && c.errors.length === 0 && !(r.unparsed !== null && r.unparsed.has(c.name))).map((c) => c.name));
// a cell's own reasons for not being accepted, without line numbers
export const tcWhyOf = () => (r: TcCheck, c: TcCheckCell): string[] => {
  const parseMsg = r.unparsed !== null ? r.unparsed.get(c.name) : undefined;
  if (parseMsg !== undefined) return [`[parse] ${parseMsg}`];
  const out = [...c.errors.map((e) => `[${e.rule}] ${e.msg}`), ...c.unsupported.map((u) => `[unsupported] ${u.msg}`)];
  if (out.length === 0 && c.blockedBy.length > 0) return [`[blocked] ${c.blockedBy.join(", ")} has no usable type`];
  return out.length === 0 ? [`[${c.status}] not accepted by the checker`] : out;
};
export const tcContextFromCheck = (tcAcceptedOf, tcWhyOf, tcContextOfFacts) => (r: TcCheck): TcCtx => {
  const facts = r.facts;
  if (facts === null) throw new Error("this check result carries no cell facts");
  const accepted = tcAcceptedOf(r);
  const why = new Map(r.cells.filter((c) => !accepted.has(c.name)).map((c) => [c.name, tcWhyOf(r, c)]));
  return tcContextOfFacts([...facts.values()], accepted, facts, why);
};
// the names in takes whose state is not ok
export const tcNotOk = () => (out: Mut<Map<string, TcCellState>>, takes: string[]): string[] => {
  const by: Mut<string[]> = [];
  for (const n of takes) { const s = out.get(n); if (s === undefined || s.state !== "ok") by.push(n); }
  return by;
};
// ok; rejected (not accepted, or does not parse); blocked (a cell it takes is not ok), to a fixpoint
export const tcCellStates = (tcAcceptedOf, tcWhyOf, tcNotOk) => (r: TcCheck): Map<string, TcCellState> => {
  const accepted = tcAcceptedOf(r);
  const out: Mut<Map<string, TcCellState>> = new Map();
  const names = new Set(r.cells.map((c) => c.name));
  for (const c of r.cells) {
    const own = c.status === "blocked" && c.errors.length === 0 && c.unsupported.length === 0 && !(r.unparsed !== null && r.unparsed.has(c.name));
    const by = own ? c.blockedBy.filter((n) => names.has(n)) : [];
    out.set(c.name, accepted.has(c.name) ? { state: "ok", why: [], blockedBy: [] } : by.length > 0 ? { state: "blocked", why: [], blockedBy: by } : { state: "rejected", why: tcWhyOf(r, c), blockedBy: [] });
  }
  const keys = [...out.keys()];
  const has = new Set(keys);
  const takes = new Map([...(r.facts !== null ? r.facts.values() : [])].map((f) => [f.name, f.params.map((p) => p.name).filter((n) => has.has(n) && n !== f.name)]));
  for (let changed = true; changed; ) {
    changed = false;
    for (const name of keys) {
      const st = out.get(name);
      if (st === undefined || st.state === "rejected") continue;
      const by = [...new Set([...tcNotOk(out, takes.get(name) ?? []), ...(accepted.has(name) ? [] : st.blockedBy)])];
      if (by.length > 0 && (st.state !== "blocked" || by.join() !== st.blockedBy.join())) { out.set(name, { state: "blocked", why: [], blockedBy: by }); changed = true; }
    }
  }
  return out;
};

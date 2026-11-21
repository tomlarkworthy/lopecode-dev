// compile({inputs, refs, outputs, options}) typed from the cell graph (core.ts checkSources compileType, lines 181-215):
// (args: {inputs}) => Promise<{outputs}>. The hook runs while a cell is inferred, so it reads the module's tables as
// they were when that cell's inference began (MdIsland); its reports keep the registry's order (drained in turn).

export type MdIsland = {
  readonly X: MdCtx; readonly value: Map<string, Ty | null>; readonly refInner: Map<string, Ty>; readonly out: Map<string, MdCellRec>;
};
export type MdHookLog = { out: IxDiag[] };
// ch.err / ch.unsupported in the hook: after what the registry reported so far
export const mdHookErr = () => (R: IxReg, H: Mut<MdHookLog>, at: AstNode, rule: string, msg: string): void => {
  H.out = [...H.out, ...R.drain(), { start: at.start, end: at.end, rule, msg }];
};
// the problems of the island: what island.ss.ts finds, and island cells that are async, generators or not ok
export const mdIslandProblems = (mdHookErr, islandWith) => (S: MdIsland, R: IxReg, H: Mut<MdHookLog>, e: AstNode, sp: MdSpec): boolean => {
  const cells = S.X.defs.map((d) => ({ name: d.name, params: d.fn.params.map((p) => (p.type === "Identifier" ? p.name : "")), refCell: S.refInner.has(d.name) }));
  const isl = islandWith(new Set(S.X.R.capabilities.keys()))(cells, { inputs: sp.inputs, refs: sp.refs, outputs: sp.outputs });
  let bad = false;
  for (const p of isl.problems) { mdHookErr(R, H, e, "compile-island", p.msg); bad = true; }
  for (const n of isl.order) {
    const d = S.X.byName.get(n), r = S.out.get(n);
    if (d === undefined || r === undefined) continue;
    if (d.fn.async || d.fn.generator) { mdHookErr(R, H, e, "compile-island", `island cell ${n} is ${d.fn.async ? "async" : "a generator"}; an island runs synchronously`); bad = true; }
    if (r.status !== "ok" || r.errors.length) { mdHookErr(R, H, e, "compile-island", `island cell ${n} is ${r.status === "ok" ? "rejected" : r.status}`); bad = true; }
  }
  return bad;
};
// one side of the call: each named cell's value type, which must cross to a worker
export const mdIslandSide = (mdHookErr, uncloneableWith, show) => (S: MdIsland, R: IxReg, H: Mut<MdHookLog>, e: AstNode, names: string[]): { t: Rec; bad: boolean } => {
  const props: Mut<Map<string, Prop>> = mut(new Map());
  let bad = false;
  for (const n of names) {
    const t = S.value.get(n);
    if (t === null || t === undefined) { if (S.X.cellNames.has(n)) mdHookErr(R, H, e, "compile-island", `${n} has no usable type`); bad = true; continue; }
    const why = uncloneableWith(S.X.R.ops)(t);
    if (why) { mdHookErr(R, H, e, "compile-boundary", `${n}: ${show(t)} cannot cross to a worker (${why})`); bad = true; }
    props.set(n, { t, opt: false });
  }
  return { t: { k: "rec", props: freeze(props) }, bad };
};
// the hook: asks for the options' type first when the call has options, then types the call
export const mdCompileType = (mdSpecOf, mdHookErr, mdIslandProblems, mdIslandSide, named, show, ERR) => (S: MdIsland, R: IxReg, e: AstNode, options: Ty | null): MdCompiled => {
  const H: Mut<MdHookLog> = mut({ out: [] });
  const sp = mdSpecOf(e);
  if (sp === null) {
    H.out = [...H.out, ...R.drain(), { start: e.start, end: e.end, rule: "unsupported", msg: "compile takes { inputs, refs, outputs, options } with literal arrays of cell names" }];
    return { res: { k: "done", t: ERR }, out: H.out };
  }
  const at = sp.options;
  if (at !== null && options === null) return { res: { k: "options", at }, out: [] };
  if (at !== null && options !== null && options.k !== "err" && !R.sub(options, { k: "rec", props: new Map([["runtime", { t: named("Pool"), opt: true }]]) }))
    mdHookErr(R, H, at, "compile-options", `${show(options)} is not assignable to { runtime?: Pool }`);
  const bad0 = mdIslandProblems(S, R, H, e, sp);
  const args = mdIslandSide(S, R, H, e, sp.inputs), refs = mdIslandSide(S, R, H, e, sp.refs), res = mdIslandSide(S, R, H, e, sp.outputs);
  const t: Ty = bad0 || args.bad || refs.bad || res.bad ? ERR : { k: "fn", tps: [], ps: [{ n: "args", t: args.t, opt: false }], ret: named("Promise", res.t) };
  return { res: { k: "done", t }, out: [...H.out, ...R.drain()] };
};

// uses: ast, types, common
// Shape B's state, with the two tables keyed by node as persistent logs: a write puts one entry in front (no copy),
// a read walks from the newest entry. A node is told apart by its span and type (=== on two nodes is
// [strict-eq-object]); two nodes of one type never share a span. The map the output wants is built once at the end.
export type TLog = { readonly n: Node; readonly t: Ty; readonly next: TLog | null };
export type BLog = { readonly n: Node; readonly b: Binding; readonly next: BLog | null };
export type St = {
  readonly types: TLog | null; readonly bindingOf: BLog | null; readonly vars: Map<string, Binding>; readonly parent: Map<number, number>;
  readonly diags: readonly Diag[]; readonly rets: readonly Ty[]; readonly flow: Flow;
  readonly nextId: number; readonly nextScope: number; readonly fresh: number; readonly quiet: number;
};
export const setIn = () => <K, V>(m: Map<K, V>, k: K, v: V): Map<K, V> => {
  const o: Mut<Map<K, V>> = mut(new Map(m));
  o.set(k, v);
  return freeze(o);
};
export const sameNode = () => (a: Node, b: Node): boolean => a.start === b.start && a.end === b.end && a.type === b.type;
export const emptyB = (): St => ({ types: null, bindingOf: null, vars: new Map(), parent: new Map(), diags: [], rets: [], flow: new Map(), nextId: 0, nextScope: 0, fresh: 0, quiet: 0 });
export const recB = () => (st: St, n: Node, t: Ty): { st: St; t: Ty } => ({ st: { ...st, types: { n, t, next: st.types } }, t });
export const typeOfB = (sameNode) => (st: St, n: Node): Ty | undefined => {
  for (let l = st.types; l; l = l.next) if (sameNode(l.n, n)) return l.t;
  return undefined;
};
export const bindB = () => (st: St, n: Node, b: Binding): St => ({ ...st, bindingOf: { n, b, next: st.bindingOf } });
export const typesOutB = () => (st: St): Map<Node, Ty> => {
  const newest: Mut<[Node, Ty][]> = mut([]);
  for (let l = st.types; l; l = l.next) newest.push([l.n, l.t]);
  const out: Mut<Map<Node, Ty>> = mut(new Map());
  for (const [n, t] of freeze(newest).toReversed()) out.set(n, t);
  return freeze(out);
};

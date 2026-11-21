// uses: ast, types, common
// Shape B's state, with the two tables keyed by node as maps: each write copies the map (setIn).
export type St = {
  readonly types: Map<Node, Ty>; readonly bindingOf: Map<Node, Binding>; readonly vars: Map<string, Binding>; readonly parent: Map<number, number>;
  readonly diags: readonly Diag[]; readonly rets: readonly Ty[]; readonly flow: Flow;
  readonly nextId: number; readonly nextScope: number; readonly fresh: number; readonly quiet: number;
};
// a table with one entry more, as a copy
export const setIn = () => <K, V>(m: Map<K, V>, k: K, v: V): Map<K, V> => {
  const o: Mut<Map<K, V>> = mut(new Map(m));
  o.set(k, v);
  return freeze(o);
};
export const emptyB = (): St => ({ types: new Map(), bindingOf: new Map(), vars: new Map(), parent: new Map(), diags: [], rets: [], flow: new Map(), nextId: 0, nextScope: 0, fresh: 0, quiet: 0 });
export const recB = (setIn) => (st: St, n: Node, t: Ty): { st: St; t: Ty } => ({ st: { ...st, types: setIn(st.types, n, t) }, t });
export const typeOfB = () => (st: St, n: Node): Ty | undefined => st.types.get(n);
export const bindB = (setIn) => (st: St, n: Node, b: Binding): St => ({ ...st, bindingOf: setIn(st.bindingOf, n, b) });
export const typesOutB = () => (st: St): Map<Node, Ty> => st.types;

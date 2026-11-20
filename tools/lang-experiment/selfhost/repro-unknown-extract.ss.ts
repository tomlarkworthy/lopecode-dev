// State writes and Action calls whose static type at the call is not exactly State / Action (2026-11-20).
// bun selfhost/rt/check.ts selfhost/repro-unknown-extract.ss.ts
export const n = (): StateCell<number> => state(0);
export const bump = (n: State<number>) => action(() => n.update((x) => x + 1));
export const extracted = (n: State<number>) => { const f = n.set; f(5); return 1; };
export const destructured = (n: State<number>) => { const { set } = n; set(5); return 1; };
export const callback = (n: State<number>) => { [1, 2].forEach(n.set); return 1; };
export const unionOptional = (n: State<number>) => { const h = n.update.length > 0 ? n : null; h?.set(5); return 1; };
export const arrayElem = (n: State<number>) => { [n][0]?.set(5); return 1; };
export const actionInUnion = (bump: Action<[]>) => { const a = bump.length === 0 ? bump : null; a?.(); return 1; };
export const closureFromAction = (n: State<number>) => action(() => () => n.set(1));
export const objectUpcast = (n: State<number>) => { const u: object = n; return 1; };
export const namedCallable = () => { type F = { (x: number): number }; return 1; };
export const spreadState = (n: State<number>) => { const r = { ...n }; r.set(5); return 1; };
export const restState = (n: State<number>) => { const { ...r } = n; r.set(5); return 1; };
export const spreadInAction = (n: State<number>) => action(() => { const r = { ...n }; r.set(5); });

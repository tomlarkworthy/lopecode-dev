// Ownership rules the corpus produces in fewer than 5 cells (action-call, borrow-placement, mut-freeze-param,
// read-outside-action, the LabeledStatement unsupported item, the loaned-Mut borrowed-await), for diff.ts --file.
export const count = () => state(0);
export const inc = (count: State<number>) => action(() => { count.value = count.value + 1; });

export const ac1 = (inc: Action<[]>) => action(() => { const f = () => inc(); return f; });
export const ac2 = (inc: Action<[]>) => action(() => { const fs = [() => inc()]; return fs.length; });
export const ac3 = (inc: Action<[]>) => action(() => { const g = async () => { inc(); }; g(); });
export const ac4 = (inc: Action<[]>) => action(() => { const g = function* () { inc(); yield 1; }; g(); });
export const ac5 = (inc: Action<[]>) => action(() => { const h = () => inc(); const k = () => h; k(); });

export const bp1 = () => { const m = mut<number[]>([1]); const b = borrow(m); return 0; };
export const bp2 = () => function* (): Generator<number> { const m = mut<number[]>([1]); yield borrow(m).length; };
export const bp3 = () => async () => { const m = mut<number[]>([1]); return borrow(m); };
export const bp4 = function* () { const m = mut<number[]>([1]); const g = function* () { yield borrow(m); }; yield 0; };
export const bp5 = () => { const m = mut<number[]>([1]); return [borrow(m)].length; };

export const mf1 = () => (m: Mut<number[]>): number[] => freeze(m);
export const mf2 = () => (m: Mut<number[]>): number => { m.push(1); return freeze(m).length; };
export const mf3 = () => (a: Mut<string[]>, b: Mut<string[]>): string[] => [...freeze(a), ...freeze(b)];
export const mf4 = () => (m: Mut<Map<string, number>>): number => freeze(m).size;
export const mf5 = () => (m: Mut<number[]>): boolean => freeze(m).length > 0;

export const ro1 = () => { const f = read; return 0; };
export const ro2 = () => [read].length;
export const ro3 = (count: State<number>) => action(() => { const f = () => read(count); return f; });
export const ro4 = (count: State<number>) => action(() => { const g = async () => read(count); g(); });
export const ro5 = () => ({ r: read });

export const lb1 = () => { const m = mut<number[]>([]); outer: for (const x of [1, 2]) { if (x) break outer; m.push(x); } return freeze(m).length; };
export const lb2 = () => { const m = mut<number[]>([]); a: { m.push(1); } return freeze(m).length; };
export const lb3 = () => (m: Mut<number[]>): number => { b: for (const x of [1]) { m.push(x); continue b; } return m.length; };
export const lb4 = () => { const m = mut<number[]>([]); c: while (m.length < 2) { m.push(1); } return freeze(m).length; };
export const lb5 = () => async (m: Mut<number[]>): Promise<number> => { d: { await 0; } return m.length; };

export const la1 = () => async (m: Mut<number[]>): Promise<number> => { await 0; return m.length; };
export const la2 = () => async (m: Mut<number[]>): Promise<number> => { m.push(1); await 1; m.push(2); return 0; };
export const la3 = () => async (m: Mut<number[]>): Promise<void> => { for (const x of [1, 2]) { m.push(x); await x; } };
export const la4 = () => async (m: Mut<number[]>): Promise<number> => { const n = await Promise.resolve(1); return n + m.length; };
export const lb6 = () => { const m = mut<number[]>([]); e: if (m.length) { m.push(1); } return freeze(m).length; };
export const la6 = () => async (m: Mut<number[]>): Promise<number> => { await 0; m.push(1); return 0; };
export const la5 = () => async (m: Mut<number[]>): Promise<number> => { try { await 0; } catch (e) { return m.length; } return 0; };

export const sp1 = () => { const m = mut<number[]>([1]); return [...m].length; };
export const sp2 = () => { const m = mut<number[]>([1]); const keep = (...xs: number[]): number => xs.length; return keep(...m); };
export const sp3 = () => { const m = mut<number[]>([1, 2]); return Math.max(...m); };
export const sp4 = () => { const m = mut<number[]>([1]); const o = { ...m }; return 0; };
export const sp5 = () => { const m = mut<number[]>([1]); const k = (a: number[]): number => a.length; return k([...m]) + Math.min(...m); };

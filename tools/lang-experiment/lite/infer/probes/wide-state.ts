// State, actions, events and the prelude calls, for diff.ts --file.
export const count = () => state(0);
export const inc = (count: State<number>) => action(() => { count.value = count.value + 1; });
export const incBy = (count: State<number>) => action((n: number) => { count.value = read(count) + n; });
export const use = (inc: Action<[]>) => () => inc();
export const asyncAct = (count: State<number>) => action(async () => { count.value = 1; });
export const promAct = (count: State<number>) => action(() => Promise.resolve(1));
export const readOut = (count: State<number>) => read(count);
export const writeOut = (count: State<number>) => { count.value = 2; return 0; };
export const eq = () => (a: { x: number }, b: { x: number }): boolean => equals(a, b) && a === b;
export const muts = () => { const m = mut<number[]>([]); m.push(1); const b = borrow(m); return snapshot(b).length + freeze(m).length; };
export const st = () => state<string | null>(null);
export const ticks = function* (): Generator<number> { yield 1; };
export const listen = (ticks: Events<number>, count: State<number>) => on(ticks, action((n: number) => { count.value = n; }));

const xs = (): StateCell<number[]> => state<number[]>([]);
const push = (xs: State<number[]>) => action((n: number) => xs.update((a) => { a.push(n); return a; }));
const len = (xs: number[]) => xs.length;

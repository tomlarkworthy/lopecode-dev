// A state cell holds a value that actions change. A parameter typed State<number> gets the handle; only an action may write it.
const tally = (): StateCell<number> => state(0);
const bump = (tally: State<number>) => action(() => tally.update((n) => n + 1));
const reset = (tally: State<number>) => action(() => tally.set(0));

// A parameter without State gets the value, and the cell runs again after each write.
const doubled = (tally: number) => tally * 2;

// State is a ref cell. A parameter typed Ref<number> gets the handle; only an action may write it.
export const tally = (): RefCell<number> => ref(0);
export const bump = (tally: Ref<number>) => action(() => tally.update((n) => n + 1));
export const reset = (tally: Ref<number>) => action(() => tally.set(0));

// A parameter without Ref gets the value, and the cell runs again after each write.
export const doubled = (tally: number) => tally * 2;

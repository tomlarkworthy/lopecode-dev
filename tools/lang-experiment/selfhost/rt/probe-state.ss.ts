// crossings as a state cell: cross() runs while a compiled cell's arguments are evaluated, not in an action
export const crossings = () => state({ copies: 0, reused: 0 });
export const cross = (crossings: State<{ copies: number; reused: number }>) => (value: unknown): unknown => {
  crossings.update((c) => ({ ...c, copies: c.copies + 1 }));
  return value;
};
export const countCrossing = (crossings: State<{ copies: number; reused: number }>) => action(() => crossings.update((c) => ({ ...c, copies: c.copies + 1 })));
export const crossVia = (countCrossing: Action<[]>) => (value: unknown): unknown => { countCrossing(); return value; };

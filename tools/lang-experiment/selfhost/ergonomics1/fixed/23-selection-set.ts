const ids = () => [1, 2, 3, 4, 5];
const selected = (): StateCell<Set<number>> => state(new Set<number>());
const toggle = (selected: State<Set<number>>) =>
  action((id: number) =>
    selected.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    })
  );
const selectAll = (selected: State<Set<number>>, ids: number[]) => action(() => selected.set(new Set(ids)));
const clearSel = (selected: State<Set<number>>) => action(() => selected.set(new Set()));
const selectedList = (selected: Set<number>) => {
  const xs = [...selected];
  xs.sort((a, b) => a - b);
  return xs;
};

type Item = { id: number; name: string };
const items = (): StateCell<Item[]> => state<Item[]>([
  { id: 1, name: "milk" },
  { id: 2, name: "eggs" },
  { id: 3, name: "flour" },
]);
const removeAt = (items: State<Item[]>) => action((i: number) => items.update((xs) => xs.filter((_, j) => j !== i)));
const slots = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const removers = (removeAt: Action<[number]>, slots: readonly number[]) => {
  const out: Action<[]>[] = [];
  for (const i of slots) out.push(action(() => removeAt(i)));
  return out;
};
const listView = (items: Item[], removers: Action<[]>[]) => (
  <div>
    {items.map((it, i) => {
      const r = removers[i];
      return (
        <div key={it.id}>
          <span>{it.name}</span> {r ? <button onClick={r}>remove</button> : null}
        </div>
      );
    })}
  </div>
);

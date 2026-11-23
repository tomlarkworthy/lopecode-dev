type Item = { id: number; name: string };
const items = (): StateCell<Item[]> => state<Item[]>([
  { id: 1, name: "milk" },
  { id: 2, name: "eggs" },
  { id: 3, name: "flour" },
]);
const removeAt = (items: State<Item[]>) => action((i: number) => items.update((xs) => xs.filter((_, j) => j !== i)));
const removers = (removeAt: Action<[number]>) => Array.from({ length: 100 }, (_, i) => action(() => removeAt(i)));
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

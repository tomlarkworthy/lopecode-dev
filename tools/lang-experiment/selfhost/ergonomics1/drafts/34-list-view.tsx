type Item = { id: number; name: string };
const items = (): StateCell<Item[]> => state<Item[]>([
  { id: 1, name: "milk" },
  { id: 2, name: "eggs" },
  { id: 3, name: "flour" },
]);
const removeItem = (items: State<Item[]>) => action((id: number) => items.update((xs) => xs.filter((x) => x.id !== id)));
const listView = (items: Item[], removeItem: Action<[number]>) => (
  <div>
    {items.map((it) => (
      <div key={it.id}>
        <span>{it.name}</span> <button onClick={() => removeItem(it.id)}>remove</button>
      </div>
    ))}
  </div>
);

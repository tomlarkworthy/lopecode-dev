type Item = { id: number; name: string };
const items = (): StateCell<Item[]> => state<Item[]>([
  { id: 1, name: "milk" },
  { id: 2, name: "eggs" },
  { id: 3, name: "flour" },
]);
const removeItem = (items: State<Item[]>) => action((id: string) => items.update((xs) => xs.filter((x) => String(x.id) !== id)));
const listView = (items: Item[], removeItem: Action<[string]>) => (
  <div>
    {items.map((it) => (
      <div key={it.id}>
        <span>{it.name}</span> <input type="checkbox" value={String(it.id)} onInput={removeItem} />
      </div>
    ))}
  </div>
);

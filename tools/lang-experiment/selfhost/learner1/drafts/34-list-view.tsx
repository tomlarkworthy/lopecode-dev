type Item = { readonly id: number; readonly name: string };

const initialItems = (): readonly Item[] => [
  { id: 1, name: "milk" },
  { id: 2, name: "eggs" },
  { id: 3, name: "flour" },
];

const items = (initialItems: readonly Item[]): StateCell<readonly Item[]> => state<readonly Item[]>(initialItems);

const removeItem = (items: State<readonly Item[]>) =>
  action((id: number) => items.update((xs) => xs.filter((x) => x.id !== id)));

// A per-row action may not use a state cell's value, so the per-row actions are made from the
// data cell initialItems, which is not state, and the view picks the one for each row.
const removers = (initialItems: readonly Item[], removeItem: Action<[number]>) =>
  initialItems.map((it) => ({ id: it.id, remove: action(() => removeItem(it.id)) }));

const listView = (items: readonly Item[], removers) => (
  <div>
    {items.map((it) => {
      const r = removers.find((x) => x.id === it.id);
      return (
        <div key={it.id}>
          <span>{it.name}</span> {r === undefined ? null : <button onClick={r.remove}>remove</button>}
        </div>
      );
    })}
  </div>
);

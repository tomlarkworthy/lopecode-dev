type Item = { id: number; name: string };
const items = (): StateCell<Item[]> => state<Item[]>([
  { id: 1, name: "milk" },
  { id: 2, name: "eggs" },
  { id: 3, name: "flour" },
]);
const removeAt = (items: State<Item[]>) => action((i: number) => items.update((xs) => xs.filter((_, j) => j !== i)));
// one action per row position, made from constants so no action captures a state value
const removers = (removeAt: Action<[number]>) => {
  const out: Action<[]>[] = [];
  for (let i = 0; i < 100; i++) {
    const k = i;
    out.push(action(() => removeAt(k)));
  }
  return out;
};
const listView = (items: Item[], removers: Action<[]>[]) => (
  <div>
    {items.map((it, i) => (
      <div key={it.id}>
        <span>{it.name}</span> {removers[i] ? <button onClick={removers[i]}>remove</button> : null}
      </div>
    ))}
  </div>
);

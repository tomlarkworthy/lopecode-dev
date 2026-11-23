const items = (): StateCell<string[]> => state<string[]>(["milk", "eggs"]);
const removeAt = (items: State<string[]>) => action((i: number) => items.update((xs) => xs.filter((_, j) => j !== i)));
const removers = (removeAt: Action<[number]>) => {
  const out: Action<[]>[] = [];
  for (const i of [0, 1, 2, 3]) out.push(action(() => removeAt(i)));
  return out;
};

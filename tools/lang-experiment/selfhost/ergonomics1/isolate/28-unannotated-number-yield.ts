const evs = function* () {
  yield 1;
};
const total = (): StateCell<number> => state(0);
const add = (total: State<number>) => action((e: number) => total.update((t) => t + e));
const onEv = (evs: Events<number>, add: Action<[number]>) => on(evs, add);

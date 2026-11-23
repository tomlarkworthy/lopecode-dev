const evs = function* () {
  yield { n: 1 };
};
const total = (): StateCell<number> => state(0);
const add = (total: State<number>) => action((e: { n: number }) => total.update((t) => t + e.n));
const onEv = (evs: Events<{ n: number }>, add: Action<[{ n: number }]>) => on(evs, add);

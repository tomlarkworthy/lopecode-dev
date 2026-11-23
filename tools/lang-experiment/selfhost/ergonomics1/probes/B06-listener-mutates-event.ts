type Ev = { n: number; tags: string[] };
const evs = function* (): Generator<Ev> {
  yield { n: 1, tags: ["a"] };
  yield { n: 2, tags: ["b"] };
};
const total = (): StateCell<number> => state(0);
const add = (total: State<number>) =>
  action((e: Ev) => {
    e.tags.push("seen");
    e.n = e.n * 10;
    total.update((t) => t + e.n);
  });
const onEv = (evs: Events<Ev>, add: Action<[Ev]>) => on(evs, add);

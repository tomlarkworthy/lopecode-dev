const batches = function* () {
  const buf: number[] = [];
  for (let i = 0; i < 3; i++) {
    buf.push(i);
    yield buf;
  }
};
const got = (): StateCell<number[][]> => state<number[][]>([]);
const keep = (got: State<number[][]>) => action((b: number[]) => got.update((g) => [...g, b]));
const onB = (batches: Events<number[]>, keep: Action<[number[]]>) => on(batches, keep);

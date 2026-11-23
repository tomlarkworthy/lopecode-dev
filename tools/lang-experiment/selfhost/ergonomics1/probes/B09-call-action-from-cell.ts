const count = (): StateCell<number> => state(0);
const inc = (count: State<number>) => action(() => count.update((c) => c + 1));
const auto = (inc: Action<[]>, count: number) => {
  if (count < 3) inc();
  return count;
};

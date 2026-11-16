let c = (): StateCell<number> => state(0);
let a = (c: State<number>) => action(() => c.set(1));
let b = (a) => {
  a();
  return 1;
};
let ok = (a) => action(() => a());

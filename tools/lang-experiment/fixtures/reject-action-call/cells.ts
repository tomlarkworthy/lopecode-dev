let c = (): RefCell<number> => ref(0);
let a = (c: Ref<number>) => action(() => c.set(1));
let b = (a) => {
  a();
  return 1;
};
let ok = (a) => action(() => a());

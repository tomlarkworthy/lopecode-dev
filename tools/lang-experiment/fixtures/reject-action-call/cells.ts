export let c = (): RefCell<number> => ref(0);
export let a = (c: Ref<number>) => action(() => c.set(1));
export let b = (a) => {
  a();
  return 1;
};
export let ok = (a) => action(() => a());

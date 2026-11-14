export let c = (): RefCell<number> => ref(0);
export let w = (c: Ref<number>) => {
  c.set(1);
  return 1;
};

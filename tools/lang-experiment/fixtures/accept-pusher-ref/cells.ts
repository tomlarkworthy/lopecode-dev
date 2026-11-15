let list = (): RefCell<string[]> => ref([]);
let push = (list: Ref<string[]>) => action(() => list.update((l) => [...l, "p"]));
let test_empty = (list) => {
  if (list.length !== 0) throw new Error(`expected empty, got ${list.length}`);
  return "ok";
};

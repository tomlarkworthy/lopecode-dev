let c = (): RefCell<number> => ref(0);
let a = (c: Ref<number>) => action(() => c.set(1));
let b = (a) => [1].map(a);
let ok = (a) => ({ onClick: a });

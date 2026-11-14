export let c = (): RefCell<number> => ref(0);
export let a = (c: Ref<number>) => action(() => c.set(1));
export let b = (a) => [1].map(a);
export let ok = (a) => ({ onClick: a });

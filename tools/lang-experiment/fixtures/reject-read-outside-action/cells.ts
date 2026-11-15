export let c = (): RefCell<number> => ref(0);
export let r = (c: Ref<number>) => read(c);

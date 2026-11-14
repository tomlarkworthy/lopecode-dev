export let c = (): RefCell<number> => ref(0);
export let b = (c: Ref<number>) => c.value;

let c = (): RefCell<number> => ref(0);
let b = (c: Ref<number>) => c.value;

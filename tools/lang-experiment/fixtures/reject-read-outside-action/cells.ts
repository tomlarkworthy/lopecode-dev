let c = (): RefCell<number> => ref(0);
let r = (c: Ref<number>) => read(c);

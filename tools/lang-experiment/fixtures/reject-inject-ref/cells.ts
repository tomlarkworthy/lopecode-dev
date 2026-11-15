let a = () => 1;
let b = (a: Ref<number>) => action(() => a.set(2));
let e = (now: Ref<number>) => 1;
let g = (lib: Ref<number>) => 1;
